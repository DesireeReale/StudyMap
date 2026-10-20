# Confronto UX/UI con Algor Education

Data: 20 ottobre 2026. Obiettivo: capire perché Algor sembra nettamente migliore su sei aree e cosa cambiare in studymap.

**Fonti per Algor.** Solo pagine pubbliche: home `algoreducation.com/it`, pagine di funzionalità (mappe concettuali, quiz, flashcard, riassunti), i 6 screenshot della scheda App Store e la guida pubblica già letta per [ricerca-concorrenti.md](ricerca-concorrenti.md). Nessun account e nessun login. Il banner dei cookie non è stato accettato.

**Fonti per studymap.** Server di sviluppo su localhost:3000, con l'account dell'utente: libreria, mappa (29 concetti), pagina documento, mazzo di flashcard e upload, a 1280×800. Quiz e riassunti non erano presenti nell'account: li ho valutati dal codice (`QuizRunner.tsx`, `NoteEditor.tsx`, `GenerateButtons.tsx`). Per la landing ho usato la vista del 19 ottobre, perché da utente collegato la home rimanda alla libreria.

**Regola.** Qui ci sono solo principi riformulati da noi. Non vanno copiati testi, layout identici, icone, illustrazioni, la mascotte, i colori del brand o i nomi di Algor (per esempio "Set").

Legenda: priorità **Alta / Media / Bassa**; stima **piccolo** (meno di mezza giornata), **medio** (1-2 giorni), **grande** (più giorni). Gli interventi rispettano i due stili Classic e Vivid (ex Corsia ed Evidenziatore) e le regole per i DSA: testo di almeno 16px, colore mai come unico segnale, animazioni che si spengono con `prefers-reduced-motion`.

## Il problema di fondo

Algor mostra **una cosa per volta, grande**. Studymap mostra **tutto insieme, piccolo**. Ne sono esempi la mappa da 29 concetti che a schermo intero diventa illeggibile, la barra con sette controlli sopra la mappa, l'upload su un unico modulo e gli screenshot minuscoli della landing. Quasi tutti gli interventi qui sotto vanno nella stessa direzione: meno elementi per schermata, testo più grande, un'azione principale sola.

## 1. Mappa concettuale

**Cosa fa meglio Algor, in principio.**
- **Leggibilità prima della completezza.** Negli screenshot pubblici una mappa mostra pochi concetti per vista, a corpo grande, con un colore pieno per ramo. Un testo lungo viene diviso in più mappe piccole invece di una sola gigante.
- **Il colore codifica la struttura.** Ogni ramo principale ha la sua tinta, che si ripete nei figli: si capisce a colpo d'occhio a quale ramo appartiene un concetto.
- **Comandi nascosti finché non servono.** In vista la mappa occupa lo schermo, con un comando per lo schermo intero e un menu. I comandi di modifica non stanno tutti sopra la mappa.

**Cosa abbiamo noi, da mantenere.** Editor vero (aggiungere, rinominare, eliminare, riordinare), scorciatoie da tastiera, export PNG, Markdown e OPML, colori per ruolo che seguono lo stile, contrasto automatico delle etichette, opzione tutto maiuscolo.

**Cosa non va oggi.** Con 29 concetti il "adatta allo schermo" riduce il testo a pochi pixel ed è illeggibile (vedi screenshot). Le etichette sugli archi ("richiede", "comprende") sono minuscole. La barra mostra sette comandi anche quando non c'è niente di selezionato.

**Interventi.**
1. **Zoom minimo leggibile.** All'apertura non scendere mai sotto un corpo di 14-16px: centra la radice e il primo livello e lascia il resto fuori schermo, raggiungibile trascinando. — Alta, piccolo.
2. **Colore per ramo.** Ogni figlio della radice prende un ruolo colore diverso e i suoi discendenti ne ereditano una tinta più chiara; la differenza si vede anche dalla linguetta o dal bordo, non solo dal colore. — Alta, medio.
3. **Comprimi ed espandi i rami.** Un comando "+/−" sul nodo; all'apertura delle mappe grandi i livelli oltre il secondo sono chiusi. — Alta, medio.
4. **Barra contestuale.** Fuori dalla selezione restano solo "Concetto", "Riordina" e "Esporta" (in un menu); colori, Rinomina ed Elimina compaiono vicino al nodo selezionato. Più un comando schermo intero. — Media, medio.
5. **Mappe divise per capitolo.** Quando il documento è lungo, la generazione propone una mappa per sezione invece di unire tutto sotto una radice. — Media, grande.

## 2. Quiz

**Cosa fa meglio Algor, in principio.**
- **Si sceglie prima di iniziare:** numero di domande, tipi, difficoltà, timer e se vedere subito la correzione oppure solo alla fine, per simulare l'esame.
- **Il quiz fa parte del percorso.** Si avvia dall'indice dell'argomento e il risultato alimenta i progressi per argomento.
- **Feedback spiegato** per ogni risposta e riepilogo stampabile.

**Cosa abbiamo noi, da mantenere.** Una domanda per volta, contatore "Domanda N di M · X giuste", spiegazione dopo la risposta, punteggio finale salvato, più tipi di domanda.

**Interventi.**
1. **Schermata di impostazione prima del quiz:** numero di domande, tipi, "correzione subito / alla fine", timer facoltativo. La simulazione d'esame è già un obiettivo di Fase 2. — Alta, medio.
2. **Barra di avanzamento visiva** oltre al testo "Domanda N di M", e risposte selezionabili con i tasti 1-4. — Media, piccolo.
3. **Riepilogo finale utile:** elenco delle risposte sbagliate con la spiegazione e la pagina del documento, e un bottone "Rifai solo le sbagliate". — Alta, medio.
4. **Esito per argomento:** il punteggio raggruppato per ramo della mappa, così si vede cosa ripassare. — Media, grande.

## 3. Upload dei file

**Cosa fa meglio Algor, in principio.**
- **Si parte dalla fonte, non dal modulo.** La prima schermata è un elenco di grandi scelte con icona (foto, file dal dispositivo, materiale già caricato, testo, link). Un tocco e si va avanti.
- **Un passo per schermata**, con una barra di avanzamento in alto: si capisce sempre dove si è.
- **Si sceglie subito cosa ottenere** (mappa, flashcard, quiz, riassunto), così il caricamento finisce con lo strumento pronto.

**Cosa abbiamo noi, da mantenere.** Avviso sui dati di persone reali, suggerimenti "Cosa funziona meglio", cartella scelta al caricamento, validazione dei file lato server, formati Word e PowerPoint.

**Cosa non va oggi.** Il campo file nativo ("Scegli file / Nessun file selezionato") è piccolo e anonimo. Cartella, titolo e file stanno sullo stesso piano. Dopo "Carica" bisogna andare nella pagina del documento e premere un altro bottone per generare.

**Interventi.**
1. **Area di trascinamento grande** ("Trascina qui il PDF o clicca per sceglierlo"), con icona, formati ammessi ed evidenziazione quando si trascina. Funziona anche da tastiera. — Alta, piccolo.
2. **Scelta della fonte a riquadri** (File, Foto, Testo incollato) al posto delle due schede; cartella e titolo passano in secondo piano e il titolo si deduce dal nome del file. — Alta, medio.
3. **"Cosa vuoi creare?"** con caselle Mappa / Flashcard / Quiz / Riassunto già nel caricamento, che parte da sé alla fine. — Alta, medio.
4. **Avanzamento a passi:** caricamento → lettura del testo → generazione, con lo stato di ciascun passo e una stima del tempo. Oggi c'è solo "Può richiedere fino a un minuto". — Media, medio.

## 4. Riassunti

**Cosa fa meglio Algor, in principio.**
- **Il riassunto vive dentro un indice.** Il materiale è diviso in sezioni e pagine; il riassunto e gli altri strumenti stanno su ogni pagina, e si naviga dall'indice. Lo studente sa sempre "dove" sta studiando.
- **Si sceglie come scriverlo:** lunghezza, registro semplice o tecnico, formato scorrevole o schematico.
- **Si agisce sul testo:** lettura ad alta voce, evidenziatore e spiegazione semplificata della frase selezionata.

**Cosa abbiamo noi, da mantenere.** Riassunto salvato come nota modificabile, chat col documento con citazioni delle pagine, sfondi di lettura, export di testo.

**Interventi.**
1. **Indice laterale** generato dai titoli del riassunto: si clicca e si salta alla sezione, che resta evidenziata durante lo scorrimento. — Alta, piccolo.
2. **Opzioni prima della generazione:** breve / medio / dettagliato e semplice / tecnico. Già in OBIETTIVI come "registro del testo". — Media, medio.
3. **Pagina di provenienza per paragrafo**, con clic che apre il passaggio nel testo estratto, come già avviene per le citazioni della chat. — Alta, medio.
4. **Azioni sulla selezione:** "Spiegamelo più semplice" e "Fai flashcard da qui". — Media, medio.
5. **Lettura ad alta voce** con la sintesi vocale del browser (gratuita), evidenziando la frase letta. — Media, medio. Funzionamento con le voci italiane dei vari browser: **NON VERIFICATO**.

## 5. Flashcard

**Cosa fa meglio Algor, in principio.**
- **La carta è la protagonista:** grande, centrata, con l'etichetta "domanda" / "risposta" e un colore pieno che distingue il fronte dal retro.
- **Gesto naturale:** su mobile si scorre la carta per rispondere.
- **Progressi visibili** dentro l'app, in una scheda dedicata.

**Cosa abbiamo noi, da mantenere.** Ripetizione dilazionata SM-2, tasti 1/2 per rispondere, modifica delle carte, export CSV e Anki, stato "Niente da ripassare oggi" con la data del prossimo ripasso.

**Cosa non va oggi.** Quando non c'è niente da ripassare la pagina è quasi vuota: un riquadro, un menu chiuso, due bottoni di export e "Elimina mazzo" in rosso con lo stesso peso visivo.

**Interventi.**
1. **Carta grande** (almeno 24px sul fronte), fronte e retro distinti da etichetta e colore di ruolo, girata con uno spazio o un tocco; animazione di rotazione che si spegne con il movimento ridotto. — Alta, piccolo.
2. **Stato del mazzo sempre visibile:** quante carte sono nuove, da ripassare e imparate, con una barra e la prossima data, anche quando oggi non c'è niente. — Media, piccolo.
3. **Scorrimento su mobile**, a sinistra "non so" e a destra "so", con i bottoni sempre presenti come alternativa accessibile. — Media, medio.
4. **Gerarchia delle azioni:** "Ripassa" come azione principale; export ed eliminazione in un menu "Altro". — Bassa, piccolo.

## 6. Landing (presentazione del sito)

**Cosa fa meglio Algor, in principio.**
- **Il primo schermo dice una cosa sola:** un titolo, una riga, un bottone, e sotto un'immagine che mostra la trasformazione "materiale → strumenti di studio".
- **"Come funziona" in pochi passi numerati**, dove la numerazione corrisponde davvero a una sequenza.
- **Uno strumento per volta**, a schede: mappe, flashcard, quiz, riassunti, ognuno con la sua immagine leggibile.
- **Domande frequenti** che rispondono ai dubbi veri (input accettati, prezzo, a chi serve) e messaggi per tipo di pubblico.

**Cosa abbiamo noi, da mantenere.** Schermate reali dell'app con contenuto infermieristico (non illustrazioni), messaggio sulla privacy e sui dati, tipografia decisa.

**Cosa non va oggi.** Nel titolo del primo schermo c'è una miniatura della mappa al posto di una parola: a quella misura il contenuto non si legge e sembra un'immagine rotta. Le sezioni successive hanno titoli enormi e contenuti piccolissimi, con molto spazio vuoto in mezzo.

**Interventi.**
1. **Primo schermo da rifare:** titolo su due righe senza immagini dentro; sotto, una mappa dimostrativa grande e leggibile, che si può muovere. — Alta, medio.
2. **"Come funziona" in 3 passi:** carichi, scegli cosa creare, studi e ripassi; ogni passo con una schermata vera a dimensione leggibile. — Alta, piccolo.
3. **Schede per strumento:** Mappa, Flashcard, Quiz, Riassunto, Chat col documento, ognuna con una schermata grande e due righe. — Media, medio.
4. **Domande frequenti:** dati e privacy (UE, niente pazienti), cosa è gratis, formati accettati, DSA e accessibilità, cosa succede ai miei contenuti se smetto di pagare. — Media, piccolo.
5. **Niente numeri gonfiati.** Al posto dei "milioni di utenti", argomenti verificabili: fatto per infermieristica, dati in UE, contenuti sempre tuoi. — Bassa, piccolo.

## Ordine consigliato

1. Mappa leggibile: zoom minimo, colore per ramo, rami comprimibili.
2. Upload a trascinamento con "cosa vuoi creare".
3. Primo schermo e "come funziona" della landing.
4. Carta grande nelle flashcard e riepilogo finale del quiz.
5. Il resto, in ordine di priorità.

## NON VERIFICATO

- I comportamenti interni di Algor (impostazioni del quiz, correzione alla fine, scorrimento delle flashcard, indice per pagina, divisione in più mappe) vengono dalla sua guida pubblica e dagli screenshot dell'App Store, non da una prova diretta.
- Quiz e riassunti di studymap sono valutati dal codice, non visti a schermo: nell'account non ce n'erano.
- Le stime di tempo sono indicative.
