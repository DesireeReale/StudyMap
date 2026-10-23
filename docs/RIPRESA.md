# Ripresa del lavoro

Leggi questo file, `CLAUDE.md` (regole) e `OBIETTIVI.md` (cosa resta). Il codice è spiegato in `MANUALE.md`.

## Stato (22 ottobre 2026)
- Repo: https://github.com/DesireeReale/StudyMap (privato, account personale). Push dopo ogni commit.
- Fatti: Fase 1 MVP verificata (RLS, E2E, una generazione reale), materie a cartelle, appunti, due temi (Classic, Vivid), striscia di studio con timer, data dell'esame, ripasso SM-2, riassunti, quiz a scelta multipla, chat con il documento, pagine velocizzate (getClaims).
- Fatti anche: landing nuova, generazione e lettura dei file in background con barra di avanzamento, "Suggerisci un'idea", limiti al minuto per provider.
- In corso: beta con circa 10 studenti (fine ottobre 2026). Da fare tu: vedi "Da fare tu" in OBIETTIVI.md.
- Assistenza: aistudymap@proton.me (anche `FEEDBACK_EMAIL_TO`).
- Beta: chi si registra accetta `BETA_TERMS` (`src/config/beta.ts`); data e versione in `profiles.beta_terms_accepted_at` e `beta_terms_version`. Con `BETA_SHARED_MODELS = true` l'accettazione vale come consenso ai modelli gratuiti; per il Pro con un modello che non usa i dati basta mettere il flag a `false`.
- UX prima della beta (21 ottobre): rami della mappa che ereditano il colore e si comprimono (stato in `graph.nodes[].data.collapsed`), quiz con impostazioni, tasti 1-4 e "Rifai le sbagliate" (prompt quiz.v3 con `topic`), caricamento a riquadri con "cosa vuoi creare" (`lib/generation.ts` fa partire i job a fine lettura), pagine di provenienza nel riassunto (prompt summary.v2, riga `[pagine 4, 5]` sotto ogni titolo), stato del mazzo nelle flashcard.
- Navigazione (21 ottobre): barra laterale con Home, Materie e il gruppo "Studia" (`/studia/[tipo]`, sezioni in `src/core/sections.ts`); i riassunti si riconoscono dal titolo che inizia con "Riassunto · ".
- Latenza: leggere la vista `ai_latency_stats` nel SQL editor di Supabase (mediana, p95, errori e timeout per modello e attività negli ultimi 7 giorni). Timeout per attività in `TASKS` (`src/config/ai.ts`).
- Scansioni (22 ottobre): prompt `transcribe.v2` con `[?parola]` e `[illeggibile]`; dopo la lettura di scansioni e foto il documento ha `review_pages` e `review_create` e lo studente passa da `/documents/[id]/controlla` (`TextReview.tsx`): i job scelti partono solo alla conferma (`POST /api/documents/[id]/review`). I PDF solo scansionati si ricomprimono nel browser (`src/lib/pdf-browser.ts`), con intervallo di pagine. Mappe per capitolo: `src/core/chapters.ts`, opzione `chapters` di `/api/generate`.
- Documenti: `docs/ricerca-concorrenti.md`, `docs/confronto-ux-algor.md` (27 interventi UX), `docs/direzione-grafica.md`.

- Piani (22 ottobre): pagamenti incassati a mano (bonifico, PayPal); il Pro si sblocca da `/admin`, che scrive in `subscriptions` (migrazione `20261022300000_subscriptions.sql`). Piano attivo = riga non revocata e non scaduta più alta, altrimenti Free (`activeSubscription` in `entitlements.ts`, letto da `loadProfile` in `lib/supabase/server.ts`). `profiles.plan` è una colonna storica: non si legge più. Nessun prezzo nell'app: il testo è "Per passare a Pro scrivi a aistudymap@proton.me" (`UpgradeContact.tsx`).
- Admin: l'account deve stare nella tabella `admins`. Dopo la registrazione, nel SQL editor di Supabase: `insert into public.admins (user_id) select id from auth.users where email = 'aistudymap@proton.me';`

- Database (22 ottobre): il progetto Supabase che si chiamava "sviluppo" (`twihesdysuacqvmzrbah`) ora è la **produzione** degli studenti, ripulito dai dati di prova (resta solo aistudymap@proton.me, admin). Il progetto **test** (`npskcysthjgppgwtawvo`) serve anche per lo sviluppo locale: `.env.local` punta lì, le chiavi della produzione sono in `.env.production.local`. Ogni migrazione va prima su test (`npm run test:db`), poi su produzione.
- Online dal 23 ottobre su https://aistudymap.vercel.app (Vercel Hobby, funzioni `dub1` da `vercel.json`, variabili prese da `.env.production.local` senza Gemini). Da controllare sul progetto di produzione: conferma email attiva, Site URL e Redirect URLs con l'indirizzo Vercel (anche su Google OAuth), SMTP (Resend), policy della password, backup (sul piano gratuito: NON VERIFICATO). Regione già UE (eu-west-1).

## Decisioni prese
- Supabase solo cloud, niente Docker o database locali.
- Si fattura prima con la web app (PWA) + Stripe; Tauri e le app mobile dopo. Tauri non riduce il carico sul server.
- Hosting: Vercel o Netlify gratis in sviluppo; con utenti paganti serve il piano a pagamento (circa 20 $/mese) e Supabase Pro. La generazione AI gira in background con `after()` (massimo 300 s sul piano Hobby di Vercel); oltre servirà una coda vera.
- Modelli (21 ottobre, credito OpenRouter caricato): catena per testo e immagini in `src/config/ai.ts`: DeepSeek V4.1 Flash, Qwen 3.7 Flash (a pagamento), poi Gemma 4 26B gratuito. Prova e costi in `docs/prova-modelli.md`. Ragionamento spento tranne nei quiz ("low"); dal 22 ottobre anche i modelli a pagamento possono andare a provider che conservano i dati (decisione dell'utente: sono appunti, e i termini della beta lo dicono); in `ai_usage` si salvano il costo reale (`usage.cost`) e `reasoning_tokens`. MiniMax M3.1 Flash gratuito resta configurato ma fuori dalla catena ed esce il 22 ottobre 2026. Verso OpenRouter si manda `models` con i modelli successivi dello stesso tipo (a pagamento o gratuiti), così il cambio avviene in una sola richiesta. Gemini gratuito spento: i termini Google consentono solo servizi a pagamento per app con utenti UE.
- Limiti: `PROVIDER_LIMITS` in `src/config/ai.ts`, contatori separati per i modelli gratuiti di OpenRouter (20 al minuto, 50 al giorno finché non si sono acquistati in tutto 10 crediti, poi 1000) e per quelli a pagamento (60 al minuto: stima, NON VERIFICATO). Contatore atomico `take_provider_slot` su Supabase. Se un gruppo è pieno si passa a un altro; se sono pieni tutti il lavoro aspetta il minuto dopo ("In coda…"). Per il Pro un modello open-weight a pagamento, meglio su un provider UE (Mistral, Scaleway, OVH: NON VERIFICATO).
- I modelli gratuiti che usano i dati per l'addestramento richiedono un consenso separato e revocabile (`usesDataForTraining`), non basta un avviso.
- Embedding: per ora no; la chat usa la ricerca per parole (`src/core/retrieval.ts`).
- VoiceStudio e OpenLess scartati: sono app desktop con licenza AGPL. scroll-craft scartato: richiede strumenti installati sul PC. humanizer: usare le sue regole nei prompt.

## Prossimi passi consigliati
1. Dopo la registrazione di aistudymap@proton.me, renderlo admin (riga in `admins`, vedi sopra).
2. Controllare dopo qualche giorno di beta il costo reale in `ai_usage` (somma di `cost_usd`) e il saldo su OpenRouter.
3. Seguire la beta: leggere `feature_requests` e `ai_usage` sul progetto Supabase di produzione (o dalla pagina `/admin`), controllare tempi ed errori dei modelli.
3. Regole di humanizer nei prompt `prompts/*.md`.
4. Generazione AI in background: fatta con `after()`; coda vera solo se le generazioni superano i 300 s.
5. Sessione di solo piano per podcast e registrazione delle lezioni (UI di riferimento: card scura, onda animata, testo che scorre, tasto microfono).
6. Stripe, poi pubblicazione su Vercel in UE. Prima: partita IVA e IVA OSS da chiarire con un commercialista, oppure Paddle o Lemon Squeezy.

## Risparmio token
Una sessione di lavoro alla volta, chat brevi, ricerche lunghe in agenti, niente screenshot ripetuti.
