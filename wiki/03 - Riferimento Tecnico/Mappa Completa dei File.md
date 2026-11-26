---
title: Mappa Completa dei File
aliases:
  - Inventario File
  - Struttura Sorgenti
type: reference
tags:
  - biblioteca-gdr
  - riferimento
  - inventario
  - codebase
status: completo
updated: 2026-11-26
---

# Mappa Completa dei File

Torna a [[00 - Indice (MOC)]] · Correlati: [[Stack e Configurazione]], [[Modelli Dati]]

---

## File nella radice e CI/CD

| File | Ruolo |
|---|---|
| `package.json` | Manifest NPM (`biblioteca-gdr` v1.0.0), `engines.node >= 22.12.0`, script `start`/`build`/`watch`, dipendenze Angular 20 + `idb-keyval` + `mammoth` + `minisearch` |
| `package-lock.json` | Lockfile NPM per installazioni riproducibili in locale e in CI (`npm ci`) |
| `angular.json` | Configurazione Angular CLI / `@angular/build:application`, budget, `allowedCommonJsDependencies` |
| `tsconfig.json` | Opzioni TypeScript strict, `ES2022`, `strictTemplates` |
| `tsconfig.app.json` | Configurazione compilazione app (`src/main.ts` + `src/**/*.d.ts`) |
| `.gitignore` | Esclude `node_modules/`, `dist/`, `.angular/`, `.DS_Store` |
| `.github/workflows/pages.yml` | Pipeline CI/CD GitHub Pages (Node 24, `cache: npm`, validazione e iniezione `DRIVE_API_KEY` via Node, `npm ci`, build e deploy) |
| `README.md` | Guida principale di setup, funzionamento, funzionalità (inclusi calcolatore oggetti, ricerca bestiario, term-links, snapshot), sicurezza e deploy |
| `GITHUB-PAGES.md` | Guida passo-passo per deploy su GitHub Pages e caricamento degli `snapshot-N.jsonl` |

---

## File base di `src/`

| File | Ruolo |
|---|---|
| `src/index.html` | Documento HTML radice (`lang="it"`, `<base href="./">`, `<app-root>`) |
| `src/main.ts` | Bootstrap standalone Angular (`bootstrapApplication`) |
| `src/styles.css` | Unico foglio di stile globale (439 righe): tema pergamena, palette CSS, responsive, TOC, pannello, calcolatore, bestiario, generatore incontri, schede |
| `src/typings.d.ts` | Dichiarazione ambient TypeScript per `mammoth/mammoth.browser` (`convertToHtml`, `images.imgElement`, `MammothImage`) |
| `src/environments/environment.ts` | `driveRootId`, segnaposto `apiKey`, regole `mergeGroups` |

---

## Applicazione (`src/app/`) — 34 file TypeScript

### Bootstrap, Routing, Auth e Device
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/app.config.ts` | `appConfig` | Provider router con `withHashLocation()` e `provideBrowserGlobalErrorListeners()` |
| `src/app/app.component.ts` | `AppComponent` | Root component; attiva `DeviceService` e ospita `<router-outlet />` |
| `src/app/app.routes.ts` | `routes` | Definizione delle 9 rotte applicative (lazy `loadComponent` + `title`) + wildcard redirect |
| `src/app/auth.service.ts` | `AuthService` | Login/logout client-side (`admin`/`0000`), stato `loggedIn` su `localStorage` sincronizzato tra schede |
| `src/app/auth.guard.ts` | `authGuard`, `guestGuard` | Protezione delle rotte autenticate e redirect con `returnUrl` |
| `src/app/device.ts` | `DeviceKind`, `DEVICE_LABEL`, `detectDevice()` | Euristica UA/touch/schermo per classificare `smartphone`, `tablet`, `pc` |
| `src/app/device.service.ts` | `DeviceService` | Espone `kind`/`label` come Signals e imposta `data-device` su `<html>` |

### Servizi dati, Parsing, Immagini e Ricerca
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/models.ts` | `NodeKind`, `TreeNode`, `Section`, `DocMeta`, `SearchHit`, `Snapshot` | Modelli dati principali |
| `src/app/drive.service.ts` | `DriveService`, `mergeGroups()`, `displayName()` | Client Google Drive API v3 con semaforo (`MAX_CONCURRENT = 2`), retry esponenziale, fusione gruppi e download |
| `src/app/library.service.ts` | `LibraryService` | Orchestrazione cache IndexedDB (`getMany`), import/export snapshot Core+Bestiario, sync incrementale, `MiniSearch` persistente, ricerca, `linkTerms()`, `isBestiary()` |
| `src/app/doc-parser.ts` | `PARSER_VERSION`, `enrichHtml()`, `buildFormulaHtml()`, `isFormula()`, `baseLevel()`, `sliceSectionFromDoc()`, `sliceSection()`, `normTerm()`, `tokenKey()`, `esc()` | Parsing DOM dell'HTML di `mammoth`: promozione `h5.spell-entry`, wrapper `.tbl`, immagini lazy, markup formule e pulsanti, estrazione `Section[]` |
| `src/app/image-compress.ts` | `IMAGE_MAX_DIM`, `IMAGE_QUALITY`, `compressImageToDataUri()` | Ridimensionamento (`max 700 px`) e ricompressione automatica WebP (`q = 0.65`) delle immagini incorporate in `mammoth` |
| `src/app/lookup.service.ts` | `LookupService`, `EntryRef`, `SpellRef`, `isDocNode()`, `isSheetNode()` | Risoluzione voci `O(1)`, cache LRU DOM, spiegazione semi di formula (incluse tabelle varianti), fallback ricerca, costruzione `spellBook()`, conteggio file/schede |
| `src/app/term-links.ts` | `TermTarget`, `TermMap`, `TextPart`, `termKey()`, `buildTermMap()`, `splitTerms()`, `namesOf()` | Algoritmo *longest-match first* con indice `firstWordMax` per collegare automaticamente nomi di feat/talenti/spell nei documenti |
| `src/app/custom-entries.ts` | `CUSTOM_DOC_ID`, `CUSTOM_DOC_NAME`, `CustomEntry`, `CUSTOM_ENTRIES`, `CUSTOM_TREE_NODE`, `CUSTOM_DOC_META`, `customEntryHtml()`, `customDocHtml()` | Registro voci editoriali del sito (es. `Effect-Specific Spell [Metamagic]`), indipendente da Drive e snapshot |

### Componenti UI — Navigazione, Lettura e Ricerca
| File | Selector / Rotta | Responsabilità |
|---|---|---|
| `src/app/login.component.ts` | `app-login` · `/accesso` | Form di accesso + sincronizzazione pre-ingresso (max 15 s) |
| `src/app/shell.component.ts` | `app-shell` · `/` | Barra superiore sticky, ricerca globale, barra stato sync/bestiario, logout con verifica Drive |
| `src/app/home.component.ts` | `app-home` · `/` | Card categorie Drive, 3 card strumenti (Bestiario, Incantesimi, Oggetti), box esportazione snapshot, file sciolti |
| `src/app/folder.component.ts` | `app-folder` · `/cartella/:id` | Breadcrumb, banner `/bestiario` + ricerca bestiario contestuale, sottocartelle e lista file/schede |
| `src/app/doc.component.ts` | `app-doc` · `/doc/:id` | Visualizzatore HTML, pulsante *← Torna* (`?from=`), TOC persistente, auto-linking incrementale (`IntersectionObserver`), espansione formule, pannello inferiore ridimensionabile |
| `src/app/sheet.component.ts` | `app-sheet` · `/scheda/:id` | Scheda personaggio Google Sheets incorporata (`<iframe>`): default `Solo lettura`, switch `Modifica`, checkbox `Mostra menu` e link esterno |
| `src/app/search.component.ts` | `app-search` · `/cerca` | Pagina risultati ricerca globale (esclude Bestiario) |
| `src/app/bestiary-search.component.ts` | `app-bestiary-search` | Widget di ricerca live (debounce 150 ms) limitato al Bestiario, incorporato in `FolderComponent` |
| `src/app/icon.component.ts` | `app-icon`, `iconFor()` | 9 icone SVG inline + mappatura automatica da nome cartella/file |

### Bestiario filtrabile e Generatore di Incontri
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/bestiary.component.ts` | `BestiaryComponent` · `/bestiario` | Vista a 3 tab: Catalogo filtrabile (~2.080 creature), Generatore incontri casuali, Per cartelle |
| `src/app/bestiary-index.ts` | `BestiaryEntry`, `EnvGroup`, `BESTIARY_SIZES`, `BESTIARY_ENV_GROUPS`, `CR_OPTIONS`, `parseCrValue()`, `formatCr()`, `extractBestiaryEntries()` | Estrazione singole creature per sezione `h1`/`h2` con regex CR a fine riga, taglie e ambienti |
| `src/app/bestiary-state.service.ts` | `BestiaryStateService`, `BestiaryViewMode`, `BestiarySortMode`, `BESTIARY_PAGE_SIZE` | Persistenza in memoria di filtri Catalogo e ultimo incontro generato tra navigazioni |
| `src/app/encounter-gen.ts` | `EncounterStyle`, `DifficultyOption`, `EncounterSlot`, `GeneratedEncounter`, `DIFFICULTIES`, `ENCOUNTER_STYLES`, `xpForCr()`, `estimateCrFromXp()`, `encounterBudgetXp()`, `generateEncounter()`, `rerollSlot()` | Motore generazione incontri casuali XP Pathfinder 1e/3.5 con 7 difficoltà DOOM (`−1..+5`) |

### Componenti e Dati — Spellbook e Calcolatore Oggetti
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/spellbook.component.ts` | `SpellbookComponent` · `/incantesimi` | Liste incantesimi per classe/livello + filtro testuale (debounce 120 ms) + link interni/esterni |
| `src/app/extra-lists.ts` | `ListItem`, `ROGUE_TRICKS` (332), `SHADOW_HAND` (25), `onlineUrl()` | Elenchi statici per Ladro e Mano d'Ombra + helper ricerca Google |
| `src/app/item-calc.ts` | `ModKind`, `Modifier`, `STOCK_RATIO`, `calcItem()`, `levelAdjFromText()` | Motore puro di calcolo costi in *numen* e *gp* (`level 0 → 0,5`) + scorta privata (`×18`) |
| `src/app/item-presets.ts` | `PresetMod`, `ItemPreset`, `ITEM_PRESETS` (182) | Preset numerici da *Ch 6a - Item Compendium* (134 magici, 46 alchimia, 2 munizioni) |
| `src/app/item-composite.ts` | `CompositePart`, `CompositeItem`, `COMPOSITE_ITEMS` (37) | Oggetti multi-parte ed eccezioni con totale stampato del libro |
| `src/app/item-calc.component.ts` | `ItemCalcComponent` · `/oggetti` | Interfaccia completa del calcolatore oggetti magici e composti |

---

## Asset (`src/assets/`)

- `src/assets/sfondi/sfondo-1.jpg` … `sfondo-5.jpg` (5 sfondi pergamena, ~2,3 MB totali)
- `src/assets/snapshot-core-1.jsonl` … `snapshot-core-2.jsonl` (2 partizioni Core, ~15,20 MB, 7 documenti + `tree`)
- `src/assets/snapshot-bestiary-1.jsonl` … `snapshot-bestiary-8.jsonl` (8 partizioni Bestiario, ~106,13 MB, 629 documenti — totale complessivo 10 file, ~121,33 MB, 636 documenti)
