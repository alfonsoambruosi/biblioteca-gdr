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
| 16 | `7ae8c05` | Docs | Aggiunto registro commit giornaliero e aggiornata la wiki Obsidian | Pushato |
| 17 | `63faf28` | Fix (QA) | Gestito fallback `200 text/html` in `importSeries()`, `try/finally` su login e titoli rotte | Pushato |
| 18 | `1805187` | Perf (QA) | `IntersectionObserver` per `linkNames()` su documenti lunghi + `content-visibility: auto` su `.content > p` | Pushato |
| 19 | `cf8e3ec` | Feature | Aggiunta voce metamagica editoriale `Effect-Specific Spell [Metamagic]` con esempi e Editor's Note | Pushato |
| 20 | `a2c2bda` | Docs | Aggiornato registro commit con fix QA e `Effect-Specific Spell` | Pushato |
| 21 | `ee262bc` | Docs | Aggiunte proposte refactoring `custom-entries` e `Ch 8+8a` nelle evoluzioni future | Pushato |
| 22 | `af65b85` | Feature | Nuovo Bestiario filtrabile (`/bestiario`) con barra CR a doppio cursore, filtri ordinati, A–Z e vista cartelle | Pushato |
| 23 | `c575723` | Feature | Generatore di incontri casuali nel Bestiario con difficoltà DOOM (`−1..+5`, *I'm just a baby boy* → *Dante Must Die*) | Pushato |
| 24 | `c11340c` | UX | Persistenza stato Bestiario/Incontro (`BestiaryStateService`), sync `<select>` e pulsante *← Torna* in `DocComponent` | Pushato |
| 25 | `fa0be28` | UX | Sessione in `localStorage` tra schede + fix race condition `loadCache()`/`getHtml()` all'apertura diretta di `/doc/:id` | Pushato |
| 26 | `c47a005` | Feature | Espansione per singola creatura (`~2.080` voci) + regex CR a fine riga + link diretti `#s-N` + ricerca per nome | Pushato |
| 27 | `46e82b3` | Docs | Aggiornato registro commit con Bestiario, generatore incontri e auth multi-tab | Pushato |
| 28 | `5694864` | Fix | Prevenzione race condition su caricamento documenti, pannello lookup ed espansione formule | Locale |
| 29 | `be71908` | CI | Aggiunto `package-lock.json`, passaggio a `npm ci` e validazione `DRIVE_API_KEY` in GitHub Actions | Locale |
| 30 | `746cbb1` | Feature | Schede personaggio Google Sheets incorporate (`/scheda/:id`), default *Solo lettura*, *Modifica* e checkbox *Mostra menu* | Locale |
| 31 | `59ea1a3` | Docs | Aggiornata wiki per schede Google Sheets incorporate e registro commit | Locale |
| 32 | `74218b3` | Fix | Calcolatore oggetti magici (`/oggetti`): livello finale `0` (trucchetti) valutato `0,5` nel calcolo del costo | Locale |
| 33 | `3be8d9a` | Docs | Aggiornata wiki per pricing `0,5` dei trucchetti di livello 0 e registro commit | Locale |
| 34 | `3f156f6` | Docs | Riallineate pagine wiki tecniche con CI workflow, `package-lock.json` e guardie race condition di `DocComponent` | Locale |
| 35 | `d52912c` | Refactor | Rimossa logica `availableLetters` / `[disabled]` dalla barra alfabetica A–Z del Bestiario (tutte le 27 lettere sono presenti) | Locale |

### Risultato misurato complessivo (inclusi Bestiario e Schede)

| Metrica | Prima (`3350707`) | Dopo tutti gli interventi (`d52912c`) | Miglioramento |
|---|---:|---:|---:|
| **Bundle iniziale (raw)** | `788.10 kB` | `384.66 kB` | **-51,2%** |
| **Bundle iniziale (transfer)** | `199.33 kB` | `107.41 kB` | **-46,1%** |
| **Tempo di build** | `4.36 s` | `2.42 s` | **-44,5%** |
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

### 16. `7ae8c05` — Aggiornamento wiki Obsidian e registro commit
- **Messaggio:** `Docs: add daily commit log and update Obsidian wiki for Tier 1-3 optimizations`
- **File modificati:** `wiki/00 - Indice (MOC).md`, `wiki/01 - Architettura/Flusso Dati e Cache.md`, `wiki/01 - Architettura/Stile e Assets.md`, `wiki/05 - Analisi e Manutenzione/Registro Commit 2026-11-26.md`
- **Modifica:** Creato il diario tecnico dei commit del 26/11 e aggiornate le note su cache, snapshot divisi e dimensioni asset.

---

### 17. `63faf28` — Fix fallback HTML negli snapshot, `try/finally` al login e titoli rotte (trovato dal QA locale)
- **Messaggio:** `Fix: handle SPA HTML fallback in snapshot import, guard login busy state, and set route titles`
- **File modificati:** `src/app/library.service.ts`, `src/app/login.component.ts`, `src/app/app.routes.ts` (`+36 / -20`)
- **Problema:** Durante il test E2E su `http://localhost:4200/`, la richiesta alla partizione successiva inesistente (`snapshot-core-3.jsonl`) riceveva dal dev server SPA `HTTP 200 text/html` (`index.html`) invece di `404`, causando `SyntaxError` in `JSON.parse`, bloccando il login su *"Attendere…"* e impedendo l'avvio del Bestiario in background. Inoltre `document.title` restava fermo su *"Accesso · Biblioteca GDR"*.
- **Modifica:** Controllo esplicito `content-type` (`text/html` → fine serie) + `try/catch` su `JSON.parse` in `importSeries()`, `try/finally` su `LoginComponent.submit()` e `title` configurato su tutte le rotte in `app.routes.ts`.
- **Beneficio:** Login, import `snapshot-core-*` e import in background `snapshot-bestiary-*` completano senza alcun errore anche su dev server e hosting SPA con fallback HTML.

---

### 18. `1805187` — `IntersectionObserver` per `linkNames()` e `content-visibility` su paragrafi (trovato dal QA locale)
- **Messaggio:** `Perf: use IntersectionObserver for term-links and content-visibility on long documents`
- **File modificati:** `src/app/doc.component.ts`, `src/styles.css` (`+60 / -18`)
- **Problema:** Su `Ch 8 + 8a - Spells e Spells Grimoire` (5,6 MB), `linkNames()` creava subito 5.215 `.term-link` in tutto il documento anche fuori schermo.
- **Modifica:** Sui documenti con > 80 blocchi, `linkNames()` usa `IntersectionObserver` (`rootMargin: '600px 0px'`) collegando solo i blocchi visibili (ridotti da **5.215 → 63** all'apertura di `Ch 8 + 8a`), più `content-visibility: auto` su `.content > p, ul, ol`.
- **Beneficio:** Taglio del 98,8% delle mutazioni DOM all'apertura di `Ch 8 + 8a`.

---

### 19. `cf8e3ec` — Voce metamagica editoriale `Effect-Specific Spell [Metamagic]`
- **Messaggio:** `Add custom metamagic entry for Effect-Specific Spell with examples and editor note`
- **File modificati:** `src/app/custom-entries.ts` (nuovo), `src/app/lookup.service.ts`, `src/app/library.service.ts`, `src/app/item-calc.component.ts` (`+117`)
- **Problema:** `Effect-Specific Spell` compare in decine di formule di `Ch 8 + 8a` ma non ha una sezione propria nei documenti del Drive, quindi cliccandoci non compariva alcuna descrizione dedicata.
- **Modifica:** Creato il registro estensibile `src/app/custom-entries.ts` (indipendente dal Drive e dagli snapshot, così non viene mai sovrascritto) con `Effect-Specific Spell [Metamagic]` nello stile di `Creature-Specific Spell` (`Prerequisite`, `Benefit` con esempi reali da *Illusory Wall*, *Divine Favor* e *Zone of Truth*, `Metamagic Cost: -1 to -2 levels`, `Special` ed *Editor's Note* in inglese). Integrato in `LookupService`, `LibraryService` (auto-linking, ricerca globale e documento virtuale `site:custom-metamagic`) e nel calcolatore `/oggetti` (Metamagia con `-2 livelli`).
- **Beneficio:** Cliccando `Effect-Specific Spell` in qualsiasi formula, testo, ricerca o calcolatore compare subito la sua scheda completa.

---

### 20. `a2c2bda` — Aggiornamento registro commit (fix QA e `Effect-Specific Spell`)
- **Messaggio:** `Docs: update daily commit log with QA fixes and Effect-Specific Spell`
- **File modificati:** `wiki/05 - Analisi e Manutenzione/Registro Commit 2026-11-26.md`
- **Modifica:** Documentati nel diario giornaliero i commit `63faf28`, `1805187` e `cf8e3ec`.

---

### 21. `ee262bc` — Note evolutive su `custom-entries` e `Ch 8+8a`
- **Messaggio:** `Docs: note future refactoring for custom-entries and Ch 8+8a rendering in wiki`
- **File modificati:** `wiki/05 - Analisi e Manutenzione/Sicurezza, Limiti e Debito Tecnico.md`
- **Modifica:** Aggiunti nella checklist di evoluzione futura il mini-refactoring di `custom-entries.ts` e il rendering/paginazione on-demand per capitoli molto lunghi come `Ch 8 + 8a`.

---

### 22. `af65b85` — Nuovo Bestiario filtrabile (`/bestiario`) con barra CR a doppio cursore
- **Messaggio:** `Feature: add filterable Bestiary explorer (/bestiario) with CR range slider, ordered filters, A-Z, and folder view`
- **File modificati:** `src/app/bestiary-index.ts`, `src/app/bestiary.component.ts`, `src/app/app.routes.ts`, `src/app/home.component.ts`, `src/app/folder.component.ts`, `src/styles.css` (`+755`)
- **Modifica:** Nuova pagina lazy `/bestiario` con card dedicata in Home, link rapido da `Manuale › Bestiary`, switch **Catalogo filtrabile / Per cartelle**, filtri ordinati (`Ordina per` → `Tipo` / `Sottocategoria` → `Ambiente` → `Taglia` → barra `Grado di Sfida (CR)` a doppio cursore `1/8`–`30+`), barra alfabetica A–Z, badge CR e paginazione incrementale.

---

### 23. `c575723` — Generatore di incontri casuali nel Bestiario con livelli DOOM
- **Messaggio:** `Feature: add random encounter generator tab to Bestiary with DOOM difficulty tiers (-1 to +5)`
- **File modificati:** `src/app/encounter-gen.ts`, `src/app/bestiary.component.ts`, `src/styles.css` (`+582 / -2`)
- **Modifica:** Aggiunta la scheda **Generatore incontri** tra *Catalogo filtrabile* e *Per cartelle* con motore XP Pathfinder 1e/3.5 basato su numero giocatori (`1–12`), livello medio (`1–20`), 7 difficoltà (`I'm just a baby boy` `−1`, `I'm Too Young to Die` `+0`, `Hey, Not Too Rough` `+1`, `Hurt Me Plenty` `+2`, `Ultra-Violence` `+3`, `Nightmare!` `+4`, `Dante Must Die` `+5`), composizioni (`Casuale`, `Boss singolo`, `Piccolo gruppo`, `Boss + gregari`, `Orda`), filtri creatura, pulsanti `−`/`+` e **Cambia** per singolo slot.

---

### 24. `c11340c` — Persistenza stato Bestiario/Incontro e pulsante *Torna* nelle schede
- **Messaggio:** `UX: persist Bestiary and generated encounter state across navigation and add back button in doc view`
- **File modificati:** `src/app/bestiary-state.service.ts`, `src/app/bestiary.component.ts`, `src/app/doc.component.ts`, `src/styles.css` (`+109 / -56`)
- **Modifica:** Stato completo di Catalogo e Generatore salvato in `BestiaryStateService`, sincronizzazione `[selected]` sulle `<option>` di tutti i `<select>`, default difficoltà `Hey, Not Too Rough (+1)` e pulsante contestuale **← Torna all’incontro generato** / **← Torna al Bestiario** in cima a `DocComponent`.

---

### 25. `fa0be28` — Sessione condivisa tra schede (`localStorage`) e fix race condition
- **Messaggio:** `UX: persist auth session in localStorage across tabs and wait for cache before reading docs`
- **File modificati:** `src/app/auth.service.ts`, `src/app/library.service.ts` (`+37 / -12`)
- **Modifica:** Spostata la sessione `bgdr-session` su `localStorage` con sincronizzazione `storage` tra schede; in `LibraryService`, `setTree()` viene chiamato solo dopo il caricamento dei `meta:*` da IndexedDB e `getHtml()` attende `loadCache()` con fallback sicuro alla copia salvata se Drive fallisce o manca la chiave API.

---

### 26. `c47a005` — Espansione per singola creatura, regex CR a fine riga e ricerca per nome
- **Messaggio:** `Feature: expand Bestiary per creature with EOL CR regex, direct anchors, and name-first search`
- **File modificati:** `src/app/bestiary-index.ts`, `src/app/bestiary.component.ts`, `src/app/encounter-gen.ts` (`+189 / -84`)
- **Modifica:** Raffinata la regex CR a fine riga (`/(?:^|\s)CR\s*(\d+(?:\/\d+)?|[½¼⅓⅛])\s*$/gim`), espanse le 629 schede in ~2.080 singole creature con link diretto `#s-N` (e sottotitolo `in <Documento>`), deduplicazione per `docId#anchor` nel Generatore, e ricerca del Catalogo ristretta a nome creatura (in cima) seguita dalle creature in pagine con quel nome.

---

### 27. `46e82b3` — Aggiornamento registro commit (Bestiario, generatore incontri, auth multi-tab)
- **Messaggio:** `Docs: update daily commit log with Bestiary explorer, encounter generator, and multi-tab auth`
- **File modificati:** `wiki/05 - Analisi e Manutenzione/Registro Commit 2026-11-26.md`
- **Modifica:** Documentati nel diario i commit `af65b85`–`c47a005`.

---

### 28. `5694864` — Prevenzione race condition in `DocComponent`
- **Messaggio:** `Fix: prevent race conditions when loading docs, lookup panel, and formulas`
- **File modificati:** `src/app/doc.component.ts` (`+65 / -23`)
- **Modifica:** Protetto il caricamento asincrono di documenti, pannello lookup ed espansione formule contro risposte arrivate fuori ordine in seguito a navigazioni o clic rapidi (`loadRun`, `panelRun`, `linkRun`).

---

### 29. `be71908` — `package-lock.json`, `npm ci` e validazione `DRIVE_API_KEY` in CI
- **Messaggio:** `CI: add package-lock.json, use npm ci, and validate DRIVE_API_KEY`
- **File modificati:** `.github/workflows/pages.yml`, `package-lock.json`, `package.json`
- **Modifica:** Aggiunto il lockfile NPM, configurato `npm ci` nella pipeline GitHub Pages e aggiunta la verifica sulla presenza di `DRIVE_API_KEY` e del segnaposto in `environment.ts` prima del build.

---

### 30. `746cbb1` — Schede personaggio Google Sheets incorporate (`/scheda/:id`)
- **Messaggio:** `Feature: embed Google Sheets character sheets (/scheda/:id) with read-only default and menu toggle`
- **File modificati:** `src/app/sheet.component.ts` (nuovo), `src/app/models.ts`, `src/app/drive.service.ts`, `src/app/lookup.service.ts`, `src/app/folder.component.ts`, `src/app/home.component.ts`, `src/app/app.routes.ts`, `src/styles.css` (`+181 / -8`)
- **Problema:** Le schede personaggio nel Drive (Google Sheets con formule e Apps Script collegati) erano classificate come `'other'` e quindi invisibili nell'app.
- **Modifica:**
  - Aggiunto `NodeKind = 'gsheet'` (`application/vnd.google-apps.spreadsheet`) in `models.ts` e `DriveService.kindOf()` e helper `isSheetNode()` in `LookupService` (incluso in `countFiles()`, escluso da download/indicizzazione).
  - Mostrati i fogli nelle cartelle e in Home con icona `people` e link alla nuova rotta lazy `/scheda/:id`.
  - Creato `SheetComponent` a larghezza piena (`.page:has(.sheet-wrap)`) con iframe Google Sheets, partenza di default in **Solo lettura** (`/preview`), pulsante **Modifica** (`/edit?rm=minimal`), checkbox **Mostra menu** (disabilitata in *Solo lettura*, commuta `/edit` con i menu degli script in *Modifica*) e link **Apri in Google Sheets ↗**.
- **Beneficio:** Le schede personaggio sono consultabili e modificabili direttamente dentro l'app senza rompere formule, trigger né Apps Script collegati.

---

### 31. `59ea1a3` — Aggiornamento wiki per schede Google Sheets
- **Messaggio:** `Docs: update wiki for embedded Google Sheets character sheets and daily commit log`
- **File modificati:** 7 file in `wiki/`
- **Modifica:** Documentata la nuova rotta `/scheda/:id`, `SheetComponent`, `NodeKind = 'gsheet'` e aggiornato il registro commit.

---

### 32. `74218b3` — Livello `0,5` per i trucchetti di livello 0 nel calcolatore oggetti magici
- **Messaggio:** `Fix: treat level 0 cantrips as 0.5 in magic item cost calculation`
- **File modificati:** `src/app/item-calc.ts`, `src/app/item-calc.component.ts` (`+19 / -8`)
- **Problema:** Selezionando un trucchetto di livello 0 senza variazioni (o con variazioni che si compensano riportando il livello finale a `0`), `calcItem()` moltiplicava per `0` restituendo `0 numen` invece di applicare la regola del manuale (`0,5`).
- **Modifica:**
  - Introdotto `effectiveLevel = level === 0 ? 0.5 : level` in `calcItem()` (e in `ItemResult`) per il calcolo del totale sia in `numen` sia in `gp`, rimuovendo il workaround `Math.max(total, 25)` sull'alchimia (che a CL 1 × 50 gp ora produce naturalmente `25 gp`).
  - Aggiornata la formula esplicita (`0° livello (vale 0,5)`), l'indicazione in UI `(considerato 0,5 nel calcolo)`, la nota nei parametri e `partValue()` sugli oggetti composti.
  - Verificato che tutti i 182 preset del Compendio in `item-presets.ts` restano pienamente allineati (0 discrepanze).
- **Beneficio:** Gli oggetti magici basati su trucchetti di livello 0 producono il costo corretto coerente con il manuale (es. `Celerity` = 500 numen, arma `Flaming` = 2.000 numen, `Everburning Torch` = 750 numen, pozione di livello 0 = 25 gp).

---

### 33. `3be8d9a` — Aggiornamento wiki per pricing `0,5` dei trucchetti
- **Messaggio:** `Docs: update wiki for level 0 cantrip 0.5 item pricing and commit log`
- **File modificati:** `wiki/02 - Funzionalità/Calcolatore Oggetti Magici.md`, `wiki/03 - Riferimento Tecnico/Modelli Dati.md`, `wiki/05 - Analisi e Manutenzione/Registro Commit 2026-11-26.md`
- **Modifica:** Documentata la regola `effectiveLevel = 0.5` nel calcolatore e nei modelli dati.

---

### 34. `3f156f6` — Allineamento pagine tecniche wiki (CI, `package-lock`, `DocComponent`)
- **Messaggio:** `Docs: align technical wiki pages with CI workflow, package-lock, and DocComponent race-condition guards`
- **File modificati:** 4 pagine in `wiki/`
- **Modifica:** Aggiornati `Stack e Configurazione`, `Setup, Build e Deploy`, `Mappa Completa dei File` e `Navigazione e Lettura Documenti` rispetto al workflow CI e alle guardie di `DocComponent`.

---

### 35. `d52912c` — Rimozione filtro `availableLetters` dalla barra A–Z del Bestiario
- **Messaggio:** `Refactor: remove unused availableLetters disabled filter in Bestiary alpha bar`
- **File modificati:** `src/app/bestiary.component.ts`, `src/styles.css` (`+1 / -10`)
- **Modifica:** Rimossi il segnale `availableLetters`, l'attributo `[disabled]` sui pulsanti `.alpha` e la regola CSS `.alpha:disabled`: con ~2.080 creature estratte tutte le 27 lettere (`A`–`Z` e `#`) sono sempre popolate, semplificando il codice.

---

## Riepilogo stato interventi di oggi

- [x] **Tier 1 (Commit 5–9):** `LookupService` O(1), `getMany` + `MiniSearch` persistente, cache LRU DOM + `Promise.all`, lazy loading rotte + `mammoth` dinamico, ottimizzazione ricerca + debounce filtri.
- [x] **Tier 2 (Commit 10–12):** scroll CSS GPU + `loading="lazy"` + `content-visibility`, `OnPush` su tutti i componenti, `term-links` indicizzato + `linkNames()` a chunk per frame.
- [x] **Tier 3 (Commit 13–15):** compressione automatica WebP in `mammoth`, split Core/Bestiario in `LibraryService`, rigenerazione e compressione degli snapshot in `src/assets/`.
