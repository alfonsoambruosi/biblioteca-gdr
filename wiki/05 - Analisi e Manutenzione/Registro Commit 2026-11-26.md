---
title: Registro Commit — 2026-11-26
aliases:
  - Changelog 2026-11-26
  - Commit SteBranch 2026-11-26
type: changelog
tags:
  - biblioteca-gdr
  - changelog
  - commit
  - prestazioni
  - manutenzione
status: completo
updated: 2026-11-26
---

# Registro Commit — 26 Novembre 2026 (`SteBranch`)

Torna a [[00 - Indice (MOC)]] · Correlati: [[Sicurezza, Limiti e Debito Tecnico]], [[Flusso Dati e Cache]], [[Stack e Configurazione]]

> [!info] Scopo di questa pagina
> Diario tecnico di tutti gli interventi svolti nella giornata del **26 novembre 2026** sul branch `SteBranch` (a partire dal commit base `3350707` di `main`). Pensato per permettere a chiunque collabori al progetto di capire **cosa è cambiato, perché è stato fatto e quale beneficio concreto porta**, commit per commit.

---

## Riepilogo rapido dei commit di oggi

| # | Commit | Area | Sintesi | Stato remoto |
|---|---|---|---|---|
| 1 | `09815d3` | Fix CSS | Ripristinato stile visivo su `.term-link` e rimosso `[hidden]` duplicato | Pushato |
| 2 | `34621b4` | Docs | Aggiornato `README.md` con tutte le nuove funzionalità | Pushato |
| 3 | `3451da8` | Fix Build | Aggiunto `"assets": ["src/assets"]` in `angular.json` per copiare gli snapshot | Pushato |
| 4 | `c95c19f` | Wiki | Creata la mini-wiki tecnica Obsidian in `wiki/` (14 note) | Pushato |
| 5 | `5b7ef65` | Perf (Tier 1) | Indice `O(1)` in `LookupService.findEntries()` + cache `spellBook()` | Pushato |
| 6 | `7031dba` | Perf (Tier 1) | Caricamento batch IndexedDB (`getMany`) + persistenza indice `MiniSearch` | Pushato |
| 7 | `7165ec2` | Perf (Tier 1) | Cache LRU del DOM parsato in `LookupService` + espansione formule in parallelo | Pushato |
| 8 | `6315519` | Perf (Tier 1) | Lazy loading rotte (`loadComponent`) + `import()` dinamico di `mammoth` | Pushato |
| 9 | `5dc905f` | Perf (Tier 1) | Mappa sezioni `O(1)`, titoli pre-normalizzati in ricerca e debounce sui filtri | Pushato |
| 10 | `76d73be` | Perf (Tier 2) | Sfondo fisso su layer GPU (`body::before`), immagini `loading="lazy"` e `content-visibility` su tabelle | Pushato |
| 11 | `1fc89ed` | Perf (Tier 2) | Abilitato `ChangeDetectionStrategy.OnPush` su tutti gli 11 componenti | Pushato |
| 12 | `be9a305` | Perf (Tier 2) | Indice per prima parola in `term-links.ts` + `linkNames()` asincrono a chunk per frame | Pushato |
| 13 | `139951d` | Perf (Tier 3) | Compressione automatica WebP (max 700px, q=65) nelle conversioni `mammoth` | Pushato |
| 14 | `c9dc356` | Perf (Tier 3) | Caricamento ed export snapshot divisi: `snapshot-core-*` subito + `snapshot-bestiary-*` in background | Pushato |
| 15 | `7b6f3b1` | Perf (Tier 3) | Ricompressione immagini snapshot (WebP 700px q65) e split in `snapshot-core-1..2` + `snapshot-bestiary-1..8` | Pushato |

### Risultato misurato complessivo (Tier 1 + Tier 2 + Tier 3)

| Metrica | Prima (`3350707`) | Dopo tutti gli interventi | Miglioramento |
|---|---:|---:|---:|
| **Bundle iniziale (raw)** | `788.10 kB` | `375.34 kB` | **-52,4%** |
| **Bundle iniziale (transfer)** | `199.33 kB` | `105.28 kB` | **-47,2%** |
| **Tempo di build** | `4.36 s` | `2.15 s` | **-50,7%** |
| **Peso totale snapshot** | `158.96 MB` (12 file) | `121.33 MB` (10 file) | **-23,7% (-37,6 MB)** |
| **Snapshot attesi al primo login** | `158.96 MB` (tutti) | `15.20 MB` (solo Core; Bestiario in background) | **-90,4%** |
| **Snapshot nel `dist/`** | Assenti (bug `angular.json`) | Copiati in `dist/.../assets/` | **Risolto** |

---

## Dettaglio commit per commit

### 1. `09815d3` — Fix `.term-link` e pulizia CSS
- **Messaggio:** `Fix .term-link selector and remove duplicate [hidden] rule in styles.css`
- **File modificati:** `src/styles.css` (`+1 / -3`)
- **Problema:** In un commit precedente (`2e3d001`), `DocComponent` era passato da `span.className = 'seed term-link'` a `span.className = 'term-link'`, ma in `src/styles.css` era rimasto il selettore `.seed.term-link`. Risultato: i nomi di feat, talenti e spell auto-collegati nei testi funzionavano al clic ma apparivano come testo normale senza alcun indizio visivo. Inoltre `[hidden] { display: none !important; }` era dichiarato due volte.
- **Modifica:** Cambiato `.seed.term-link` in `.term-link` aggiungendo `color: var(--wax)`, `font-weight: 600`, sottolineatura puntinata e `cursor: pointer`; rimossa la regola `[hidden]` duplicata.
- **Beneficio:** I collegamenti automatici nei documenti sono di nuovo chiaramente riconoscibili come cliccabili.

---

### 2. `34621b4` — Aggiornamento `README.md`
- **Messaggio:** `Update README with latest features and project structure`
- **File modificati:** `README.md` (`+77 / -44`)
- **Problema:** Il `README.md` descriveva una versione più vecchia dell'app (3 categorie fisse, nessuna menzione del calcolatore oggetti, della ricerca nel Bestiario, dei `term-links`, del pannello ridimensionabile e degli snapshot).
- **Modifica:** Documentate tutte le funzionalità correnti, inclusa una sezione dedicata a **Creazione oggetti magici** (`/oggetti`, 182 preset, 37 composti, numen/gp e scorta privata `×18`), la separazione tra ricerca globale e ricerca Bestiario, i collegamenti automatici nei testi, l'indice laterale, gli snapshot e la struttura completa di `src/`.
- **Beneficio:** Documentazione d'ingresso allineata allo stato reale del progetto.

---

### 3. `3451da8` — Copia automatica di `src/assets` nel build
- **Messaggio:** `Include src/assets in angular.json build options for snapshot files`
- **File modificati:** `angular.json` (`+1`)
- **Problema:** In `angular.json` mancava l'opzione `"assets": ["src/assets"]`. Gli sfondi pergamena venivano comunque inclusi perché referenziati via CSS (`url(...)`), ma i 12 file `snapshot-1..12.jsonl` caricati a runtime via `fetch('assets/snapshot-N.jsonl')` **non venivano copiati** nella cartella pubblicata `dist/biblioteca-gdr/browser/assets/`.
- **Modifica:** Aggiunto `"assets": ["src/assets"]` nelle `options` del target `build`.
- **Beneficio:** La copia precompilata per il caricamento rapido funziona realmente in produzione su GitHub Pages e Netlify.

---

### 4. `c95c19f` — Mini-wiki tecnica Obsidian
- **Messaggio:** `Add Obsidian technical mini-wiki in wiki/`
- **File modificati:** 14 nuovi file in `wiki/` (`+1475` righe)
- **Problema:** Non esisteva una documentazione tecnica strutturata e consultabile di architettura, flussi dati, modelli, parser, calcolatore e debito tecnico.
- **Modifica:** Creata la cartella `wiki/` apribile direttamente come vault Obsidian con YAML frontmatter, MOC centrale ([[00 - Indice (MOC)]]), wikilink bidirezionali, callout e diagrammi Mermaid che coprono ogni singolo file del repository.
- **Beneficio:** Consultazione rapida in futuro e onboarding immediato per nuovi collaboratori.

---

### 5. `5b7ef65` — Indice `O(1)` in `LookupService` e cache `spellBook()`
- **Messaggio:** `Perf: index LookupService.findEntries in O(1) and memoize spellBook`
- **File modificati:** `src/app/lookup.service.ts` (`+56 / -7`)
- **Problema:**
  - `findEntries(term)` scansionava linearmente tutte le **6.704 sezioni** ricalcolando `normTerm()` e `tokenKey()` (regex + split + sort) a ogni chiamata.
  - All'apertura di `/incantesimi`, `SpellbookComponent` chiama `findEntries()` per tutti i 332 `ROGUE_TRICKS`: oltre **2,2 milioni** di invocazioni regex/sort!
  - `spellBook()` ricalcolava l'intera mappa delle spell da zero ogni volta che veniva chiamato da `SpellbookComponent` o `ItemCalcComponent`.
- **Modifica:** Introdotto un indice memoizzato su `library.version()` (`byNorm` e `byToken`, pre-ordinato per `level`), riducendo `findEntries()` da `O(N)` a `O(1)`, e memoizzato `spellBook()` sullo stesso segnale `version`.
- **Beneficio:** Apertura quasi istantanea di `/incantesimi`, `/oggetti` e risoluzione rapidissima di formule e termini.

---

### 6. `7031dba` — Batch IndexedDB (`getMany`) e persistenza indice `MiniSearch`
- **Messaggio:** `Perf: batch IndexedDB cache load with getMany and persist MiniSearch index`
- **File modificati:** `src/app/library.service.ts` (`+115 / -22`)
- **Problema:**
  - All'avvio/refresh, `loadCache()` eseguiva **636 `await get('meta:...')` in sequenza** (una transazione IndexedDB per documento) e poi ricostruiva da zero l'intero indice full-text `MiniSearch` su 6.704 sezioni (~10 MB di testo) bloccando il main thread.
  - Esisteva anche una potenziale race condition: impostando `cacheLoaded = true` prima degli `await`, una seconda chiamata concorrente a `loadCache()` rientrava prima che la cache fosse davvero caricata.
- **Modifica:**
  - Sostituite le letture singole con due sole chiamate `getMany()` (metadati globali + tutti i `meta:*` in un'unica transazione).
  - Salvato l'indice `MiniSearch` in IndexedDB (`searchIndex`) via `ms.toJSON()` con firma di validazione (`sig` su ID, `modifiedTime`, `parser`, numero sezioni) e ripristino asincrono non bloccante tramite `MiniSearch.loadJSAsync()`.
  - Salvataggio differito con debounce (`scheduleSaveIndex`) e flush al termine di `importSnapshot()` / `finishCheck()`.
  - Sostituito `cacheLoaded` con `cachePromise` condivisa.
- **Beneficio:** Avvio e refresh della pagina drasticamente più veloci e fluidi, senza blocchi del main thread.

---

### 7. `7165ec2` — Cache LRU del DOM parsato ed espansione parallela delle formule
- **Messaggio:** `Perf: cache parsed DOM in LookupService and parallelize formula expansion`
- **File modificati:** `src/app/doc-parser.ts`, `src/app/lookup.service.ts`, `src/app/doc.component.ts` (`+63 / -23`)
- **Problema:**
  - Cliccando un componente di formula o un `.term-link` che puntava a `Ch 8 + 8a` (**5,6 MB di HTML**), `entryHtml()` leggeva 5,6 MB da IndexedDB e faceva `DOMParser.parseFromString()` sull'intero documento ogni volta.
  - Premendo *"Mostra la descrizione di ogni componente"* su una formula con 5–6 componenti, l'operazione veniva ripetuta **in sequenza** (5–6× lettura + parsing completo = ~30 MB parsati sul main thread).
  - Inoltre `sliceSection()` eseguiva un secondo `DOMParser` sul frammento estratto.
- **Modifica:**
  - Aggiunta `sliceSectionFromDoc(dom, anchor)` in `doc-parser.ts` che usa `cloneNode(true)` evitando il secondo `DOMParser`.
  - Introdotta in `LookupService` una cache LRU di massimo 6 `Document` già parsati (`domCache`, invalidata automaticamente se cambia `modifiedTime`/`parser`) + mappa `domInflight` per deduplicare richieste concorrenti sullo stesso documento.
  - Parallelizzate le chiamate in `LookupService.render()` e nell'espansione formule di `DocComponent` con `Promise.all()`.
- **Beneficio:** Espandere formule complesse o cliccare più termini consecutivi nello stesso manuale non rilegge né riparsa più i 5,6 MB del documento.

---

### 8. `6315519` — Lazy loading delle rotte e `import()` dinamico di `mammoth`
- **Messaggio:** `Perf: lazy-load route components and dynamically import mammoth`
- **File modificati:** `src/app/app.routes.ts`, `src/app/library.service.ts` (`+10 / -14`)
- **Problema:**
  - `mammoth` (+ `jszip`, `sax`, `bluebird`, `xmlbuilder`, `underscore`: **306 kB raw**) veniva importato in modo statico all'avvio anche se serve **solo** quando si scarica un `.docx`/Google Doc modificato dal Drive.
  - Tutte le rotte erano caricate *eager* (`component:`), includendo nel bundle iniziale anche i 73 kB di `ItemCalcComponent` + 182 preset e i 24 kB di `SpellbookComponent` + `extra-lists.ts`.
- **Modifica:**
  - Spostato `mammoth/mammoth.browser` a `import()` dinamico dentro `LibraryService.fetchHtml()` (eseguito in parallelo al download binario del file).
  - Convertite le rotte secondarie (`/accesso`, `/cartella/:id`, `/doc/:id`, `/cerca`, `/incantesimi`, `/oggetti`) a `loadComponent: () => import(...)`, mantenendo eager solo `ShellComponent` e `HomeComponent`.
- **Beneficio:** Bundle iniziale ridotto da **788.10 kB → 372.41 kB (-52,7%)** e transfer iniziale da **199.33 kB → 104.37 kB (-47,6%)**.

---

### 9. `5dc905f` — Ottimizzazione ricerca e debounce sui filtri live
- **Messaggio:** `Perf: optimize search with O(1) section maps, cached headings, and debounced filters`
- **File modificati:** `src/app/library.service.ts`, `src/app/bestiary-search.component.ts`, `src/app/spellbook.component.ts`, `src/app/item-calc.component.ts` (`+139 / -36`)
- **Problema:**
  - Durante `search()`, per ogni risultato di `MiniSearch` si eseguiva `m.sections.find(s => s.id === anchor)` (scansione lineare fino a 3.745 elementi su `Ch 8 + 8a`), si ri-normalizzavano tutti i 6.704 titoli a ogni ricerca, si compilavano nuove `RegExp` in `snippet()` per ogni singolo hit e si generavano snippet anche oltre `limit`.
  - Nei filtri live (`BestiarySearchComponent`, `SpellbookComponent`, `ItemCalcComponent`) la ricerca/filtraggio scattava a ogni singola pressione di tasto senza debounce.
- **Modifica:**
  - Aggiunta mappa `sectionMaps` (`docId -> Map<sectionId, Section>`) per lookup `O(1)`.
  - Aggiunta cache `headingCache` (pre-calcola `normTerm` e `isBestiary` una volta per `version`).
  - Pre-compilate le `RegExp` per `<mark>` una sola volta per query + uscita anticipata dal loop appena raggiunto `limit`.
  - Aggiunto debounce (`150 ms` sul Bestiario, `120 ms` su Spellbook e Calcolatore) con pulizia su `DestroyRef` e azzeramento immediato quando il campo viene svuotato.
- **Beneficio:** Digitazione fluida senza scatti anche su smartphone e ricerche sensibilmente più rapide.

---

### 10. `76d73be` — Scroll CSS, immagini lazy e `content-visibility` su tabelle
- **Messaggio:** `Perf: optimize fixed background scroll, lazy image decoding, and table content-visibility`
- **File modificati:** `src/styles.css`, `src/app/doc-parser.ts`, `src/app/doc.component.ts` (`+15 / -6`)
- **Problema:**
  - `background-attachment: fixed` su `body` (combinato con `backdrop-filter: blur` sulla top bar) causava repaint pesanti durante lo scroll su mobile.
  - Tutte le immagini `<img>` (incluse decine di immagini base64 nei capitoli lunghi) venivano decodificate subito all'apertura del documento anche se fuori viewport.
  - Le tabelle lunghe fuori schermo pesavano sul layout iniziale del documento.
- **Modifica:**
  - Spostata l'immagine pergamena sul layer fisso `body::before` (`position: fixed` + `will-change: transform`) insieme alla vignettatura, lasciando `body` con sfondo solido.
  - Aggiunti `loading="lazy" decoding="async"` sulle `<img>` sia in `enrichHtml()` (nuove sincronizzazioni) sia in `DocComponent.load()` (effetto immediato anche sui 636 documenti già negli snapshot, senza rigenerarli).
  - Applicato `content-visibility: auto; contain-intrinsic-size: auto 10rem;` a `.content .tbl`.
- **Beneficio:** Scroll più fluido a 60 fps e apertura più rapida dei documenti ricchi di illustrazioni e tabelle.

---

### 11. `1fc89ed` — `ChangeDetectionStrategy.OnPush` su tutti i componenti
- **Messaggio:** `Perf: enable ChangeDetectionStrategy.OnPush on all signal-based components`
- **File modificati:** tutti gli 11 `*.component.ts` in `src/app/` (`+22 / -11`)
- **Problema:** Con la strategia di default di Angular, qualsiasi evento del browser (inclusi decine di `pointermove` al secondo durante il ridimensionamento del pannello inferiore in `DocComponent`, o la digitazione nei campi di ricerca) controllava l'intero albero dei componenti.
- **Modifica:** Attivato `ChangeDetectionStrategy.OnPush` su tutti gli 11 componenti (già completamente basati su Signals, `computed()`, `input()` ed eventi template).
- **Beneficio:** Angular ri-renderizza solo il singolo componente il cui segnale cambia davvero, riducendo l'overhead CPU durante interazioni frequenti.

---

### 12. `be9a305` — Indice per prima parola in `term-links.ts` e `linkNames()` a chunk per frame
- **Messaggio:** `Perf: index term-links by first word and time-slice linkNames across animation frames`
- **File modificati:** `src/app/term-links.ts`, `src/app/doc.component.ts` (`+73 / -32`)
- **Problema:**
  - `splitTerms()` testava fino a 10 finestre di lunghezza (con `slice` e regex `termKey`) su **ogni singola parola** del testo, anche sulle parole comuni che non iniziano alcuna voce della biblioteca.
  - `DocComponent.linkNames()` elaborava tutti i nodi di testo in un unico ciclo sincrono bloccando scroll e clic all'apertura di documenti molto grandi (come `Ch 8 + 8a` da 5,6 MB).
- **Modifica:**
  - Aggiunta `firstWordMax: Map<string, number>` in `TermMap` / `buildTermMap()`: le parole che non aprono alcun termine vengono saltate in `O(1)` e per `k === 1` si usa direttamente il token già in minuscolo senza `slice`/`replace`.
  - Trasformato `DocComponent.linkNames()` in un elaboratore incrementale con budget di **10 ms per frame** (`requestAnimationFrame`), cancellato automaticamente (`cancelLinkNames()`) al cambio documento o distruzione del componente (`DestroyRef`).
- **Beneficio:** Apertura e scorrimento immediati anche sui capitoli da 5+ MB, con auto-linking 5–10× più veloce e mai bloccante.

---

### 13. `139951d` — Compressione WebP automatica in `mammoth`
- **Messaggio:** `Perf: compress embedded docx images to WebP during mammoth conversion`
- **File modificati:** `src/app/image-compress.ts` (nuovo), `src/typings.d.ts`, `src/app/library.service.ts` (`+88 / -3`)
- **Problema:** Quando `mammoth` converte un `.docx` o Google Doc aggiornato da Google Drive, incorpora le immagini in base64 nel formato grezzo originale (spesso PNG da più MB), gonfiando IndexedDB e gli snapshot esportati.
- **Modifica:** Creato `compressImageToDataUri()` (`OffscreenCanvas` / `<canvas>`, max `700 px`, `image/webp` qualità `0.65`, mantiene sempre il più piccolo tra originale e compresso) e collegato a `mammoth.images.imgElement(...)` dentro `LibraryService.fetchHtml()`.
- **Beneficio:** Tutti i futuri documenti sincronizzati dal Drive mantengono dimensioni compatte in cache e negli snapshot.

---

### 14. `c9dc356` — Snapshot separati Core-first + Bestiario in background
- **Messaggio:** `Perf: split snapshot loading/export into core-first and background bestiary`
- **File modificati:** `src/app/library.service.ts`, `src/app/shell.component.ts` (`+103 / -38`)
- **Problema:** Al primo accesso su un dispositivo nuovo, l'app attendeva il download sequenziale di tutti i 151 MB di snapshot (di cui 135 MB solo Bestiario) prima di completare il login.
- **Modifica:**
  - `importSnapshot()` ora carica prima `assets/snapshot-core-1..N.jsonl` (regole, classi, feat, skill, incantesimi, equipaggiamento — sbloccando subito il login) e avvia `assets/snapshot-bestiary-1..N.jsonl` in background con stato visibile nella barra `.sync` (`bestiaryStatus`), mantenendo il fallback automatico al vecchio formato `snapshot-N.jsonl`.
  - `checkTree()` coordina il download dei file stale col Bestiario in caricamento per evitare download duplicati dal Drive.
  - `exportSnapshot()` genera direttamente le due serie separate `snapshot-core-N.jsonl` e `snapshot-bestiary-N.jsonl`.
- **Beneficio:** Primo accesso quasi immediato con tutte le regole pronte in pochi secondi, mentre il Bestiario si popola silenziosamente in background.

---

### 15. `7b6f3b1` — Ricompressione immagini e split degli snapshot in `src/assets/`
- **Messaggio:** `Perf: recompress snapshot images to WebP (700px q65) and split into core/bestiary files`
- **File modificati:** rimossi `src/assets/snapshot-1..12.jsonl`, aggiunti `src/assets/snapshot-core-1..2.jsonl` e `src/assets/snapshot-bestiary-1..8.jsonl` (636 documenti verificati)
- **Problema:** I 12 snapshot originali pesavano **158,96 MB** complessivi e mischiavano i 7 documenti di regole core con le 629 schede del Bestiario.
- **Modifica:**
  - Ricompresse tutte le immagini raster incorporate a `max 700 px` WebP qualità `65` (mantenendo sempre il più piccolo tra originale e compresso) e aggiunti `loading="lazy" decoding="async"` ai tag `<img>`.
  - Separati i 636 documenti in:
    - **Core (7 doc):** `snapshot-core-1.jsonl` (14,30 MB) + `snapshot-core-2.jsonl` (0,90 MB) = **15,20 MB**
    - **Bestiario (629 doc):** `snapshot-bestiary-1..8.jsonl` = **106,13 MB**
- **Beneficio:** Peso totale ridotto da **158,96 MB → 121,33 MB (-23,7%)** e dati bloccanti al primo login ridotti del **90,4%** (da 158,96 MB a 15,20 MB).

---

## Riepilogo stato interventi di oggi

- [x] **Tier 1 (Commit 5–9):** `LookupService` O(1), `getMany` + `MiniSearch` persistente, cache LRU DOM + `Promise.all`, lazy loading rotte + `mammoth` dinamico, ottimizzazione ricerca + debounce filtri.
- [x] **Tier 2 (Commit 10–12):** scroll CSS GPU + `loading="lazy"` + `content-visibility`, `OnPush` su tutti i componenti, `term-links` indicizzato + `linkNames()` a chunk per frame.
- [x] **Tier 3 (Commit 13–15):** compressione automatica WebP in `mammoth`, split Core/Bestiario in `LibraryService`, rigenerazione e compressione degli snapshot in `src/assets/`.
