# Ricerca sui concorrenti: Algor Education e GitMind

Aggiornata a ottobre 2026. Fonti: siti ufficiali, guide d'aiuto, changelog, App Store, Google Play, Trustpilot, tracker di prezzi. Il report completo con tutti i link è nella cartella di note della sessione (`reports/Algor e GitMind a confronto.md`); qui c'è la sintesi utile per decidere cosa costruire.

Regola: ci ispiriamo alle funzionalità, non copiamo testi, nomi, grafica o asset.

## In breve

- **Algor Education** (italiano, nato nel 2021 con l'Associazione Italiana Dislessia) oggi è una piattaforma di studio. Da un file crea un "Set": indice di sezioni e pagine, e per ogni pagina mappa, riassunto, domande e risposte, trascrizione e podcast. A livello di Set ci sono flashcard con ripetizione dilazionata, verifiche corrette dall'AI e una dashboard dei progressi. Ha anche una vista docente con la classe.
- **GitMind** (Wangxu Technology, Shenzhen) è una suite di diagrammi: mappe mentali con 13 layout, flowchart, UML, ER, Gantt, timeline, infografiche, lavagna. Ha moltissimi strumenti AI e fa scegliere il modello (GPT, Claude, Gemini, DeepSeek). Flashcard (agosto 2026) e quiz sono solo generatori: niente ripasso dilazionato, niente progressi.
- Entrambi vendono **abbonamenti a crediti AI**, ed è la prima fonte di lamentele.

## Piani e prezzi

| | Free | Piano base | Piano intermedio | Piano alto |
|---|---|---|---|---|
| **Algor** (EUR) | 30 crediti una tantum, circa 2 contenuti, testi fino a 50.000 caratteri, 25 pagine per PDF | Base €6,99/mese (€5,49 annuale), 150 crediti, 10 contenuti da max 10 pagine | Pro €9,99/mese (€6,59 annuale), 700 crediti, 45 contenuti | Ultra €14,99/mese (€9,99 annuale), 2.000 crediti, oltre 130 contenuti |
| **GitMind** (USD) | circa 30 crediti, 10 mappe, export "regular" | Basic $59/anno, crediti AI non chiari | Pro $19/mese (300 crediti) o $69/anno (2.000 crediti) | Ultra $139/anno, 4.000-5.000 crediti; Business per postazione |
| **studymap** (piano attuale) | 5 generazioni/mese, 20 pagine per PDF, 10 documenti, PNG con marchio | — | Pro 7-10 €/mese (prezzo da fissare): 150 generazioni/mese, 200 pagine, PDF senza marchio | — |

Note: Algor vende pacchetti di crediti extra (1.500 a €19,90) e rimborsa entro 14 giorni se hai usato al massimo 50 crediti. GitMind ad aprile 2026 ha alzato i prezzi e ridotto lo sconto annuale dal 60% al 20%; i Termini dicono che i pagamenti non si rimborsano. Nessuno dei due pubblica quanti crediti costa ogni operazione.

## Punti deboli dalle recensioni

**Algor** (Trustpilot 4,3 su 555 recensioni, 10% da una stella; voti degli store probabilmente gonfiati al lancio dell'app iOS):
- crediti scalati anche per rigenerazioni e generazioni fallite;
- dopo la disdetta i contenuti creati e i crediti residui non sono più accessibili;
- assistenza che non risponde, rinnovo automatico difficile da disattivare, fatture mancanti;
- AI poco fedele alla fonte: riassunti superficiali, parti saltate, linguaggio più difficile anche chiedendo di semplificare, risposte giuste dei quiz quasi sempre in posizione 2 o 3;
- bug: caricamenti bloccati, app iOS lenta, app Android che perde il lavoro;
- minori: flashcard non modificabili a mano, quiz esportabili solo in PDF, niente cartelle né caricamento multiplo, tolto il formato mappa in stampatello (importante per i DSA), podcast non scaricabili offline.

**GitMind** (Trustpilot 2,7, Google Play 4,0, App Store USA 3,6):
- paywall ovunque, limite di 10 mappe nel gratuito;
- crediti che finiscono subito (una trascrizione di 1,3 minuti ha esaurito il credito di un utente);
- disdetta solo scrivendo all'assistenza, piani convertiti d'ufficio in crediti;
- lentezza sulle mappe grandi;
- privacy: legge cinese, arbitrato a Hong Kong, informativa del 2021 senza paese dei server né fornitori AI. Pesa per scuole e studenti europei.

## Tabella delle funzionalità

Legenda per studymap: **fatto** = c'è nel codice oggi; **Fase 2** / **Fase 3** = previsto in `docs/SPEC.md`; **mancante** = non previsto.

| Funzionalità | Algor | GitMind | studymap |
|---|---|---|---|
| **Mappe** | | | |
| Mappa concettuale gerarchica | sì | sì | fatto |
| Mappa mentale radiale | sì | sì | mancante |
| Altri layout (fishbone, timeline, tabella, org chart) | no | sì (13 layout) | mancante |
| Diagrammi di flusso | no | sì | Fase 3 |
| Lavagna libera | no | sì | Fase 3 |
| Modifica nodi: aggiungi, sposta, rinomina, elimina, colori | sì | sì | fatto |
| Layout automatico | sì | sì | fatto (dagre) |
| Immagini, audio, video, allegati nei nodi | sì | sì | mancante |
| Note e link dentro i nodi | sì | sì | mancante |
| Rigenerare o modificare la mappa con un comando AI | sì | sì | mancante |
| Mappe collegate tra loro | no | no | Fase 3 |
| Modalità outline (mappa come elenco) | no | sì | mancante |
| Modalità presentazione | no | sì | mancante |
| **Input** | | | |
| PDF | sì | sì | fatto |
| Immagini e foto di appunti (OCR) | sì | sì | fatto |
| Testo incollato | sì | sì | fatto |
| Word, PowerPoint | sì | sì (anche XLSX, EPUB) | mancante |
| Link web | sì | sì | mancante |
| YouTube | sì | sì | mancante |
| Audio e video (registrazione della lezione) | sì | sì | mancante |
| Solo un argomento, senza file | sì | sì | mancante |
| **Strumenti AI** | | | |
| Riassunto | sì | sì | mancante (SPEC: `summarize`) |
| Chat con il documento, con riferimenti | sì | sì | Fase 2 |
| Spiegazione semplificata di un passaggio | sì | no | mancante |
| Scelta del registro (semplice / tecnico) e del pubblico | sì | no | mancante |
| Podcast / panoramica audio | sì | no | mancante |
| Traduzione | tramite lingua di output | sì | mancante |
| Scelta del modello da parte dell'utente | no | sì | mancante (deciso dal piano) |
| **Studio** | | | |
| Flashcard generate | sì | sì | fatto |
| Ripasso semplice (so / non so) | sì | sì | fatto |
| Ripetizione dilazionata | sì (4 livelli) | no | Fase 2 |
| Modificare le flashcard a mano | no (lamentato) | sì | mancante |
| Quiz a scelta multipla con spiegazioni | sì | sì | Fase 2 |
| Altri tipi di domanda (V/F, completamento, aperta) | sì | in parte | mancante |
| Simulazione d'esame a tempo | sì | no | Fase 2 |
| Domande stile concorso e casi clinici | no | no | Fase 3 |
| Progressi: obiettivo, padronanza per argomento | sì | no | mancante |
| **Collaborazione** | | | |
| Condivisione in sola lettura | sì | sì | Fase 3 |
| Modifica in tempo reale | sì | sì | Fase 3 |
| Vista docente / classe | sì | no | mancante |
| **Export e import** | | | |
| PNG | ? | sì | fatto (marchio nel Free) |
| PDF | sì (premium) | sì | fatto (Pro) |
| Word, Markdown, OPML, SVG | no | Word, TXT | mancante |
| Export flashcard (Anki / CSV) | no | no | mancante |
| Import da XMind, OPML, Markdown | no | sì | mancante |
| **Piattaforme** | | | |
| Web | sì | sì | fatto |
| PWA installabile | ? | ? | fatto (senza service worker) |
| App iOS / Android | sì | sì | pianificato (Capacitor) |
| App desktop | no | sì | pianificato (Tauri) |
| Offline | no | no | Fase 3 |
| **Accessibilità e DSA** | | | |
| Font ad alta leggibilità | non documentato | no | fatto (Atkinson Hyperlegible) |
| Contrasto automatico del testo sui nodi | no | no | fatto |
| Tema scuro | ? | ? | fatto (segue il sistema) |
| Navigazione da tastiera nell'editor | ? | ? | fatto (in parte) |
| Riduzione delle animazioni | ? | ? | fatto (`prefers-reduced-motion`) |
| Lettura ad alta voce | sì | no | Fase 3 |
| Impostazioni di lettura: spaziatura, dimensione, maiuscolo, sfondo | no | no | mancante |
| **Fiducia e privacy** | | | |
| Dati in UE | ? | no | fatto (progetto Supabase in UE) |
| Consenso separato per i modelli che addestrano sui dati | — | — | fatto |
| Cancellazione account e dati | sì | ? | fatto |
| Contenuti accessibili dopo la fine dell'abbonamento | no | ? | fatto (regola dei piani) |
| Pagamenti e gestione piano | sì | sì | Fase 2 (Stripe) |

## Dove possiamo fare meglio

1. **Niente crediti opachi.** Contiamo "generazioni", non crediti dal costo nascosto. Una generazione fallita già non scala la quota (`/api/generate` restituisce l'unità in caso di errore); il passo successivo è rendere gratuita la prima rigenerazione della stessa mappa. Mostrare sempre "ti restano N generazioni".
2. **I tuoi contenuti restano tuoi.** È già una regola dei piani: dopo il downgrade si continua a leggere ed esportare tutto. Va detto chiaramente nella pagina prezzi, perché è la lamentela più grave contro Algor.
3. **Accessibilità tipografica vera.** Nessuno dei due la offre. Un pannello "lettura" con dimensione del testo, spaziatura tra lettere e righe, mappa tutta in MAIUSCOLO, sfondo color crema o azzurro, font alternativo. Costa poco (variabili CSS) e risponde a un bisogno esplicito dei DSA.
4. **Fedeltà alla fonte.** Le recensioni di Algor accusano riassunti inventati o superficiali. Ogni nodo e ogni flashcard può portare il numero di pagina da cui viene, con un clic che apre il passaggio originale. Distribuire la risposta giusta dei quiz in modo uniforme tra le opzioni.
5. **Specializzazione infermieristica.** Né Algor né GitMind hanno domande stile concorso, casi clinici, calcolo dei dosaggi, scale di valutazione (Braden, Glasgow, NEWS). È il nostro vantaggio difendibile (Fase 3, da anticipare in parte).
6. **Offline.** Nessuno dei due funziona offline. Un service worker che salva mappe e flashcard già aperte serve a chi studia in treno o in tirocinio.
7. **Flashcard modificabili ed esportabili.** Modifica a mano (lamentela su Algor) ed export CSV/Anki, che nessuno dei due offre.
8. **Prezzo chiaro e disdetta in un clic.** Portale clienti Stripe, fattura automatica, rimborso semplice. Con 7-10 €/mese siamo allineati ad Algor Pro e sotto GitMind mensile.
9. **Privacy europea.** Dati in UE, modelli che non addestrano sui dati per chi non dà il consenso, informativa aggiornata: un argomento forte per università e scuole rispetto a GitMind.
10. **Input da lezione.** Registrazioni audio e link YouTube sono tra le funzioni più apprezzate di Algor: candidati per la Fase 2-3, attenzione però al costo della trascrizione.

## Limiti di questa ricerca

Non sono pubblicati il costo in crediti di ogni operazione né i formati di export completi di Algor. GitMind non ha prezzi in euro e i crediti per piano variano tra le fonti. G2 e Capterra hanno bloccato l'accesso; su Reddit non ci sono discussioni rilevanti. I voti "?" nella tabella indicano dati non trovati, non assenti.
