# StudyMap

AI study companion for university students in any degree course: upload PDFs, photos of notes, slides or plain text and get an editable concept map and a flashcard deck.

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
| Tests | Vitest (unit, and RLS/quota tests against a Supabase test project), Playwright (E2E) |

## Setup

Requirements: Node 22+ and a supabase.com account. No Docker or local database: development uses a hosted Supabase project.

### 1. Create the Supabase project

On supabase.com create a project (**region: an EU one, e.g. Frankfurt**) and keep the database password.

Then apply the schema from this repo. Log in to the Supabase CLI:

```bash
npx supabase login
```

Link the repo to the project; `<project-ref>` is the id in the project URL:

```bash
npx supabase link --project-ref <project-ref>
```

Apply `supabase/migrations/` (tables, RLS, storage bucket, quota function):

```bash
npm run db:push
```

### 2. Environment

Create your local env file from the template:

```bash
cp .env.example .env.local
```

Fill it from **Project Settings → API**:
- URL → `NEXT_PUBLIC_SUPABASE_URL`;
- the anon / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- the service_role / secret key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never share it).

Set `AI_MOCK=1` to develop without calling any model: every AI task returns fixed fake output. It is ignored when `NODE_ENV=production`.

### 3. Auth settings (dashboard)

- **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add `http://localhost:3000/auth/callback` (and later the production URL + `/auth/callback`) to Redirect URLs.
- **Email confirmation**: hosted projects require users to confirm their email by default (Authentication → Sign In / Providers → Email → "Confirm email"). Keep it on.
  - The built-in email sender is meant for testing only: it is heavily rate limited and may only deliver to your project team's addresses.
  - Before real users sign up, configure a custom SMTP provider under Authentication → Emails → SMTP Settings (any transactional email service, e.g. Resend, Brevo, Postmark). Email templates are customised in the same section.
- **Google sign-in**: Authentication → Sign In / Providers → Google.
  - Paste the OAuth client ID and secret created in Google Cloud Console.
  - In Google Cloud, set the authorized redirect URI to the callback URL shown in that Supabase panel (`https://<project-ref>.supabase.co/auth/v1/callback`).

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

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

No secret is exposed to the browser: only `NEXT_PUBLIC_*` values reach the client.

## Project layout

```
prompts/                 versioned prompts (mindmap.v1.md, flashcards.v1.md, transcribe.v1.md)
supabase/migrations/     schema, RLS policies, storage bucket, consume_quota()
tests/db/                RLS and quota tests against the Supabase test project
tests/                   test helpers (.env.test loading, test users)
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

Current defaults (development, zero cost):

- Google Gemini free tier: `gemini-flash-latest`, then `gemini-flash-lite-latest`. Get a key at aistudio.google.com and put it in `GEMINI_API_KEY`.
- OpenRouter free models: `google/gemma-4-26b-a4b-it:free` (tested: valid map JSON with `json_object`, about 33 s) and `nvidia/nemotron-3.5-super-vl:free` (timed out twice at 45 s in the first test, so it comes second), then `openrouter/free` as the last resort because it picks a model at random.
- All of these may use data for training, so they only run for users who gave consent in Settings.

Mistral no longer offers a free API tier, so `mistral-small` is configured with its paid prices and `enabled: false`.

Busy errors (429 and 5xx) are retried on the same model after `RETRY_DELAYS_MS` (2 s, then 5 s) before falling back to the next model.

**Before production.** Google's terms do not allow the unpaid Gemini tier for apps serving users in the EEA. To go live:

1. Enable a paid, no-training model: for example `mistral-small` with pay-as-you-go and a monthly spending cap, or Gemini on a paid tier.
2. Put that model first in `CHAINS`.

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

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm run lint`, `npm run typecheck` | static checks | nothing |
| `npm test` | unit tests (AI layer with fake responses, quotas, chunking, ingestion, layout) | nothing |
| `npm run test:db` | RLS isolation between two users, plan not writable by the client, storage folders, `consume_quota` never exceeding the limit under 10 concurrent calls | Supabase **test** project |
| `npm run test:e2e` | log in → upload PDF → generate map → rename a node → still there after reload | Supabase **test** project |

No test calls a real model: the test setup forces `AI_MOCK=1`.

**Supabase test project.** `test:db` and `test:e2e` create and delete real users and rows, so they run against a second, separate Supabase project, never the development one. Setup:

1. Create a second project on supabase.com, e.g. `studymap-test` (EU region).
2. Apply the same migrations to it:

   ```bash
   npx supabase link --project-ref <test-ref>
   ```

   ```bash
   npm run db:push
   ```

   Re-link to the development project afterwards:

   ```bash
   npx supabase link --project-ref <dev-ref>
   ```

3. Create the test env file and fill it with the **test** project's URL and keys:

   ```bash
   cp .env.test.example .env.test
   ```

`tests/test-env.ts` refuses to run if `.env.test` is missing or points to the same URL as `.env.local`. Test users are created already confirmed through the admin API and deleted at the end, so the test project's email settings don't matter. The E2E suite starts its own `next dev` on port 3100. Stop `npm run dev` first if Next refuses to start a second dev server in the same folder.

Free Supabase projects are paused after about a week without activity; restore the test project from the dashboard if the tests can't connect.

## Design

The UI follows the "tasteskill" app-screen and page rules (style `editorial-greeting` for the app, `sentence-as-layout` for the landing page). Research and palettes: `docs/direzione-grafica.md`.

- **Two user-selectable themes.** Classic (id `corsia`, default: calm blue, Lexend, soft capsule nodes, straight edges) and Vivid (id `evidenziatore`: highlighter colours, Bricolage Grotesque headings with Atkinson Hyperlegible Next body text, ink outlines, offset shadows, elbow edges). Each has a light and a dark variant that follows the system setting. Users pick one in Settings or in the sidebar.
- **How it works.** The choice is stored in the `studymap-style` cookie. The root layout reads it and renders `<html data-style="…">`, so the first paint already uses the right style. Styles are listed in `src/config/styles.ts`.
- **Colour and type tokens.** They live in `src/app/globals.css`, in one `[data-style="…"]` block per style plus its dark variant. The same file holds the shared `btn-*`, `panel`, `row-card` and `field` utilities. Components use the tokens, never raw hex values. `src/app/tokens.test.ts` checks WCAG AA contrast for every style and theme.
- **Study dock.** The library home opens with a large title naming the deck to review and a dark dock of six compact tiles (`src/components/StudyDock.tsx`): deck progress ring, cards to review (cards marked "don't know" plus cards never reviewed, until spaced repetition lands in phase 2), days until the exam (`profiles.exam_date`, set in Settings), a 25-minute study timer, the last edited map and AI generations used. Its colours are the `--dock-*` tokens of the active style.
- **Concept-map node colours.** Nodes store a role (`radice`, `area-1`, `area-2`, `area-3`, `neutro`), not a hex value, and each style maps roles to `--node-*` tokens. Maps saved with hex colours are converted when opened (`nodeRole` in `src/core/graph.ts`).
- **Landing page.** Product examples on the landing page (concept map, flashcard, quiz, summary, chat, reading options) are drawn in HTML/SVG with the theme tokens, so they follow the active theme and stay sharp; `src/components/landing/`. `npm run shots` still captures real app screens into `public/landing/` for reference.

- **Design skill (optional).** It is restored with:

  ```bash
  npx skills experimental_install
  ```

  To check the landing page, run its inspector:

  ```bash
  node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000/
  ```

## Privacy and security

- RLS on every table and on storage. Users can only read and write their own rows and their own `{uid}/` storage folder.
- Uploads go straight from the browser to Storage, so there is no serverless body-size limit. The server then validates them: magic bytes, size and page count. Rejected files are deleted.
- In-app warning not to upload real patient data. The privacy page is at `/privacy`; it is a draft and the data controller's details must be added before launch.
- Users can delete individual documents, or their whole account from Settings. The account deletion removes the storage files, then cascades through every table.
- Host Supabase and Vercel functions in an EU region.

## Mobile and desktop

The app is an installable PWA (`src/app/manifest.ts`). There is no service worker yet; offline support is phase 3. Capacitor and Tauri shells should load the deployed URL, because AI calls and keys must stay on the server.
