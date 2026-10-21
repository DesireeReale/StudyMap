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
