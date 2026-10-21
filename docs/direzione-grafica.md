# Direzione grafica: tre proposte

Pagina visiva per confrontarle: https://claude.ai/artifact/UtdCwDCk7hjXwEVAaiUeLr (privata).

Riferimenti trovati con il server MCP awwwards (nomination e menzioni Awwwards del 2026). Servono per il tono, non vanno copiati: palette, caratteri e stile dei nodi qui sotto sono proposte originali. Tutti gli abbinamenti di testo superano WCAG AA (rapporti calcolati sotto). Ogni direzione mantiene un carattere ad alta leggibilità per il testo corrente, pensato per chi ha la dislessia.

Oggi l'app usa verde acqua `#1b6e66` e inchiostro `#1f201d` con Atkinson Hyperlegible: la direzione A è la più vicina, la C la più lontana.

## A · Quaderno a quadretti

**Mood.** Il blocco appunti dello studente: carta a puntini, inchiostro scuro, schede indice con una linguetta colorata per argomento. Ordinato, tranquillo, da biblioteca.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Fondo (carta) | `#f6f7f2` | `#141815` |
| Testo (inchiostro) | `#1e2421` | `#e9ece6` |
| Accento (salvia scuro) | `#2f5d50` | `#8fc1ae` |
| Argomento 2 (ocra) | `#9a5b13` | — |
| Argomento 3 (blu quaderno) | `#3d5a8a` | — |

Contrasto: inchiostro su carta 15,1:1; salvia su carta 6,9:1.

**Caratteri.** Titoli Lexend; testo Atkinson Hyperlegible Next; numeri e metadati IBM Plex Mono.

**Nodi.** Rettangoli quasi squadrati (raggio 4px) come schede indice, bordo sottile, linguetta colorata in alto per l'argomento. Archi curvi grigio grafite. Sfondo della mappa a puntini, che aiuta ad allineare.

**Riferimenti.**
- [ITSUA](https://itsua.com/): griglia a indice, etichette monospace, colori per categoria.
- [Field Rank](https://www.fieldrank.run): fondo carta, tabelle di dati leggibili, metadati monospace.
- [Xiloteca Trevigiana](https://xiloteca.it/en/): archivio a schede, tono da catalogo scientifico.

## B · Corsia

**Mood.** Calma clinica: blu ospedaliero, superfici fredde e luminose, tinte tenui per ogni area del corso. Fa pensare al reparto senza essere freddo.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Fondo | `#f4f7fb` | `#0d1520` |
| Testo (notte) | `#0f1b2d` | `#e6edf7` |
| Accento (blu corsia) | `#1d5fd1` | `#7fb0ff` |
| Tinta sintomi | `#fde7d6` | — |
| Tinta farmaci | `#dbe7fb` | — |
| Tinta assistenza | `#d5f0ea` | — |

Contrasto: notte su fondo 16,1:1; bianco su blu 5,8:1; notte sulle tinte oltre 13,8:1; blu chiaro su fondo scuro 8,3:1.

**Caratteri.** Lexend per titoli e testo (progettato per la fluidità di lettura); IBM Plex Mono per i dati.

**Nodi.** Radice a pillola piena blu; figli come capsule morbide (raggio 14px) con fondo tinto per area e un piccolo simbolo. Niente bordi, archi dritti sottili.

**Riferimenti.**
- [Plumeform](https://plumeform.com): sezioni calme, verde petrolio e carta, demo del prodotto in primo piano.
- [Lev](https://www.lev.com/): interfaccia SaaS ordinata, etichette di stato chiare.
- [miralife.app](https://miralife.app/): app di benessere, card morbide, colori per categoria.

## C · Evidenziatore

**Mood.** Il libro sottolineato: nodi colorati come passate di evidenziatore, contorno a inchiostro, titoli grandi e decisi. Energico, da sessione d'esame.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Fondo (foglio) | `#ffffff` | `#17161c` |
| Testo (inchiostro) | `#121212` | `#f4f2ea` |
| Giallo | `#ffe45c` | `#ffe45c` |
| Menta | `#8ef0c4` | — |
| Lilla | `#c9b6ff` | — |
| Corallo | `#ff9e8a` | — |

Contrasto: inchiostro su giallo 14,7:1, su menta 13,8:1, su lilla 10,4:1, su corallo 9,4:1.

**Caratteri.** Titoli Bricolage Grotesque (peso 800, solo per titoli grandi); testo Atkinson Hyperlegible Next; dati IBM Plex Mono.

**Nodi.** Blocchi pieni nei colori dell'evidenziatore, contorno a inchiostro di 2px e ombra netta spostata (niente sfocature). Archi a gomito neri. In dark mode i colori restano e il contorno diventa chiaro.

**Riferimenti.**
- [Cooldock](https://dock.cool): widget compatti e leggibili, titoli grandi e pieni (Honorable Mention).
- [Rechroma](https://rechroma.com): strumento sul colore, palette come protagonista (Honorable Mention).
- [FORMAT](https://format.obys.agency/): tipografia display enorme e sicura (Site of the Day).

## Scelta: B e C, selezionabili dall'utente

Decisione di ottobre 2026: l'app avrà due stili, **Corsia** (B, predefinito) ed **Evidenziatore** (C). Chi studia sceglie lo stile; ognuno ha la sua versione chiara e scura. La direzione A non si implementa.

Come implementarlo:

- **Attributo sulla radice.** `<html data-style="corsia">` oppure `data-style="evidenziatore"`. Chiaro/scuro resta separato (oggi segue `prefers-color-scheme`), quindi le combinazioni sono quattro.
- **Token.** In `src/app/globals.css` i token esistenti (`--chrome`, `--sheet`, `--text`, `--accent`…) vengono ridefiniti per ciascuno stile e per ciascun tema: `:root[data-style="corsia"]`, `:root[data-style="evidenziatore"]` e le due varianti dentro il blocco dark. I componenti continuano a usare solo i token, quindi non cambiano.
- **Caratteri.** Caricati con `next/font/google` in `src/app/layout.tsx`: Lexend, Bricolage Grotesque, Atkinson Hyperlegible Next, IBM Plex Mono. Un token `--font-display` e uno `--font-body` per stile (Corsia: Lexend / Lexend; Evidenziatore: Bricolage Grotesque / Atkinson Hyperlegible Next).
- **Colori dei nodi.** Oggi `NODE_COLORS` in `src/core/graph.ts` sono esadecimali salvati dentro il grafo della mappa. Per farli cambiare con lo stile, nel grafo va salvato un nome di ruolo (per esempio `radice`, `area-1`, `area-2`, `area-3`, `neutro`) e il colore si risolve dallo stile attivo. Le mappe già salvate si convertono con una tabella esadecimale → ruolo alla lettura.
- **Forma dei nodi.** Corsia: capsule morbide senza bordo, archi dritti. Evidenziatore: contorno 2px, ombra netta spostata, archi a gomito (`smoothstep` di React Flow). Basta una classe sul nodo letta dallo stile attivo.
- **Dove si sceglie.** In Impostazioni, con due anteprime cliccabili, più un selettore rapido nella barra dell'app.
- **Dove si salva.** In un cookie, così il server mette subito `data-style` giusto nell'HTML ed evita il lampo di stile sbagliato al caricamento; opzionale anche una colonna su `profiles` per ritrovarlo su un altro dispositivo.
- **Export.** PNG e PDF usano lo stile attivo al momento dell'export.
- **Landing.** Usa lo stile predefinito (Corsia); gli esempi sono disegnati in `src/components/landing/`.
- **Verifica.** Contrasto AA in tutte e quattro le combinazioni, compresi i colori dei nodi in dark.

## Dock di studio (ispirato a Cooldock)

Pagina visiva: https://claude.ai/artifact/Y3T7oyiyX1PmUBdbtkxyj2 (privata). Riferimento: [Cooldock](https://dock.cool), Awwwards Honorable Mention luglio 2026; ripresa solo l'idea dei widget compatti, nessun asset o testo.

**Cos'è.** Una barra scura con riquadri piccoli e arrotondati, ognuno con un solo dato leggibile al volo. Sta nella home, sotto un titolo grande ("Oggi ripassi Farmacologia.") con un unico bottone a pillola ("Inizia il ripasso"). Su mobile i riquadri vanno a capo.

**Riquadri.**

| Riquadro | Dati | Disponibile |
|---|---|---|
| Anello di avanzamento del mazzo | % di carte "so" | oggi (risultati del ripasso) |
| Carte da ripassare oggi | conteggio | con la ripetizione dilazionata (Fase 2) |
| Giorni all'esame | data dell'esame | serve un campo "data esame" (nuovo) |
| Timer di studio | 25 minuti, avvio e pausa | solo lato client, subito |
| Riprendi | ultima mappa aperta | oggi (ultima mappa modificata) |
| Generazioni AI | usate / limite del mese | oggi (`quota_counters`) |

**Tre varianti**, tutte con contrasto AA in chiaro e scuro:

- **Corsia**: dock `#0f1b2d` (scuro `#060b12`), riquadri `#1b2b45` / `#16233a`, testo `#e6edf7`, secondario `#a9b6c8`, accento `#7fb0ff`; titoli Lexend.
- **Evidenziatore**: dock nero, riquadri pieni giallo / menta / lilla / corallo con testo `#121212`; in scuro il dock prende un contorno chiaro `#f4f2ea`; titoli Bricolage Grotesque 800.
- **Evidenziatore calmo** (la più vicina a Cooldock): fondo chiaro sfumato `#f1f2ee` → `#dde3dc` (scuro `#1a1b1e` → `#0f1012`), dock in vetro quasi pieno `rgba(20,20,22,.94)`, riquadri `#2a2a30`, testo `#f4f2ea`, accento giallo `#ffe45c` solo su anello e timer. I colori pieni dell'evidenziatore restano sui nodi della mappa.

Il vetro del dock va tenuto quasi opaco: con uno sfondo trasparente il contrasto del testo scenderebbe sotto AA.

Decisione: restano i due stili Corsia ed Evidenziatore, e il dock è un componente comune che prende i colori dello stile attivo. "Evidenziatore calmo" non si implementa.

## Regole comuni, qualunque sia la scelta

- Testo corrente mai sotto 16px, interlinea almeno 1,5, righe intorno ai 65 caratteri.
- Colore mai come unico segnale: l'argomento del nodo ha anche linguetta, simbolo o etichetta.
- Etichetta del nodo con colore calcolato per il contrasto (già fatto in `textColorFor`).
- Animazioni brevi e disattivate con `prefers-reduced-motion`.
- Tutti i colori come token in `src/app/globals.css` e `NODE_COLORS` in `src/core/graph.ts`.

## Limiti

Il server awwwards non pubblica palette né dati di animazione per i siti in nomination, e il brief automatico (`create_design_brief`) è tornato vuoto per mancanza di dati in cache. I riferimenti sono quindi scelti guardando gli screenshot; le palette sono state costruite a mano e verificate con il calcolo del contrasto WCAG.
