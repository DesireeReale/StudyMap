@AGENTS.md

# studymap

PWA di studio con AI per studenti universitari di qualsiasi corso di laurea (nata per infermieristica). Specifiche in `docs/SPEC.md`, codice spiegato in `MANUALE.md`, obiettivi in `OBIETTIVI.md` (caselle `- [ ]` / `- [x]` sotto titoli `##`: spuntale man mano).

## Regole (valgono anche per ogni subagent: copiale nel loro prompt)
1. Quello che inventi o supponi senza averlo verificato (API, nomi di modelli, prezzi, comportamento di librerie) va segnalato all'utente come **NON VERIFICATO**.
2. Niente in locale: dati su Supabase cloud; niente Docker, Supabase locale, database locali o localStorage per dati che contano.
3. Solo strumenti e servizi gratuiti; se qualcosa costa, avvisa prima.
4. Risparmia token: leggi solo i file che servono, ricerche lunghe in agenti, risposte brevi.
5. Chiedi prima di scaricare, installare o avviare qualcosa sul PC dell'utente.
6. Mai chiamate a modelli a pagamento nei test (AI_MOCK=1); imposta sempre `max_tokens`.

## Comunicazione
Con l'utente in italiano, concetti spiegati in modo semplice: sta imparando e vuole sapere dove mettere mano. Codice, identificatori e README in inglese.

## Database e migrazioni
Due progetti Supabase (il piano gratuito ne consente due): **test**, usato anche per lo sviluppo locale (`.env.local` e `.env.test`), e **produzione**, con i dati veri degli studenti (chiavi in `.env.production.local`, ignorato da git, e su Vercel). Ogni migrazione va prima su test, si verifica con `npm run test:db`, poi su produzione. Mai test o dati di prova su produzione.

## Piani e pagamenti
Due piani normali: Free e Pro, più un livello futuro (Pro Max). Nessun prezzo fondatore e nessun prezzo nell'app: i prezzi li gestisce l'utente, i pagamenti sono privati e il Pro si sblocca a mano da `/admin`.
