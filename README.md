# StudyMap

AI study companion for nursing students (and any subject): upload PDFs, photos of notes, slides or plain text and get an editable concept map and a flashcard deck.

Phase 1 (MVP) features: email + Google auth, upload (PDF / PNG / JPEG / WebP / text), AI concept map with editor (add, move, rename, delete, color, auto-layout), flashcards with "know / don't know" review, library, PNG/PDF export, server-side plans and quotas.

## Stack

| Area | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind 4 |
| Data | Supabase: Postgres with RLS on every table, Auth, private Storage bucket |
| Maps | `@xyflow/react` + `@dagrejs/dagre` (MIT) |
| PDF | `unpdf` (text extraction, page rendering via `@napi-rs/canvas`) |
| Export | `html-to-image` + `jspdf` (client side) |
| AI | `openai` SDK against any OpenAI-compatible endpoint, `zod` for structured output |
| Tests | Vitest (unit), pgTAP via `supabase test db` (RLS and quotas), Playwright (E2E) |

## Setup

Requirements: Node 22+, Docker Desktop (for the local Supabase stack).

```bash
npm install
npx supabase start          # prints the local URL, anon key and service_role key
cp .env.example .env.local  # fill in the values printed above
npm run dev
```

Open http://localhost:3000. Local auth does not require email confirmation. Emails sent by Supabase are visible in Mailpit at http://127.0.0.1:54324.

Set `AI_MOCK=1` in `.env.local` to develop without calling any model: every AI task returns fixed fake output. It is ignored when `NODE_ENV=production`.

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon / publishable key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | usage logging, quota counters, account deletion |
| `MISTRAL_API_KEY` | server only | primary AI provider |
| `OPENROUTER_API_KEY` | server only | fallback provider (free models) |
| `META_API_KEY` | server only | Meta Model API (models disabled by default) |
| `AI_MOCK` | server only | `1` = fake AI responses outside production |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` | Supabase CLI | Google sign-in locally (also set `enabled = true` in `supabase/config.toml`) |

No secret is exposed to the browser: only `NEXT_PUBLIC_*` values reach the client.

## Project layout

```
prompts/                 versioned prompts (mindmap.v1.md, flashcards.v1.md, transcribe.v1.md)
supabase/migrations/     schema, RLS policies, storage bucket, consume_quota()
supabase/tests/          pgTAP tests for RLS and quotas
src/config/plans.ts      ALL plan limits (free / pro)
src/config/ai.ts         providers, models, prices, fallback chains, max_tokens per task
src/core/                framework-free business logic (AI layer, entitlements, ingestion, graph layout)
src/lib/                 server glue: Supabase clients, AI context, API helpers
src/app/                 routes (pages + /api/documents, /api/generate, /api/account)
src/components/          client components (map editor, flashcards, upload…)
e2e/                     Playwright tests
```

`src/core` has no Next.js or React imports, so it can be reused by a future Tauri / Capacitor shell or a worker.

## AI layer

There is no per-provider interface. Every supported provider speaks the OpenAI chat-completions protocol, so providers only differ by base URL, model id, price and capabilities. Those live in `src/config/ai.ts`:

- `PROVIDERS`: base URL and the env var holding the key.
- `MODELS`: id, price per 1M tokens, context size, `vision`, `structuredOutput` (`json_schema` or `json_object`), `usesDataForTraining`, `enabled`.
- `CHAINS`: ordered model list per plan.
- `TASKS`: prompt version and `max_tokens` per task.

`complete()` in `src/core/ai/client.ts` walks the chain. It skips disabled models, models without an API key, models that train on user data when the user has not consented, and models without vision for image tasks. It falls back to the next model on 429, 5xx, timeouts, network errors and auth errors (not on 400/404/422). It validates the JSON with Zod and retries once, feeding the validation error back to the model. Every attempt is logged to `ai_usage` (tokens, OCR pages, model, prompt version, estimated cost, outcome).

Tasks (`src/core/ai/tasks.ts`) handle prompts, chunking and merging:

- **Concept map**: one sub-map per chunk, merged under a shared root, repaired (single root, no dangling parents, no cycles) and laid out with dagre.
- **Flashcards**: concatenated across chunks and de-duplicated.
- **Transcription**: images and scanned PDF pages (pages with fewer than 50 extracted characters) go to a vision model.

### Change provider or model

- Switch the primary model: reorder `CHAINS` or toggle `enabled` in `src/config/ai.ts`. For example, set `enabled: true` on `muse-spark` and add `META_API_KEY`.
- Add a provider: add it to `PROVIDERS`, add its models to `MODELS` and put their keys in `CHAINS`. Gemini, OpenAI and OpenRouter all expose OpenAI-compatible endpoints, so no code changes are needed.
- Change a prompt: create `prompts/<task>.v2.md` and bump `TASKS.<task>.promptVersion`. The version is stored with each usage row.

Current defaults run at zero cost: Mistral's free "Experiment" tier first, then OpenRouter's free router, which is used only for users who consented to their data being used for training. Before going to production:

- Turn off "Anonymous improvement data" in the Mistral console (Admin → Privacy).
- Check that the free tiers' terms allow production use.

Meta Model API (`muse-spark-1.3`, `muse-spark-1.3-contributor`) is configured but disabled. At the time of writing its availability in the EU is not confirmed.

### Cost tracking

```sql
select user_id, sum(cost_usd) as cost, sum(input_tokens) as input_tokens
from ai_usage
where created_at >= date_trunc('month', now())
group by user_id;
```

## Plans and quotas

All numbers are in `src/config/plans.ts`. Limits are enforced on the server:

- Monthly AI generations and a monthly input-token safety cap (`quota_counters` + `consume_quota()`, an atomic upsert that cannot overshoot under concurrent requests).
- PDF page count, upload size and number of saved documents.
- Rate limit: AI requests per user per minute.
- Export options: free = PNG with watermark, pro = PNG + PDF.

When a limit is hit, the API returns `{ error, upgrade }` and the UI shows an upgrade notice. Existing content stays accessible. `profiles.plan` cannot be changed by the client (column-level grants); Stripe (phase 2) will update it from a webhook.

## Tests

```bash
npm run lint
npm run typecheck
npm test            # unit tests, never call a real model
npm run test:db     # pgTAP: RLS isolation, plan not writable, quota atomicity (needs supabase start)
npm run test:e2e    # sign up → upload PDF → generate map → rename node → persisted (needs supabase start)
```

The E2E suite starts `next dev` with `AI_MOCK=1`.

## Privacy and security

- RLS on every table and on storage. Users can only read and write their own rows and their own `{uid}/` storage folder.
- Uploads go straight from the browser to Storage, so there is no serverless body-size limit. The server then validates them: magic bytes, size and page count. Rejected files are deleted.
- In-app warning not to upload real patient data. The privacy page is at `/privacy`; it is a draft and the data controller's details must be added before launch.
- Users can delete individual documents, or their whole account from Settings. The account deletion removes the storage files, then cascades through every table.
- Host Supabase and Vercel functions in an EU region.

## Mobile and desktop

The app is an installable PWA (`src/app/manifest.ts`). There is no service worker yet; offline support is phase 3. Capacitor and Tauri shells should load the deployed URL, because AI calls and keys must stay on the server.
