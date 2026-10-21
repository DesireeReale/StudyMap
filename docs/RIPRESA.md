# Ripresa del lavoro

Leggi questo file, `CLAUDE.md` (regole) e `OBIETTIVI.md` (cosa resta). Il codice è spiegato in `MANUALE.md`.

## Stato (21 ottobre 2026)
- Repo: https://github.com/DesireeReale/StudyMap (privato, account personale). Push dopo ogni commit.
- Fatti: Fase 1 MVP verificata (RLS, E2E, una generazione reale), materie a cartelle, appunti, due temi (Classic, Vivid), striscia di studio con timer, data dell'esame, ripasso SM-2, riassunti, quiz a scelta multipla, chat con il documento, pagine velocizzate (getClaims).
- Fatti anche: landing nuova, generazione e lettura dei file in background con barra di avanzamento, "Suggerisci un'idea", limiti al minuto per provider.
- In corso: beta con circa 10 studenti (fine ottobre 2026). Da fare tu: vedi "Da fare tu" in OBIETTIVI.md.
- Assistenza: aistudymap@proton.me (anche `FEEDBACK_EMAIL_TO`).
- Beta: chi si registra accetta `BETA_TERMS` (`src/config/beta.ts`); data e versione in `profiles.beta_terms_accepted_at` e `beta_terms_version`. Con `BETA_SHARED_MODELS = true` l'accettazione vale come consenso ai modelli gratuiti; per il Pro con un modello che non usa i dati basta mettere il flag a `false`.
- Latenza: leggere la vista `ai_latency_stats` nel SQL editor di Supabase (mediana, p95, errori e timeout per modello e attività negli ultimi 7 giorni). Timeout per attività in `TASKS` (`src/config/ai.ts`).
- Documenti: `docs/ricerca-concorrenti.md`, `docs/confronto-ux-algor.md` (27 interventi UX), `docs/direzione-grafica.md`.

## Decisioni prese
- Supabase solo cloud, niente Docker o database locali.
- Si fattura prima con la web app (PWA) + Stripe; Tauri e le app mobile dopo. Tauri non riduce il carico sul server.
- Hosting: Vercel o Netlify gratis in sviluppo; con utenti paganti serve il piano a pagamento (circa 20 $/mese) e Supabase Pro. La generazione AI gira in background con `after()` (massimo 300 s sul piano Hobby di Vercel); oltre servirà una coda vera.
- Modelli: gratuiti per il piano Free, due catene in `src/config/ai.ts` (testo: MiniMax M3.1 Flash, Gemma 4 26B, Gemma 4 31B, Nemotron VL, `openrouter/free`; immagini: le stesse senza `openrouter/free`). MiniMax ha `expiresAt` 22 ottobre 2026 00:00 UTC ed esce da solo. Prova del 21 ottobre in `docs/prova-modelli.md`: oggi nessun altro modello gratuito è veloce e affidabile (Gemma 429, Nemotron in timeout, Inkling vietato fuori dagli "agentic harnesses", Xing sbaglia l'italiano). Verso OpenRouter si manda `models` con i modelli gratuiti successivi, così il cambio avviene in una sola richiesta. MiniMax ha sede in Cina: trasferimento fuori UE scritto nell'informativa. Gemini gratuito spento: i termini Google consentono solo servizi a pagamento per app con utenti UE.
- Limiti: `PROVIDER_LIMITS` in `src/config/ai.ts` (OpenRouter 20 al minuto e 1000 al giorno con almeno 10 crediti, dalla documentazione ufficiale), contatore atomico `take_provider_slot` su Supabase. Se un provider è pieno si passa a un altro; se sono pieni tutti il lavoro aspetta il minuto dopo ("In coda…"). Per il Pro un modello open-weight a pagamento, meglio su un provider UE (Mistral, Scaleway, OVH: NON VERIFICATO).
- I modelli gratuiti che usano i dati per l'addestramento richiedono un consenso separato e revocabile (`usesDataForTraining`), non basta un avviso.
- Embedding: per ora no; la chat usa la ricerca per parole (`src/core/retrieval.ts`).
- VoiceStudio e OpenLess scartati: sono app desktop con licenza AGPL. scroll-craft scartato: richiede strumenti installati sul PC. humanizer: usare le sue regole nei prompt.

## Prossimi passi consigliati
1. Dopo la registrazione di aistudymap@proton.me, passare il suo profilo a `plan = 'pro'` su Supabase di sviluppo.
2. Quando l'utente avrà caricato il credito su OpenRouter: una prova reale di `qwen/qwen3.7-flash` e `deepseek/deepseek-v4.1-flash` (stesso testo e slide di `docs/prova-modelli.md`), poi metterli prima dei gratuiti nelle catene. Il 21 ottobre la prova si è fermata su "402 Insufficient credits".
3. Seguire la beta: leggere `feature_requests` e `ai_usage` su Supabase di sviluppo, controllare tempi ed errori dei modelli.
3. Regole di humanizer nei prompt `prompts/*.md`.
4. Generazione AI in background: fatta con `after()`; coda vera solo se le generazioni superano i 300 s.
5. Sessione di solo piano per podcast e registrazione delle lezioni (UI di riferimento: card scura, onda animata, testo che scorre, tasto microfono).
6. Stripe, poi pubblicazione su Vercel in UE. Prima: partita IVA e IVA OSS da chiarire con un commercialista, oppure Paddle o Lemon Squeezy.

## Risparmio token
Una sessione di lavoro alla volta, chat brevi, ricerche lunghe in agenti, niente screenshot ripetuti.
