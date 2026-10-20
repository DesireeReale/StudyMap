# Prompt per Claude Code — App di studio con mappe concettuali AI

## Contesto

Voglio costruire una web app di studio con AI, pensata per chi studia all'università, in qualsiasi corso di laurea (è nata per studenti di infermieristica). L'utente carica i suoi materiali (PDF, foto di appunti, slide, testo) e l'app li trasforma in strumenti di studio: mappe concettuali, mappe mentali, flashcard, quiz e riassunti.

Prendo come riferimento funzionale due prodotti esistenti, **Algor Education** e **GitMind**, con l'obiettivo di fare una versione migliore e più economica. Dobbiamo ispirarci alle loro funzionalità, **non copiare** codice, grafica, testi, nomi o asset. Interfaccia e brand devono essere originali.

Io sono una sviluppatrice AI/LLM: puoi usare un linguaggio tecnico, ma spiegami le scelte architetturali importanti.

## Obiettivo di questa sessione

Non scrivere tutto subito. Procedi così:

1. Entra in **plan mode** e proponimi architettura, struttura delle cartelle, schema del database e piano per fasi.
2. Aspetta la mia approvazione.
3. Implementa **solo la Fase 1 (MVP)**, con test, e fermati.

## Piattaforma

- **Prima la web app**, responsive e installabile come **PWA**: così funziona subito su PC, tablet e telefono dal browser.
- L'architettura deve permettere in seguito di:
  - impacchettarla come app desktop con **Tauri**;
  - pubblicarla su App Store e Google Play (es. con **Capacitor**).
- Quindi: niente dipendenze che funzionano solo nel browser desktop, e la logica di business separata dalla UI.

## Stack suggerito (puoi proporre alternative motivate)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind.
- **Editor di mappe:** React Flow (o alternativa open source con licenza compatibile con uso commerciale), con layout automatico (es. ELK o dagre).
- **Backend / DB / auth / storage file:** Supabase (Postgres con Row Level Security, login email + Google, storage per i PDF).
- **Pagamenti:** Stripe Billing per il web (abbonamenti). Predisponi un'astrazione così da aggiungere in seguito RevenueCat per gli store mobile.
- **Hosting:** Vercel o equivalente.
- Gestione segreti con variabili d'ambiente; nessuna chiave API nel frontend.

## Layer AI (molto importante)

Il modello deve essere **multimodale** (testo + immagini + PDF) e intercambiabile.

- Crea un **layer di astrazione dei provider** (`AIProvider`) con un'interfaccia comune: `generateMindMap`, `generateFlashcards`, `generateQuiz`, `summarize`, `extractTextFromDocument`, `chatWithDocument`.
- **Provider principale: Meta Model API con Muse Spark 1.3** (multimodale nativo: immagini, documenti, video; contesto 1M token; API compatibile con l'SDK OpenAI).
  - Due varianti dello stesso modello, selezionabili da configurazione:
    - `muse-spark-1.3-contributor`: molto economica, ma **i dati inviati vengono usati da Meta per migliorare i suoi prodotti**. Usala solo se l'utente ha dato un consenso esplicito e informato (vedi Privacy), mai di default.
    - `muse-spark-1.3`: prezzo pieno, i dati **non** vengono usati da Meta. È il default per il piano Pro e per chi non dà il consenso.
  - Prova a passare i PDF direttamente al modello; se la qualità non basta, aggiungi un passaggio di OCR.
- **Provider di riserva: Mistral** (Mistral Small 4 multimodale + Mistral OCR per i PDF), da usare se Meta Model API non è disponibile in Italia, va in errore o supera i rate limit. Implementa il fallback automatico.
- Prevedi la possibilità di aggiungere altri provider tramite configurazione (es. Gemini, OpenAI, OpenRouter), senza toccare il resto del codice.
- Scelta del modello **per piano**: il piano free usa sempre il modello più economico.
- **Output strutturati**: ogni generazione restituisce JSON validato con Zod (es. nodi e archi della mappa, liste di flashcard). Gestisci retry e JSON non valido.
- **Chunking** dei documenti lunghi: dividi per sezioni/pagine, genera per parti e unisci.
- **Prompt in file separati e versionati** (es. `/prompts/mindmap.v1.md`), non hardcoded nel codice.
- **Tracciamento dei costi**: salva per ogni chiamata i token in input/output, le pagine OCR, il modello usato e il costo stimato, collegati all'utente. Mi serve per calcolare il margine per utente.
- Lingua predefinita dell'output: italiano, con la terminologia corretta della disciplina del materiale.

## Funzionalità

### Fase 1 — MVP
- Registrazione e login.
- Caricamento di PDF, immagini e testo incollato.
- Generazione di una **mappa concettuale** dal documento, visualizzata e modificabile (aggiungere, spostare, rinominare, eliminare nodi; colori).
- Generazione di **flashcard** con ripasso semplice (so / non so).
- Libreria dei documenti e delle mappe dell'utente.
- Esportazione della mappa in PNG e PDF.
- **Sistema di quote e piani** già attivo (vedi sotto), anche se i pagamenti arrivano in Fase 2.

### Fase 2
- **Quiz** a risposta multipla con spiegazioni, e simulazione d'esame a tempo.
- **Ripetizione dilazionata** delle flashcard (algoritmo tipo SM-2 o FSRS).
- **Chat con il documento** (domande sul materiale caricato, con riferimenti alle pagine).
- Abbonamento con **Stripe** e pagina di gestione del piano.

### Fase 3 — dove superare Algor e GitMind
- Diagrammi di flusso e lavagna libera (stile GitMind), oltre alle mappe.
- Lettura ad alta voce (text-to-speech) delle mappe e dei riassunti.
- Mappe che si collegano tra loro (es. "Apparato cardiovascolare" collegato a "Farmacologia").
- Modalità esame per area di studio: per esempio domande stile concorso e casi clinici per le professioni sanitarie, casi pratici per giurisprudenza, esercizi per le materie scientifiche.
- Condivisione delle mappe con compagni di corso (sola lettura o collaborazione).
- Funzionamento offline per ripassare mappe e flashcard già scaricate.

## Piani free e a pagamento

Implementa i limiti lato server, con un modulo `entitlements` centralizzato e configurabile (i numeri devono stare in un unico file di configurazione, perché li cambierò).

| Funzione | Free | Pro |
| --- | --- | --- |
| Generazioni AI al mese | 5 | Illimitate, con tetto di sicurezza (es. 150) |
| Pagine per PDF | 20 | 200 |
| Modello AI | Economico | Più potente |
| Mappe e flashcard | Sì | Sì |
| Quiz e simulazioni d'esame | 1 a settimana | Illimitati |
| Audio e chat con i documenti | No | Sì |
| Documenti salvati | 10 | Illimitati |
| Esportazione | PNG con piccolo marchio | PNG e PDF senza marchio |

- Prezzo Pro di riferimento: circa 7-10 €/mese, con sconto annuale.
- Quando un utente free raggiunge un limite, mostra un messaggio chiaro con l'opzione di passare a Pro, senza bloccare l'accesso ai contenuti già creati.
- Prevedi un rate limiting per evitare abusi.

## Requisiti non funzionali

- **Privacy e GDPR:** dati in UE dove possibile, cancellazione account e dati da parte dell'utente, informativa privacy. Aggiungi un avviso nell'app di non caricare dati personali di persone reali (pazienti, clienti, parti di una causa). Se si usa la variante `contributor` di Muse Spark, l'informativa deve dire chiaramente che i contenuti caricati vengono condivisi con Meta e usati per migliorare i suoi modelli; serve un consenso separato, revocabile, e chi non accetta deve poter usare comunque l'app con il modello che non usa i dati.
- **Sicurezza:** Row Level Security su tutte le tabelle, validazione dei file caricati (tipo e dimensione), nessun segreto esposto al client.
- **Accessibilità:** contrasto adeguato, navigazione da tastiera, font leggibili (molti studenti con DSA usano questo tipo di app).
- **Qualità:** TypeScript strict, lint, test unitari per il layer AI e per le quote, test end-to-end del flusso "carico PDF → ottengo mappa".
- **Documentazione:** un README con setup, variabili d'ambiente e come cambiare provider AI o limiti dei piani.

## Cosa NON fare

- Non copiare codice, prompt, testi, icone o design di Algor o GitMind.
- Non scegliere librerie con licenze che impediscono l'uso commerciale.
- Non legare il codice a un solo provider AI.
- Non implementare le fasi 2 e 3 finché non te lo chiedo.
