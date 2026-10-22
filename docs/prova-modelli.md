# Prova dei modelli di OpenRouter

## Modelli a pagamento (21 ottobre 2026, ore 17:13)
Una chiamata per attività, con il codice dell'app (`complete`), lo stesso testo sulla fotosintesi e la stessa slide della prova dei gratuiti. Ragionamento spento (`reasoning: { effort: "none" }`) e `provider: { data_collection: "deny" }`. Costo letto da `usage.cost` di OpenRouter.

| Modello | Attività | Tempo | JSON | Token in / out / ragionamento | Costo |
|---|---|---|---|---|---|
| deepseek/deepseek-v4.1-flash | Mappa | 4,5 s | valido | 943 / 1632 / 0 | 0,00168 $ |
| deepseek/deepseek-v4.1-flash | Trascrizione | 0,8 s | valido | 513 / 94 / 0 | 0,00027 $ |
| qwen/qwen3.7-flash | Mappa | 15,0 s | valido | 863 / 1852 / 0 | 0,00027 $ |
| qwen/qwen3.7-flash | Trascrizione | 3,3 s | valido | 712 / 123 / 0 | 0,00004 $ |

- **Qualità:** 37 concetti per entrambi, fedeli al testo. DeepSeek scrive etichette più naturali ("Trasforma energia luminosa in energia chimica"), Qwen più telegrafiche ("Trasforma energia luce in chimica"). Trascrizioni corrette per entrambi; DeepSeek mette i valori del grafico in un elenco.
- **Costo di DeepSeek:** circa 2,6 volte il prezzo di listino (0,024 / 0,375 $ per milione), perché `data_collection: "deny"` esclude i provider più economici. Qwen ha pagato il prezzo di listino.
- **Ordine scelto:** DeepSeek V4.1 Flash, Qwen 3.7 Flash, Gemma 4 26B gratuito. DeepSeek è tre volte più veloce sulla mappa; costa di più ma resta sotto mezzo centesimo.

### Stima dei costi (NON VERIFICATO: dipende da lunghezza delle lezioni e provider scelto)
- Una mappa da una lezione di circa 20 pagine (10.000 token in, 2.000 out) con DeepSeek: circa 0,005 $; con Qwen circa 0,0006 $.
- Un mese di beta con 10 studenti (20 generazioni a testa, circa 50 pagine trascritte e 30 messaggi di chat a testa): circa 2 $. Con 7,40 $ di credito si coprono circa 3 mesi.

## Modelli gratuiti

Data: 21 ottobre 2026, dalle 14:27 alle 14:33 (ora italiana). Una richiesta alla volta, con il codice dell'app (`complete`, timeout dell'app: 40 s per la mappa, 30 s per la trascrizione) e il ragionamento "low" dove il modello lo accetta.

- **Mappa:** testo inventato di 250 parole sulla fotosintesi (lo stesso della prova di MiniMax).
- **Trascrizione:** una slide inventata 960×540 con titolo, due punti elenco e un grafico a barre (Riposo 120, Cammino 140, Corsa 175 mmHg), solo per i modelli che leggono immagini.
- Al massimo un nuovo tentativo per modello. Sui 429 l'app ripete già da sola l'ultimo modello dopo 2 e 5 secondi, quindi per i Gemma ogni tentativo sono state 3 richieste (6 in tutto per attività).

| Modello | Mappa | Trascrizione | Qualità | Errori |
|---|---|---|---|---|
| minimax/minimax-m3.1-flash:free (prova del mattino) | 9,5 s, JSON valido | non provata | 39 concetti, fedeli e ben ordinati | nessuno |
| google/gemma-4-26b-a4b-it:free | non riuscita | non riuscita | non giudicabile oggi (ieri: 33 s, 32 concetti) | 429 dal provider in tutti i tentativi |
| google/gemma-4-31b-it:free | non riuscita | non riuscita | non giudicabile | 429 dal provider in tutti i tentativi |
| nvidia/nemotron-3.5-super-vl:free | timeout a 40 s | 6,2 s ma JSON incompleto (manca `markdown`), poi timeout a 30 s | non giudicabile | timeout |
| thinkingmachines/inkling:free | non riuscita | non riuscita | non usabile | 403: "only available on agentic harnesses" |
| thinkingmachines/inkling-small:free | non riuscita | non riuscita | non usabile | 403: come sopra |
| nvidia/nemotron-3.5-lightning:free | timeout a 40 s | (solo testo) | non giudicabile | timeout |
| nvidia/nemotron-3-super-120b-a12b:free | non riuscita | (solo testo) | non giudicabile | 404 dal provider |
| xingchen-agi/xing4.0-29b-a4b:free | 11,6 s, JSON valido, 997 token in ingresso e 882 in uscita | (solo testo) | 28 concetti ma con parole inventate ("Elettriomi", "Idrocleasi"): non adatto | nessuno |

## Cosa ne segue
- Oggi l'unico modello gratuito veloce e affidabile è MiniMax, che però esce dalla catena il 22 ottobre alle 00:00 UTC (data indicata dall'utente; l'API di OpenRouter non la riporta: NON VERIFICATO).
- Gemma 4 era il più veloce dopo MiniMax nella prova del 20 ottobre, ma oggi il suo provider ha risposto sempre 429: con 10 studenti il rischio di attese ed errori è alto.
- Inkling e Inkling Small non si possono usare dall'app (solo "agentic harnesses"); Xing 4.0 risponde ma sbaglia le parole italiane; i Nemotron vanno in timeout o in errore.

## Catene risultanti (`src/config/ai.ts`)
- **Testo:** MiniMax (fino al ritiro), Gemma 4 26B, Gemma 4 31B, Nemotron VL, `openrouter/free`.
- **Immagini:** MiniMax (fino al ritiro), Gemma 4 26B, Gemma 4 31B, Nemotron VL.

## Materiale reale, 22 ottobre
Tre PDF veri di studenti (non nel repository): un quaderno scansionato scritto a mano (79 pagine, 44 MB, nessun testo estraibile) e due dispense con testo (44 e 33 pagine). Codice dell'app (`transcribeImage`, `generateMindMap`, `complete`), catena di un solo modello, ragionamento spento, `data_collection: "deny"`, prompt `transcribe.v1` e `mindmap.v2`. Pagine renderizzate come fa l'app: unpdf a scala 1,5 in PNG (892×1262 px). Nessun nuovo tentativo è servito. Costo da `usage.cost`.

### Trascrizione delle prime 5 pagine scritte a mano
| Modello | Tempo per pagina | Costo 5 pagine | Costo per pagina | [illeggibile] | Errori evidenti a pagina 1 |
|---|---|---|---|---|---|
| deepseek/deepseek-v4.1-flash | 1,1–2,6 s (media 1,8 s) | 0,0033 $ | 0,00066 $ | 0 | "dell'immagine" invece di "delle Immagini"; etichetta del grafico "ALTRI COLORI" letta "OLTRE I 100"; "Quadrato M×N" letto "Ampiezza M x N" |
| qwen/qwen3.7-flash | 6,4–20,5 s (media 10,6 s) | 0,00043 $ | 0,00009 $ | 0 | "ALTRI COLORI" letto "ALTRI GRIGI"; "Si parte da 1" letto "Sparte da 1!"; "una terna (R, G, B)" letto "una terra" |

- **Qualità:** su una pagina tre errori a testa, sul resto testo fedele (titoli, formule `1 bit [0,1]`, `HDR = High Dynamic Range`). Entrambi descrivono i due schemi tra parentesi quadre; le frecce che collegano 1 bit e 8 bit a "Range di colori" diventano una riga con `→`, senza perdere il senso. Confronto fatto a occhio solo sulla pagina 1.
- **[illeggibile] mai usato:** sulla grafia incerta i modelli tirano a indovinare invece di segnalarlo, quindi gli errori non si vedono.
- **Quaderno intero (79 pagine, 4 alla volta come fa l'app), stima:** DeepSeek circa 0,05 $ e 40 s; Qwen circa 0,007 $ e 3–4 minuti.

### Mappa dalle dispense con testo (DeepSeek, una sola chiamata ciascuna)
| PDF | Pagine | Token in / out | Tempo | Costo | Concetti |
|---|---|---|---|---|---|
| Sistemi operativi | 44 | 39.886 / 2.130 | 6,5 s | 0,0102 $ | 75 |
| Computer forensics | 33 | 21.648 / 1.676 | 4,3 s | 0,0064 $ | 40 |

- **Qualità:** rami ordinati e fedeli all'indice delle dispense (processi, scheduling, memoria, file system; fasi del reperto, aspetti giuridici). Mappa però sommaria: meno di 2 concetti per pagina, i dettagli dei capitoli lunghi restano fuori.
- **Costo più alto del previsto:** DeepSeek ha pagato circa 0,24 $ per milione di token in ingresso, dieci volte il listino scritto in `src/config/ai.ts` (0,024 $). Probabile effetto di `data_collection: "deny"` (provider più cari), NON VERIFICATO. Con Qwen la stessa mappa costerebbe circa 0,0015 $ a listino (NON VERIFICATO). Le stime della sezione precedente vanno quindi alzate per DeepSeek.

### Dal 22 ottobre senza `data_collection: "deny"`
Decisione dell'utente: il materiale sono appunti, non dati sensibili, e l'accettazione della beta (versione 2026-10-22) copre la conservazione dei dati da parte dei provider. Tolto il vincolo, OpenRouter può scegliere anche i provider più economici: il prezzo dovrebbe tornare vicino al listino (DeepSeek 0,024 / 0,375 $ per milione, Qwen 0,03 / 0,13 $), NON VERIFICATO fino alla prossima chiamata reale.
- Mappa da 44 pagine (40.000 token in, 2.000 out) con DeepSeek: circa 0,002 $ invece di 0,010 $.
- Trascrizione di una pagina scritta a mano: circa 0,0001–0,0002 $ invece di 0,00066 $; quaderno da 79 pagine circa 0,01–0,02 $.
- Un mese di beta con 10 studenti (stime della prima sezione): resta sotto i 2 $.

### Limiti di upload
Il quaderno oggi viene rifiutato: 44 MB e 79 pagine contro 10 MB e 20 pagine nel Free, 25 MB e 200 pagine nel Pro. Ricomprimendo le 5 pagine renderizzate in JPEG (napi-rs canvas, stesse dimensioni che usa l'app):

| Formato per pagina | Media per pagina | Stima 79 pagine |
|---|---|---|
| Originale nel PDF | 569 KB | 44 MB |
| PNG a scala 1,5 (quello che oggi va al modello) | 755 KB | 60 MB |
| JPEG 892 px, qualità 70 | 128 KB | 10,1 MB |
| JPEG 892 px, qualità 50 | 97 KB | 7,6 MB |
| JPEG 669 px, qualità 60 | 66 KB | 5,2 MB |

**Proposta (non implementata):** nel browser, prima dell'upload, se il PDF supera il limite e le pagine non hanno testo, renderizzare ogni pagina a scala 1,5 e ricostruire il PDF con pagine JPEG qualità 50 (`jspdf` è già tra le dipendenze); insieme, un campo "dalla pagina … alla pagina …" per restare sotto il limite di pagine (nel Free 20 pagine diventano circa 2 MB). La qualità della trascrizione su JPEG qualità 50 non è stata provata: NON VERIFICATO, ma la risoluzione è la stessa che il modello riceve oggi.

### Prompt transcribe.v2 sulla pagina 1 compressa (22 ottobre, dopo la rimozione di `data_collection: "deny"`)
Una chiamata a DeepSeek V4.1 Flash. Pagina 1 del quaderno ricompressa in JPEG qualità 50 come farà il browser, messa in un PDF con jspdf e renderizzata dall'app a scala 1,5: a occhio l'immagine è uguale all'originale.

| Tempo | Token in / out | Costo | Parole segnate |
|---|---|---|---|
| 4,4 s | 1.301 / 350 | 0,00047 $ | 3 ([?balle], [?M-N], [?uno]) |

- **Risultato peggiore del previsto:** dei tre errori di ieri nessuno è segnato. "ALTRI COLORI" diventa "OLTRE IL BIANCO", "Quadrato" diventa "Ammattonato", "terna" diventa "terra", e "Allo zero si associa il nero" diventa "Ad esempio se abbiamo il nero": tutti senza segno. Delle tre parole segnate, una ipotesi è sbagliata ("balle" invece di "bande").
- **Tre cose sono cambiate insieme** (prompt v2, JPEG compresso, provider scelto liberamente da OpenRouter), quindi la causa non è isolabile con una sola chiamata. Il passaggio peggiore ("Ad esempio se abbiamo") fa pensare a un provider diverso più che al JPEG: NON VERIFICATO.
- **Costo:** 0,00047 $ contro circa 0,00016 $ a listino, ancora circa 3 volte il listino anche senza `deny` (NON VERIFICATO il motivo).
- **Conseguenza:** il controllo dello studente serve, ma le parole segnate non bastano. La pagina "Controlla il testo" mostra quindi l'originale accanto alla trascrizione e permette di modificare tutto il testo.

### Una mappa per capitolo (22 ottobre)
`detectChapters` trova 6 capitoli nella dispensa di Sistemi operativi (titoli in maiuscolo a inizio pagina, raggruppati in almeno 6 pagine) e nessuno in quella di Computer forensics (niente titoli riconoscibili: lì resta solo "una mappa"). Una chiamata a DeepSeek sul capitolo "Gestione della memoria, Paginazione, Tabella delle pagine multilivello…" (pagine 24–29):

| Tempo | Token in / out | Costo | Concetti |
|---|---|---|---|
| 6,7 s | 5.496 / 1.166 | 0,0018 $ | 45 |

- Nella mappa unica di ieri lo stesso argomento aveva 15 concetti, e copriva anche le pagine 30–36. Con 6 capitoli la dispensa intera arriverebbe a circa 250 concetti, per circa 0,011 $ (stima).
- Costo ancora circa 3 volte il listino (0,00057 $ a listino), come nella trascrizione: NON VERIFICATO il motivo.

### Riassunto che falliva con "servizio occupato" (22 ottobre)
- **Causa (da `ai_usage` di sviluppo):** riassunto di Computer forensics (20 pagine nel Free, 14.445 token in ingresso) con DeepSeek: risposta troncata a `max_tokens` 3000 (`output_tokens` = 3000, JSON non chiuso), anche nel tentativo di correzione; poi Gemma gratuito ha risposto 429 e l'errore finale era "occupato".
- **Prova della correzione (una chiamata):** con pezzi da 6.000 token e `max_tokens` 4000 la risposta è stata di nuovo troncata (6.574 in, 4.000 out, 0,0036 $, 13,9 s): il prompt v2 permetteva fino a 12 sezioni da 8 punti e DeepSeek li riempie tutti.
- **Correzione finale (NON VERIFICATA con una chiamata reale):** prompt summary.v3 con al massimo 8 sezioni, 5 punti e 25 parole per punto; pezzi da 6.000 token, `max_tokens` 6000, timeout 90 s. Una risposta troncata non viene più "corretta" (inutile) e l'errore dice che era troppo lunga.
