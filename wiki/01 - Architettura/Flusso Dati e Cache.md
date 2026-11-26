---
title: Flusso Dati e Cache
aliases:
  - Sincronizzazione Drive
  - Snapshot e IndexedDB
  - LibraryService
  - DriveService
type: architecture
tags:
  - biblioteca-gdr
  - architettura
  - google-drive
  - indexeddb
  - snapshot
  - minisearch
status: completo
updated: 2026-11-26
---

# Flusso Dati e Cache

Torna a [[00 - Indice (MOC)]] · Correlati: [[Stack e Configurazione]], [[Parser, Formule Spell e Lookup]], [[Modelli Dati]], [[Setup, Build e Deploy]]

---

## Filosofia offline-first e politica di sincronizzazione

L'app è progettata per minimizzare il traffico verso Google Drive e funzionare anche offline:
1. **All'apertura normale** (`LibraryService.start()`): carica istantaneamente albero, metadati (`getMany`) e indice `MiniSearch` persistito (`searchIndex`) da **IndexedDB** senza contattare Google Drive (fa `verify()` solo se IndexedDB è vuoto). `setTree()` viene chiamato solo dopo aver caricato i `meta:*`, evitando falsi `stale` su schede aperte direttamente su `/doc/:id`.
2. **A login e logout** (`LibraryService.verify()`):
   - Importa eventuali file **snapshot precompilati** in due fasi: `assets/snapshot-core-1..N.jsonl` (atteso subito) + `assets/snapshot-bestiary-1..N.jsonl` (in background), con fallback automatico al formato legacy `assets/snapshot-1..50.jsonl`.
   - Scarica l'elenco aggiornato di cartelle e file da Google Drive (**Fase 1**, attesa da login/logout fino a 15 s).
   - Rimuove dalla cache e dall'indice i file eliminati dal Drive.
   - Avvia in background (**Fase 2**, pool di 2 worker) il download e parsing dei soli file **stale** (nuovi, con `modifiedTime` cambiato, rinominati o letti con una `PARSER_VERSION` precedente), coordinandosi con `bestiaryImporting` per non riscaricare dal Drive schede già presenti nello snapshot del Bestiario.
3. **Durante la consultazione**: nessun polling automatico; se l'utente apre un documento non ancora scaricato o stale, `getHtml(id)` attende `loadCache()` e lo scarica on-demand tramite `sync(node)` (con fallback sicuro alla copia salvata se Drive fallisce o manca la chiave API).

```mermaid
sequenceDiagram
    actor U as Utente
    participant L as Login / Shell
    participant LS as LibraryService
    participant IDB as IndexedDB
    participant S as assets/snapshot-*.jsonl
    participant D as DriveService (API v3)

    U->>L: Login o Logout
    L->>LS: verify() [timeout UI 15s]
    LS->>IDB: loadCache() via getMany (tree, meta:*, lastCheck, searchIndex)
    LS->>S: importSnapshot() (Core subito; Bestiary in background)
    S-->>IDB: setMany(html:*, meta:*, snapshotCoreAt / snapshotBestiaryAt)
    LS->>D: buildTree(driveRootId)
    D-->>LS: TreeNode aggiornato (+ mergeGroups)
    LS->>IDB: set('tree', tree) & del file rimossi
    LS-->>L: Fase 1 completata (sblocca UI)
    par Fase 2 (background, pool=2)
        LS->>D: downloadBinary / downloadText per file stale
        D-->>LS: ArrayBuffer / string
        LS->>LS: import('mammoth') + WebP compress + enrichHtml()
        LS->>IDB: set('html:id'), set('meta:id'), flush searchIndex
        LS->>LS: MiniSearch addAll() + version++
    end
```

---

## `DriveService` (`src/app/drive.service.ts`)

Incapsula tutte le chiamate HTTP verso `https://www.googleapis.com/drive/v3`.

### Controllo concorrenza e retry
- **`MAX_CONCURRENT = 2`**: semaforo interno (`slot()`) con coda FIFO (`waiting[]`) per evitare di saturare banda e quota Google.
- **`RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]`** (backoff esponenziale fino a 5 retry, 31 s totali).
- Condizioni ritentate:
  - Errori di rete (`fetch` reject).
  - HTTP `408`, `429`, `5xx`.
  - HTTP `403` il cui body matcha `/rateLimit|quota/i`.
- Errori `403`/`404` non rate-limit generano un messaggio diagnostico che invita a controllare la condivisione *"Chiunque abbia il link"* e la chiave API.

### Costruzione dell'albero (`buildTree`)
- Esegue `listChildren(folderId)` paginando con `pageSize=1000`, `q="'<id>' in parents and trashed = false"`, `supportsAllDrives=true`, `includeItemsFromAllDrives=true`.
- Classifica i nodi (`kindOf`):
  - `application/vnd.google-apps.folder` → `'folder'`
  - `application/vnd.google-apps.document` → `'gdoc'`
  - `application/vnd.google-apps.spreadsheet` → `'gsheet'` (non scaricato né indicizzato; elencato in cartelle/home e aperto incorporato in `/scheda/:id`)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` o `.docx` → `'docx'`
  - `text/*` o `.md`/`.txt` → `'text'`
  - Tutto il resto → `'other'` (ignorato da indicizzazione e liste documenti)
- Ripulisce i nomi con `displayName()` rimuovendo le estensioni (`.docx`, `.doc`, `.dotx`, `.odt`, `.rtf`, `.pdf`, `.md`, `.txt`, `.xlsx`, `.pptx`, `.gdoc`).
- Applica **`mergeGroups(nodes)`**:
  - Per ogni regola in `environment.mergeGroups`, cerca i file non-cartella nella stessa directory che soddisfano `pattern` (almeno 2 file), li ordina naturalmente (`localeCompare('en', { numeric: true })`) e li sostituisce con un nodo virtuale:
    - `id`: `` `merge:${parts.map(p => p.id).join('+')}` ``
    - `kind`: `'docx'`
    - `modifiedTime`: concatenazione dei `modifiedTime` con `+`
    - `size`: somma numerica delle dimensioni
    - `parts`: array dei `TreeNode` originali
- Ordina ogni cartella mettendo prima le sottocartelle e poi i file, in ordine naturale case-insensitive.

### Download dei contenuti
- **`downloadBinary(node)`**:
  - Se `node.kind === 'gdoc'`: usa `/files/{id}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Altrimenti: `/files/{id}?alt=media&supportsAllDrives=true`
- **`downloadText(node)`**: `/files/{id}?alt=media&supportsAllDrives=true`

---

## `LibraryService` (`src/app/library.service.ts`)

È il cuore dello stato dati dell'intera applicazione.

### Signals pubblici

| Signal | Tipo | Significato |
|---|---|---|
| `tree` | `TreeNode \| null` | Albero corrente della biblioteca |
| `status` | `'idle' \| 'checking' \| 'syncing' \| 'error'` | Stato della sincronizzazione |
| `statusText` | `string` | Messaggio testuale corrente |
| `bestiaryStatus` | `string` | Avanzamento del caricamento in background di `snapshot-bestiary-N.jsonl` |
| `total` / `done` | `number` | Avanzamento download dei file stale |
| `fatalError` | `string` | Errore bloccante di lettura Drive / API key mancante |
| `docErrors` | `Record<string, string>` | Mappa `docId -> errore` per singoli file falliti |
| `version` | `number` | Contatore incrementato a ogni modifica dell'indice (trigger per `computed()` di ricerca, glossario, spellbook, calcolatore) |
| `lastCheck` | `Date \| null` | Timestamp ultima verifica conclusa |
| `exporting` / `exportInfo` | `'idle' \| 'working' \| 'done' \| 'error'` / `string` | Stato dell'esportazione snapshot in Home |

### Pipeline di conversione di un documento (`sync` / `doSync`)
- Deduplica richieste concorrenti sullo stesso documento tramite la mappa `inflight`.
- Supporta sia file singoli che documenti uniti (`node.parts ?? [node]`):
  - Se unito, assegna prefissi di ancora `p0`, `p1`, … e antepone `<h1>Nome parte</h1>`; altrimenti prefisso `s`.
  - Per `docx`/`gdoc`: carica `mammoth/mammoth.browser` via `import()` dinamico in parallelo al download, converte l'`ArrayBuffer` con `mammoth.convertToHtml` usando `STYLE_MAP` (`Title => h1:fresh`, `Subtitle => h2:fresh`) e ricomprime le immagini raster incorporate in WebP (`max 700 px`, `q = 0.65`) tramite `compressImageToDataUri()` (`src/app/image-compress.ts`), poi passa l'HTML a `enrichHtml()` (vedi [[Parser, Formule Spell e Lookup]]).
  - Per `text`: racchiude il testo escapato in `<pre class="plain">...</pre>` e crea una singola sezione `level: 1`.
- Salva in IndexedDB:
  - `html:<docId>` → stringa HTML arricchita
  - `meta:<docId>` → oggetto `DocMeta` (con `parser: PARSER_VERSION` e `sections`)
- Aggiorna l'indice `MiniSearch` (`addToIndex`), pulisce eventuali errori in `docErrors` e incrementa `version`.

### Criterio di invalidazione (`isStale`)
Un documento viene riscaricato se almeno una condizione è vera:
1. Non esiste `DocMeta` in cache.
2. `meta.modifiedTime !== (node.modifiedTime ?? '')`.
3. `meta.name !== node.name`.
4. `meta.parser !== PARSER_VERSION` (attualmente `2`).

---

## Sistema Snapshot precompilati (`.jsonl`)

Per evitare che ogni nuovo dispositivo debba scaricare e convertire centinaia di `.docx` da Drive (alcuni > 5 MB), il progetto implementa un meccanismo di **import/export streaming in formato NDJSON (`.jsonl`)**.

### Formato dei file `assets/snapshot-core-N.jsonl` e `assets/snapshot-bestiary-N.jsonl`
- **Riga 1 (header)**:
  - Nel file `snapshot-core-1.jsonl`: `{"generatedAt": "<ISO>", "tree": { ...TreeNode... }}`
  - Nei file successivi (`snapshot-core-2..N.jsonl` e `snapshot-bestiary-1..N.jsonl`): `{"generatedAt": "<ISO>"}`
- **Righe successive**: un oggetto JSON per documento: `{"id": "...", "meta": { ...DocMeta... }, "html": "..."}`.

### Import in due fasi (`importSnapshot()`)
- **Fase 1 (attesa al login):** carica `assets/snapshot-core-1..N.jsonl` (~15,2 MB totali), salva in IndexedDB (`snapshotCoreAt`), indicizza in `MiniSearch` e sblocca subito l'ingresso con tutte le regole, classi, feat e spell pronte.
- **Fase 2 (in background):** avvia `startBestiaryImport()` su `assets/snapshot-bestiary-1..N.jsonl` (`snapshotBestiaryAt`), mostrando l'avanzamento in `bestiaryStatus` nella barra `.sync` (al termine del controllo struttura in `checkTree()`, se non ci sono file Core stale, `status` torna subito a `'idle'` così `bestiaryStatus` resta visibile invece di restare coperto da *"Controllo il Drive…"*) e coordinandosi con `checkTree()` per evitare download duplicati dal Drive.
- **Fallback legacy:** se `snapshot-core-1.jsonl` non esiste (404), ripiega automaticamente su `assets/snapshot-1..50.jsonl` (`snapshotAt`).
- Legge lo stream riga per riga tramite `TextDecoderStream` (basso consumo RAM) e scrive i documenti mancanti in batch da 200 entry (`setMany`), salvando quanto letto nel `finally` anche in caso di interruzione.

### Export (`exportSnapshot()`)
- Avviabile dalla Home (*Copia per il caricamento rapido*).
- Genera le due serie separate `snapshot-core-N.jsonl` e `snapshot-bestiary-N.jsonl` spezzate in blocchi da massimo **15.000.000 caratteri** (`LIMIT`, sotto il limite browser di 25 MB di GitHub).
- Genera il download sequenziale con una pausa di `700 ms` tra un file e l'altro e `URL.revokeObjectURL` dopo 60 s.

---

## Indice `MiniSearch` e `linkTerms()`

- **Configurazione `MiniSearch`**:
  - `fields: ['heading', 'text']`
  - `storeFields: ['docId', 'anchor', 'heading']`
  - `searchOptions: { boost: { heading: 3 }, prefix: true }`
  - Tokenizzazione Unicode (`[^\p{L}\p{N}’']+`), normalizzazione lowercase senza apostrofi.
  - Ogni sezione è indicizzata come documento con chiave `${docId}#${sectionId}`.
- **Persistenza indice `MiniSearch`**: salvato in IndexedDB sotto la chiave `searchIndex` (`ms.toJSON()`) con firma di validazione `sig` su `(id, modifiedTime, parser, sections.length)` e ripristinato in modo asincrono non bloccante tramite `MiniSearch.loadJSAsync()`. Le mappe `sectionMaps` (`docId -> Map<sectionId, Section>`) e `headingCache` rendono `O(1)` il recupero delle sezioni durante la ricerca.
- **Glossario cliccabile (`linkTerms()`)**:
  - Memoizzato rispetto a `this.version()`.
  - Raccoglie tutte le sezioni con `level >= 3` e `heading.length >= 5` (fino a 80 caratteri), escludendo `GENERIC_HEADINGS` (18 titoli generici come `benefit`, `special`, `prerequisite`, `notes`, `example`, `table`, ecc.), **più le voci editoriali in `CUSTOM_ENTRIES`** (`src/app/custom-entries.ts`, es. `Effect-Specific Spell [Metamagic]`).
  - Ordina i documenti mettendo **prima i documenti non-Bestiario e poi il Bestiario**, e dà precedenza ai nomi pieni (`full`) rispetto ai derivati (`derived`), passando poi tutto a `buildTermMap()` che costruisce anche `firstWordMax` (vedi [[Parser, Formule Spell e Lookup]]).
