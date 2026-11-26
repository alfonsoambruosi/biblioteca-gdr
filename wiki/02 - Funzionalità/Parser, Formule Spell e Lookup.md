---
title: Parser, Formule Spell e Lookup
aliases:
  - Doc Parser
  - Formule degli Incantesimi
  - LookupService
  - Term Links
type: feature
tags:
  - biblioteca-gdr
  - funzionalita
  - parser
  - spell
  - lookup
  - term-links
status: completo
updated: 2026-11-26
---

# Parser, Formule Spell e Lookup

Torna a [[00 - Indice (MOC)]] · Correlati: [[Flusso Dati e Cache]], [[Navigazione e Lettura Documenti]], [[Incantesimi per Classe]], [[Modelli Dati]]

---

## 1. Arricchimento HTML (`src/app/doc-parser.ts`)

`PARSER_VERSION = 2`. Ogni volta che questa costante viene incrementata, `LibraryService.isStale()` invalida automaticamente i documenti in IndexedDB e li rigenera.

La funzione `enrichHtml(rawHtml, docName, prefix = 's')` prende l'HTML prodotto da `mammoth` e lo elabora in **4 passaggi** tramite `DOMParser` nativo del browser:

### Passaggio 1 — Riconoscimento voci di spell (`h5.spell-entry`)
Un paragrafo `<p>` diretto figlio di `<body>` viene promosso a `<h5 class="spell-entry">` se:
- il testo è lungo tra `1` e `89` caratteri, **e**
- il blocco immediatamente successivo inizia con `School ` (`/ ^School\s /`).

Questo consente di indicizzare ogni spell nel TOC, nella ricerca e nello Spellbook (`LookupService.spellBook()` filtra proprio `s.level === 5`).

### Passaggio 2 — Wrapper tabelle responsive e immagini lazy
Ogni `<table>` figlia diretta di `<body>` viene avvolta in `<div class="tbl">...</div>` per consentire lo scorrimento orizzontale su smartphone, e ogni `<img>` riceve `loading="lazy"` e `decoding="async"`.

### Passaggio 3 — Riconoscimento e markup delle formule delle spell
Su ogni `<p>` e `<li>` con testo `<= 4000` caratteri viene testato `isFormula(text)`:
- Regex componenti (`COMPONENT_RE`): `/([A-Z][\p{L}’'\- ]*?)\s*\(([^()]*?\blevels?\b[^()]*)\)/gu`
  - Esempio: `Jet of flame (0 level) + Reach Spell (close to medium; +1 level) = 3rd level`
- `isFormula` è vero se ci sono `>= 2` componenti e un `+`, **oppure** `>= 1` componente, un `=` e la parola `level`/`levels`.
- **`baseLevel(note)`**: distingue una **spell base ("seme")** da una **metamagia**:
  - Se il nome termina con `Spell` (`/\bSpell$/`), è sempre trattato come metamagia (`base = null`), anche in caso di refuso sul segno nel testo originale.
  - Altrimenti estrae un livello `0`–`9` senza segno (`+`/`-`) dalla nota (`/(?:^|[;(]\s*)([0-9])(?:st|nd|rd|th)?\s+levels?\s*$/`), es. `(0 level)` o `(to Abyss; 6th level)`.
- **`buildFormulaHtml(text)`**:
  - Mantiene il testo **identico carattere per carattere**, avvolgendo ogni componente in `<span role="button" tabindex="0" class="seed [base]" data-term="..." [data-base="N"]>Nome</span>`.
  - Mette in grassetto (`<strong class="spell-name">`) il nome della spell prima dei due punti iniziali (`^([^:<]{2,70}):`).
- Se la formula **non è dentro una tabella**, inserisce subito dopo:
  - `<button type="button" class="expand-formula" data-terms="...">Mostra la descrizione di ogni componente</button>` (dove i semi sono codificati come `*N*Nome`, separati da `|`)
  - `<div class="formula-detail" hidden></div>`

### Passaggio 4 — Estrazione `Section[]` e assegnazione ID ancore
Itera sui figli diretti di `<body>` (ignorando `.expand-formula` e `.formula-detail`):
- **Riga-formula con nome** (`<p>` con figlio diretto `strong.spell-name`, es. in Ch 8a Grimoire):
  - Assegna `id = "${prefix}-f${++lines}"`, crea una `Section` autonoma di **`level: 6`** con `heading = nome spell` e `text = intero paragrafo`.
- **Titolo `H1`–`H6`**:
  - Chiude la sezione precedente, assegna `id = "${prefix}-${++n}"`, apre una nuova `Section` di livello `1..6`.
- **Altri blocchi**: accoda il testo a `cur.buf`; per le tabelle formatta le righe come `cella1 | cella2 | cella3` (`blockText()`), formato sfruttato poi da `explainSeed()` per trovare varianti in tabella!

### Altre utility di `doc-parser.ts`
- **`sliceSectionFromDoc(dom, anchor)`** e **`sliceSection(html, anchor)`**: estraggono un frammento HTML a partire dall'elemento `#anchor` (la prima lavora su un `Document` già parsato tramite `cloneNode(true)` evitando un secondo `DOMParser`):
  - Se è una riga-formula (non `H1..H6`), restituisce solo quel paragrafo.
  - Se è un titolo `H1..H6`, accumula tutti gli elementi successivi fino al primo titolo di livello `<= level`.
  - Rimuove tutti gli attributi `id` (evita ID duplicati nel DOM del pannello) e rimuove `.expand-formula` e `.formula-detail`.
- **`normTerm(s)`**: rimuove `[tag]`, `(note)`, sigle fonte attaccate in fondo (`/(?<=[a-z])[A-Z]{2,}[A-Z0-9,]*\s*$/`, es. `APG`, `UM`), normalizza apostrofi, minuscolo e spazi.
- **`tokenKey(s)`**: come `normTerm`, ma rimuove punteggiatura e ordina le parole alfabeticamente (così `"Power Attack, Improved"` e `"Improved Power Attack"` combaciano).

---

## 2. Risoluzione delle descrizioni (`src/app/lookup.service.ts`)

```mermaid
flowchart TD
    CLICK["Clic su componente o pulsante formula"] --> TYPE{"Ha livello base 0-9?"}
    TYPE -- Sì: explainSeed --> S1["1. Cerca titolo esatto/tokenKey\nnei soli spellDocIds (Ch 8 / 8a)\nmax 3 voci"]
    S1 -- Non trovato --> S2["2. Cerca riga di tabella\ncon cella === normTerm(term)\n(es. Jet of flame in Acid Splash)\nmax 2 voci"]
    S2 -- Non trovato --> EX
    TYPE -- No: explain --> EX["1. findEntries(term) su tutta la biblioteca\n(voci h1..h5 prima di h6 formula, max 4)"]
    EX -- Non trovato --> S3["2. Fallback: library.search('\"term\"', 6)\nmostra passaggi in cui compare"]
    S3 -- Nessun hit --> NONE["'Nessuna descrizione trovata'"]
```

### Dettagli dei metodi di `LookupService`
- **`spellDocIds()`**: identifica i documenti degli incantesimi controllando se il nome del documento (o di una delle sue `parts`) matcha una delle regex in `environment.mergeGroups` (attualmente `/^Ch\.?\s*8a?\b/i`).
- **`findEntries(term)`**: esegue lookup **`O(1)`** tramite indice memoizzato su `library.version()` (`byNorm` e `byToken`, pre-ordinati per `level` crescente), includendo sia le sezioni della biblioteca sia le voci editoriali di `CUSTOM_ENTRIES` (`src/app/custom-entries.ts`, es. `Effect-Specific Spell [Metamagic]`).
- **`parsedDoc(docId)` e `entryHtml(ref)`**: mantengono una **cache LRU di massimo 6 `Document` già parsati** (`domCache`, invalidata se cambia `modifiedTime:parser`) + deduplica concorrente (`domInflight`), e usano `sliceSectionFromDoc()` per estrarre le voci senza riparsare documenti enormi come `Ch 8 + 8a` (5,6 MB). Le voci con `docId === CUSTOM_DOC_ID` vengono servite direttamente da `customEntryHtml()`.
- **`explainSeed(term, level)`**: antepone `<p class="seed-level">Livello N (come indicato nella formula)</p>`, poi applica la cascata: voce nei capitoli spell → riga di tabella varianti nei capitoli spell → fallback a `explain(term)`.
- **`explain(term)`**: voce completa se esiste un titolo corrispondente (max 4, renderizzati in parallelo via `Promise.all`), altrimenti fino a 6 snippet da ricerca esatta fra virgolette.
- **`spellBook()`**: memoizzato rispetto a `library.version()`, scandisce tutte le sezioni con `level === 5` cercando la riga che inizia con `Level ` (es. `Level arcane 1, divine 1`), parsifica le coppie `<lista> <cifra 0-9>` separate da virgola e costruisce `Map<lista, Map<livello, SpellRef[]>>`.

---

## 3. Auto-linking dei termini (`src/app/term-links.ts` e `DocComponent`)

Quando un documento viene aperto in `DocComponent`, `linkNames()` trasforma automaticamente in link cliccabili (`.term-link`) i nomi di feat, talenti, spell e altre voci della biblioteca (incluse `CUSTOM_ENTRIES`) presenti nel corpo del testo (anche nelle schede del Bestiario).

### Costruzione della mappa (`namesOf` + `buildTermMap` + `LibraryService.linkTerms`)
Per ogni sezione con `level >= 3` e titolo `5..80` caratteri (esclusi i 18 `GENERIC_HEADINGS`) e per le voci in `CUSTOM_ENTRIES`, `namesOf(heading)` genera:
- **Nomi pieni (`full`, priorità alta)**:
  1. Titolo originale trimmato
  2. Senza `[tag]` e senza sigla fonte in coda (es. `Power Attack, Furious FocusAPG` → `Power Attack, Furious Focus`)
  3. Senza parentesi tonde (es. `Ability Focus (Spells)` → `Ability Focus`)
  4. Inversione `, Improved`: `"Grapple, Improved"` → `"Improved Grapple"`
- **Nomi derivati (`derived`, priorità secondaria)**:
  - La parte prima della virgola (es. `"Overrun, Improved"` → `"Overrun"`).

In `buildTermMap()`, **vince il primo inserito**: siccome `LibraryService.linkTerms()` ordina i documenti mettendo il Bestiario per ultimo e accoda `derived` dopo `full`, una regola/feat/spell reale vince sempre su una voce omonima del Bestiario e un nome pieno vince sempre su uno derivato. Inoltre `buildTermMap()` costruisce **`firstWordMax: Map<string, number>`** per saltare in `O(1)` le parole che non aprono alcun termine.

### Matching greedy sul testo (`splitTerms`) e linking incrementale
- Tokenizza i nodi di testo con `/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu` (parole intere: `"Power Attack"` non matcha `"Power Attacks"`).
- Per ogni token controlla `firstWordMax.get(toks[i].low)` e prova le finestre dalla più lunga (`min(maxForFirst, remaining)`) fino a `1` (*longest-match first*: `"Power Attack Plus"` vince su `"Power Attack"`).
- `DocComponent.linkNames()` usa `TreeWalker` su `NodeFilter.SHOW_TEXT`, saltando nodi dentro `h1..h6, a, button, .seed, .term-link, .formula-detail` e nodi con `<= 2` caratteri:
  - Sui documenti lunghi (`> 80` blocchi, come `Ch 8 + 8a`) usa **`IntersectionObserver`** (`rootMargin: '600px 0px'`) collegando solo i blocchi vicini alla viewport;
  - Sui documenti più brevi elabora i blocchi a chunk con budget di **`10 ms` per frame** (`requestAnimationFrame`), cancellati automaticamente su cambio pagina o distruzione (`cancelLinkNames()`).
- Gli span `.term-link` sono evidenziati in colore ceralacca (`--wax`), grassetto `600`, sottolineatura puntinata e `cursor: pointer` (`src/styles.css`).
