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
4. **Altri file (`looseFiles`)**: se nella radice del Drive esistono file leggibili (`docx`, `gdoc`, `text`) fuori dalle cartelle, li elenca in fondo con link diretto a `/doc/:id`.

---

## 2. Esplorazione Cartelle (`src/app/folder.component.ts`, rotta `/cartella/:id`)

Reagisce al parametro `:id` tramite `toSignal(route.paramMap)` e mostra:
- **Breadcrumb (`.crumbs`)**: costruito con `library.pathOf(id)` (`Home › Manuale › ...`).
- **Ricerca Bestiario contestuale**: se `library.isBestiary(id)` è `true` (cioè qualsiasi nodo nel percorso matcha `/bestiar|bestiary/i`), monta `<app-bestiary-search />` in cima alla cartella (vedi [[Ricerca e Bestiario]]).
- **Sottocartelle (`folders`)**: renderizzate come griglia `.cards` con conteggio documenti.
- **Documenti (`files`)**: elenco `.list` dei soli nodi leggibili (`isDocNode`: `docx`, `gdoc`, `text`), ciascuno con icona dedicata e link a `/doc/:id`. I file di tipo `'other'` (PDF, fogli di calcolo, ecc.) vengono omessi.

---

## 3. Lettore Documenti (`src/app/doc.component.ts`, rotta `/doc/:id`)

È il componente interattivo più articolato per la consultazione dei manuali.

### Caricamento e ciclo di vita
- Un `effect()` osserva `this.id()` e `this.library.tree()`: appena il nodo esiste nell'albero chiama `load(id)`.
- `load(id)` recupera l'HTML da `library.getHtml(id)` (che legge da IndexedDB o sincronizza on-demand se mancante/stale).
- Inietta l'HTML tramite `DomSanitizer.bypassSecurityTrustHtml(raw)` (per preservare `id`, tabelle, `data-*` e pulsanti delle formule).
- Nel `setTimeout` successivo al render Angular:
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
   - Alterna apertura/chiusura del contenitore `.formula-detail` immediatamente successivo.
   - All'apertura legge `data-terms` (lista separata da `|`, con prefisso `*N*` per i semi di livello `N`), risolve in sequenza tutte le descrizioni e le inserisce inline sotto la formula.

### Pannello inferiore ridimensionabile (`.seed-panel`)
- Posizionato fisso in basso (`width: min(760px, calc(100vw - 1.2rem))`, `z-index: 20`).
- **Maniglia superiore (`.seed-grip`)** accessibile:
  - Supporta drag via **Pointer Events** (`setPointerCapture`, compatibile mouse e touch).
  - Supporta regolazione da **tastiera** (`ArrowUp` / `ArrowDown` a passi di `20px`, o `80px` con `Shift`).
  - Altezza vincolata fra `PANEL_MIN = 120px` e `window.innerHeight - 40px`.
  - Salvata in `localStorage` sotto la chiave `'bgdr-panel-h'` (default `40%` di `window.innerHeight`).
