# Ripresa del lavoro

Leggi questo file, `CLAUDE.md` (regole) e `OBIETTIVI.md` (cosa resta). Il codice è spiegato in `MANUALE.md`.

## Stato (20 ottobre 2026)
- Repo: https://github.com/DesireeReale/StudyMap (privato, account personale). Push dopo ogni commit.
- Fatti: Fase 1 MVP verificata (RLS, E2E, una generazione reale), materie a cartelle, appunti, due temi (Classic, Vivid), striscia di studio con timer, data dell'esame, ripasso SM-2, riassunti, quiz a scelta multipla, chat con il documento, pagine velocizzate (getClaims).
- In corso: nuova landing (vedi le caselle aperte in OBIETTIVI.md).
- Documenti: `docs/ricerca-concorrenti.md`, `docs/confronto-ux-algor.md` (27 interventi UX), `docs/direzione-grafica.md`.

## Decisioni prese
- Supabase solo cloud, niente Docker o database locali.
- Si fattura prima con la web app (PWA) + Stripe; Tauri e le app mobile dopo. Tauri non riduce il carico sul server.
- Hosting: Vercel o Netlify gratis in sviluppo; con utenti paganti serve il piano a pagamento (circa 20 $/mese) e Supabase Pro. La generazione AI gira in background con `after()` (massimo 300 s sul piano Hobby di Vercel); oltre servirà una coda vera.
- Modelli: gratuiti per il piano Free (catena in `src/config/ai.ts`, `openrouter/free` come ultima riserva perché sceglie a caso). Per il Pro un modello open-weight a pagamento, meglio su un provider UE (Mistral, Scaleway, OVH: NON VERIFICATO).
- I modelli gratuiti che usano i dati per l'addestramento richiedono un consenso separato e revocabile (`usesDataForTraining`), non basta un avviso.
- Embedding: per ora no; la chat usa la ricerca per parole (`src/core/retrieval.ts`).
- VoiceStudio e OpenLess scartati: sono app desktop con licenza AGPL. scroll-craft scartato: richiede strumenti installati sul PC. humanizer: usare le sue regole nei prompt.

## Prossimi passi consigliati
1. Finire la landing.
2. Provare `nvidia/nemotron-3.5-super-vl:free` e `google/gemma-4-26b-a4b-it:free` (una chiamata ciascuno, con l'ok dell'utente) e aggiungerli alla catena con il flag del consenso.
3. Regole di humanizer nei prompt `prompts/*.md`.
4. Generazione AI in background: fatta con `after()`; coda vera solo se le generazioni superano i 300 s.
5. Sessione di solo piano per podcast e registrazione delle lezioni (UI di riferimento: card scura, onda animata, testo che scorre, tasto microfono).
6. Stripe, poi pubblicazione su Vercel in UE. Prima: partita IVA e IVA OSS da chiarire con un commercialista, oppure Paddle o Lemon Squeezy.

## Risparmio token
Una sessione di lavoro alla volta, chat brevi, ricerche lunghe in agenti, niente screenshot ripetuti.
