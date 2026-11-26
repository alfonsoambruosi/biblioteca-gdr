---
title: Navigazione e Lettura Documenti
aliases:
  - Home, Cartelle e Documenti
  - DocComponent
  - FolderComponent
  - HomeComponent
type: feature
tags:
  - biblioteca-gdr
  - funzionalita
  - navigazione
  - documenti
  - toc
status: completo
updated: 2026-11-26
---

# Navigazione e Lettura Documenti

Torna a [[00 - Indice (MOC)]] · Correlati: [[Routing, Layout e Auth]], [[Parser, Formule Spell e Lookup]], [[Ricerca e Bestiario]], [[Stile e Assets]]

---

## 1. Home (`src/app/home.component.ts`, rotta `/`)

La Home funge da cruscotto principale e presenta:
1. **Card dinamiche delle cartelle di primo livello** (`categories`): filtra `library.tree().children` con `kind === 'folder'`, mostra l'icona scelta da `iconFor()` e il conteggio ricorsivo dei documenti leggibili (`lookup.countFiles(c)`).
2. **Due card di strumenti fissi**:
   - **Incantesimi per classe** → `/incantesimi` ([[Incantesimi per Classe]])
   - **Creazione oggetti magici** → `/oggetti` ([[Calcolatore Oggetti Magici]])
3. **Sezione collassabile `<details class="admin-box">`: *Copia per il caricamento rapido***:
   - Pulsante **Scarica la copia** collegato a `library.exportSnapshot()` (vedi [[Flusso Dati e Cache#Sistema Snapshot precompilati (.jsonl)]]).
   - Mostra stato live (`exporting`, `exportInfo`) in `role="status"`.
4. **Altri file (`looseFiles`)**: se nella radice del Drive esistono file leggibili (`isDocNode`: `docx`, `gdoc`, `text`) o Google Sheets (`isSheetNode`: `gsheet`) fuori dalle cartelle, li elenca in fondo con link diretto a `/doc/:id` (o `/scheda/:id` con icona `people` per i fogli).

---

## 2. Esplorazione Cartelle (`src/app/folder.component.ts`, rotta `/cartella/:id`)

Reagisce al parametro `:id` tramite `toSignal(route.paramMap)` e mostra:
- **Breadcrumb (`.crumbs`)**: costruito con `library.pathOf(id)` (`Home › Manuale › ...`).
- **Ricerca Bestiario contestuale**: se `library.isBestiary(id)` è `true` (cioè qualsiasi nodo nel percorso matcha `/bestiar|bestiary/i`), monta `<app-bestiary-search />` in cima alla cartella (vedi [[Ricerca e Bestiario]]).
- **Sottocartelle (`folders`)**: renderizzate come griglia `.cards` con conteggio documenti (`lookup.countFiles()`, che include anche i nodi `gsheet`).
- **Documenti e schede (`files`)**: elenco `.list` dei nodi leggibili (`isDocNode`: `docx`, `gdoc`, `text` → `/doc/:id`) e dei Google Sheets (`isSheetNode`: `gsheet` → `/scheda/:id` con icona `people`). I file di tipo `'other'` (PDF, binari, ecc.) vengono omessi.

---

## 3. Lettore Documenti (`src/app/doc.component.ts`, rotta `/doc/:id`)

È il componente interattivo più articolato per la consultazione dei manuali.

### Caricamento e ciclo di vita
- Un `effect()` osserva `this.id()` e `this.library.tree()`: appena il nodo esiste nell'albero chiama `load(id)`.
- `load(id)` recupera l'HTML da `library.getHtml(id)` (che legge da IndexedDB o sincronizza on-demand se mancante/stale).
- **Protezione da race condition (`loadRun` / `panelRun`)**: ogni caricamento incrementa un contatore (`loadRun` per il documento, `panelRun` per il pannello inferiore, entrambi invalidati anche su cambio pagina, documento non trovato, chiusura pannello e `DestroyRef.onDestroy`). Se una richiesta lenta termina dopo un cambio documento o un nuovo clic, il risultato viene scartato senza sovrascrivere testo, stato di caricamento o scroll.
- Inietta l'HTML tramite `DomSanitizer.bypassSecurityTrustHtml(optimized)` (aggiungendo `loading="lazy" decoding="async"` sulle `<img>` e preservando `id`, tabelle, `data-*` e pulsanti delle formule).
- Nel `setTimeout` successivo al render Angular (verificando che `loadRun` e `linkRun` siano ancora attuali):
  1. Esegue **`linkNames()`** (auto-linking di feat, talenti e spell nel testo tramite `TreeWalker` + `splitTerms`, vedi [[Parser, Formule Spell e Lookup#3. Auto-linking dei termini (term-links.ts e DocComponent)]]).
  2. Esegue **`scrollToFragment()`** per portare l'utente esattamente all'ancora passata nel fragment URL (es. da un risultato di ricerca o dallo Spellbook).

### Indice laterale (TOC)
- Costruito dal `computed` `toc`: prende tutte le sezioni in `library.meta(id).sections` con `heading` non vuoto e `level <= 5` (include `h1`–`h5` e voci di spell `h5.spell-entry`, escludendo le singole righe-formula `level === 6`).
- Stato aperto/chiuso (`tocOpen`) persistito in `localStorage` sotto la chiave `'bgdr-toc'`: di default aperto se `window.innerWidth >= 900`, chiuso su mobile.
- Al clic su una voce (`jump(id)`): scorre in modo fluido (`behavior: 'smooth'`) verso l'elemento; sotto i 900 px richiude automaticamente il drawer laterale.

### Event delegation nel contenuto e nel pannello (`onClick`)
Un unico handler `(click)="onClick($event)"` è agganciato sia al corpo del documento (`.content`) sia al corpo del pannello inferiore (`.seed-panel-body`), permettendo la navigazione ricorsiva anche cliccando su termini dentro una descrizione già aperta:

1. **Clic su `.term-link`** (nome auto-collegato di feat/talento/spell):
   - Legge `data-doc`, `data-anchor`, `data-heading`, `data-doc-name`, `data-level` e apre il pannello inferiore via `openEntry(ref)` → `lookup.entryHtml(ref)`.
2. **Clic su `.seed`** (componente di una formula):
   - Se ha `data-base` (spell di livello 0–9): chiama `lookup.explainSeed(term, level)`.
   - Altrimenti (metamagia o altro componente): chiama `lookup.explain(term)`.
   - Mostra il risultato nel pannello inferiore.
3. **Clic su `button.expand-formula`**:
   - Alterna apertura/chiusura del contenitore `.formula-detail` immediatamente successivo (disabilitando temporaneamente il pulsante per evitare doppi clic e ripristinandolo in caso di errore).
   - All'apertura legge `data-terms` (lista separata da `|`, con prefisso `*N*` per i semi di livello `N`), risolve in parallelo (`Promise.all`) tutte le descrizioni e le inserisce inline sotto la formula solo se `loadRun` è ancora corrente e il nodo è ancora nel DOM.

### Pannello inferiore ridimensionabile (`.seed-panel`)
- Posizionato fisso in basso (`width: min(760px, calc(100vw - 1.2rem))`, `z-index: 20`).
- **Maniglia superiore (`.seed-grip`)** accessibile:
  - Supporta drag via **Pointer Events** (`setPointerCapture`, compatibile mouse e touch).
  - Supporta regolazione da **tastiera** (`ArrowUp` / `ArrowDown` a passi di `20px`, o `80px` con `Shift`).
  - Altezza vincolata fra `PANEL_MIN = 120px` e `window.innerHeight - 40px`.
  - Salvata in `localStorage` sotto la chiave `'bgdr-panel-h'` (default `40%` di `window.innerHeight`).

---

## 4. Schede Personaggio — Google Sheets incorporato (`src/app/sheet.component.ts`, rotta `/scheda/:id`)

Permette di consultare e modificare le schede personaggio presenti nel Drive come Google Sheets (`kind === 'gsheet'`) senza toccare né rompere formule, trigger e Google Apps Script collegati: l'app non scarica né indicizza il foglio, ma lo incorpora direttamente in un `<iframe>` verso `https://docs.google.com/spreadsheets/d/<id>/...`.

### Controlli della barra superiore (`.sheet-bar`)
Da sinistra a destra, dopo il titolo della scheda:
1. **`Solo lettura`** *(attiva di default all'apertura)*: carica `.../preview` (anteprima sicura senza rischio di modifiche accidentali).
2. **`Modifica`**: carica `.../edit?rm=minimal` (foglio modificabile senza barra dei menu, con più spazio utile per aggiornare HP e valori).
3. **Checkbox `Mostra menu`**: disabilitata in *Solo lettura*; in *Modifica* commuta tra `.../edit?rm=minimal` (deselezionata) e `.../edit` (selezionata), mostrando la barra completa di Google Sheets inclusi i menu personalizzati degli Apps Script.
4. **Link `Apri in Google Sheets ↗`**: apre `.../edit` in una nuova scheda (`target="_blank" rel="noopener"`), utile come fallback se il browser blocca i cookie di terze parti.

### Layout, sicurezza e permessi
- **Larghezza piena**: la presenza di `.sheet-wrap` attiva la regola `.page:has(.sheet-wrap) { max-width: none; }` in `src/styles.css`, estendendo l'iframe su tutta la viewport (`height: calc(100dvh - 15rem); min-height: 480px`).
- **Validazione ID**: l'iframe viene montato solo se l'ID esiste nell'albero Drive come nodo `'gsheet'` e rispetta `/^[A-Za-z0-9_-]+$/`.
- **Permessi**: la condivisione *"Chiunque abbia il link → Visualizzatore"* basta per la lettura; per modificare è necessario essere autenticati a Google nel browser con un account che abbia permessi di scrittura sul foglio.
