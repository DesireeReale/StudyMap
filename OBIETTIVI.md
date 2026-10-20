# Obiettivi di studymap

## Fase 1 — MVP
- [x] Registrazione e login con email
- [x] Login con Google (codice pronto)
- [x] Caricamento di PDF, immagini e testo incollato
- [x] Validazione dei file: tipo, dimensione, pagine
- [x] Trascrizione di immagini e PDF scansionati
- [x] Mappa concettuale generata dall'AI
- [x] Editor mappa: aggiungi, sposta, rinomina, elimina, colori
- [x] Layout automatico della mappa
- [x] Flashcard generate con ripasso so / non so
- [x] Libreria di documenti, mappe e mazzi
- [x] Export PNG (con marchio nel Free) e PDF (Pro)
- [x] Piani e quote lato server, configurabili in un file
- [x] Rate limit delle richieste AI
- [x] Tracciamento costi e token per utente
- [x] Prompt versionati in file separati
- [x] Fallback automatico tra modelli AI
- [x] RLS su tutte le tabelle e sullo storage
- [x] Consenso separato per modelli che usano i dati
- [x] Cancellazione account e documenti
- [x] Avviso: niente dati di pazienti reali
- [x] Manifest PWA installabile
- [x] Test unitari (AI, quote, chunking, layout)
- [x] Eseguire test RLS e E2E sul progetto Supabase di test
- [x] Provare una generazione reale con un modello vero (20 ottobre: riuscita con gemini-flash-lite dopo 3 errori di gemini-flash, 108 s; serve un fallback più rapido)
- [ ] Completare l'informativa privacy (titolare del trattamento)

## Fase 2
- [x] Quiz a scelta multipla con spiegazioni
- [ ] Simulazione d'esame a tempo
- [x] Ripetizione dilazionata delle flashcard (SM-2 o FSRS) — fatta con SM-2; FSRS più avanti
- [ ] Chat con il documento, con riferimenti alle pagine
- [ ] Abbonamento Stripe e pagina di gestione del piano
- [ ] Disdetta in un clic e fatture automatiche (nuovo)
- [x] Riassunto del documento (nuovo)
- [x] Modifica a mano delle flashcard (nuovo)
- [ ] Pagina di provenienza su nodi e flashcard (nuovo)
- [x] Risposte giuste dei quiz distribuite tra le opzioni (nuovo)
- [ ] Prima rigenerazione di una mappa gratuita (nuovo)

## Fase 3
- [ ] Diagrammi di flusso
- [ ] Lavagna libera
- [ ] Lettura ad alta voce di mappe e riassunti
- [ ] Mappe collegate tra loro
- [ ] Modalità esame: domande stile concorso
- [ ] Casi clinici simulati
- [ ] Condivisione mappe in sola lettura
- [ ] Collaborazione in tempo reale
- [ ] Offline per mappe e flashcard scaricate
- [ ] App mobile con Capacitor
- [ ] App desktop con Tauri

## Dalla ricerca sui concorrenti
- [ ] Pannello lettura DSA: dimensione, spaziatura, sfondo (nuovo) — fatti carattere, dimensione e spaziatura in Impostazioni → Il tuo spazio; manca lo sfondo
- [ ] Mappa tutta in maiuscolo come opzione (nuovo)
- [ ] Mappa mentale radiale oltre a quella gerarchica (nuovo)
- [ ] Note e immagini dentro i nodi (nuovo)
- [ ] Modifica della mappa con un comando AI (nuovo)
- [ ] Spiegazione semplificata di un passaggio (nuovo)
- [ ] Registro del testo: semplice o tecnico (nuovo)
- [ ] Input da Word e PowerPoint (nuovo)
- [ ] Input da link web e YouTube (nuovo)
- [ ] Input da registrazione audio della lezione (nuovo) — rimandato. Idea: tasto "Registra lezione" nella materia, audio a pezzi da 10 minuti, scaricato sul dispositivo e non salvato su Storage (1 GB gratuiti in tutto), su Supabase solo trascrizione e riassunto; prima verificare un provider gratuito di trascrizione utilizzabile in UE; avviso di registrare solo col permesso del docente
- [ ] Altri tipi di domanda: vero/falso, completamento, aperta (nuovo)
- [ ] Progressi per argomento e data dell'esame (nuovo)
- [ ] Export flashcard in CSV / Anki (nuovo)
- [ ] Export mappa in Markdown e OPML (nuovo)
- [ ] Calcolo dosaggi e scale cliniche (Braden, Glasgow, NEWS) (nuovo)
- [x] Materie come cartelle: dentro documenti, mappe, flashcard, appunti e strumenti di studio (nuovo)
- [x] Sottocartelle nelle materie, fino a 3 livelli (nuovo)
- [x] Colore, icona e ordine delle cartelle (nuovo)
- [x] Preferenze del workspace salvate sul profilo, su ogni dispositivo (nuovo)
- [x] Data dell'esame per materia (nuovo)
- [ ] Trascinamento delle cartelle con il dito su telefono (nuovo)
- [x] Appunti propri nella materia, scritti a mano o incollati (nuovo)
- [x] Ricerca nella libreria e dentro le materie (nuovo) — titoli e testo degli appunti; il testo dei PDF non ancora
- [ ] Pagina prezzi che promette: i contenuti restano tuoi (nuovo)

## Direzione grafica
- [x] Ricerca dei riferimenti (docs/direzione-grafica.md)
- [x] Scegliere la direzione: Corsia ed Evidenziatore
- [x] Token CSS per Corsia ed Evidenziatore, chiaro e scuro
- [x] Caratteri Lexend, Bricolage Grotesque, Atkinson Next
- [x] Colori dei nodi per ruolo, non esadecimali fissi
- [x] Stile dei nodi diverso per ciascuno stile
- [x] Selettore dello stile in Impostazioni e nella barra
- [x] Stile salvato in un cookie, senza lampo al caricamento
- [x] Rigenerare le schermate della landing
- [x] Decidere: dock comune a Corsia ed Evidenziatore
- [x] Home con dock di studio, nei due stili (nuovo)
- [x] Data dell'esame per il conto alla rovescia (nuovo)
- [x] Timer di studio nel dock (nuovo)

## Da fare tu
- [x] Creare il progetto Supabase di sviluppo (regione UE)
- [x] Creare il progetto Supabase di test (regione UE)
- [x] Applicare le migrazioni a entrambi (npm run db:push)
- [x] Compilare .env.local e .env.test con URL e chiavi
- [x] Prendere la chiave Gemini su aistudio.google.com
- [x] Prendere la chiave OpenRouter
- [x] Configurare Google OAuth (Google Cloud + Supabase)
- [x] Impostare Site URL e Redirect URL in Supabase
- [ ] Configurare un SMTP per le email di conferma
- [ ] Scegliere un modello a pagamento UE per la produzione
- [ ] Creare l'account Stripe e i prodotti Pro
- [ ] Deploy su Vercel in regione UE
- [ ] Aggiungere l'URL di produzione ai redirect di Supabase e Google
- [ ] Fissare il prezzo Pro (7-10 €/mese, sconto annuale)
