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
| `package.json` | Manifest NPM (`biblioteca-gdr` v1.0.0), script `start`/`build`/`watch`, dipendenze Angular 20 + `idb-keyval` + `mammoth` + `minisearch` |
| `angular.json` | Configurazione Angular CLI / `@angular/build:application`, budget, `allowedCommonJsDependencies` |
| `tsconfig.json` | Opzioni TypeScript strict, `ES2022`, `strictTemplates` |
| `tsconfig.app.json` | Configurazione compilazione app (`src/main.ts` + `src/**/*.d.ts`) |
| `.gitignore` | Esclude `node_modules/`, `dist/`, `.angular/`, `.DS_Store` |
| `.github/workflows/pages.yml` | Pipeline CI/CD GitHub Pages (Node 22, iniezione `DRIVE_API_KEY` via `sed`, build e deploy) |
| `README.md` | Guida principale di setup, funzionamento, funzionalità (inclusi calcolatore oggetti, ricerca bestiario, term-links, snapshot), sicurezza e deploy |
| `GITHUB-PAGES.md` | Guida passo-passo per deploy su GitHub Pages e caricamento degli `snapshot-N.jsonl` |

---

## File base di `src/`

| File | Ruolo |
|---|---|
| `src/index.html` | Documento HTML radice (`lang="it"`, `<base href="./">`, `<app-root>`) |
| `src/main.ts` | Bootstrap standalone Angular (`bootstrapApplication`) |
| `src/styles.css` | Unico foglio di stile globale (296 righe): tema pergamena, palette CSS, responsive, TOC, pannello, calcolatore |
| `src/typings.d.ts` | Dichiarazione ambient TypeScript per `mammoth/mammoth.browser` |
| `src/environments/environment.ts` | `driveRootId`, segnaposto `apiKey`, regole `mergeGroups` |

---

## Applicazione (`src/app/`) — 27 file TypeScript

### Bootstrap, Routing, Auth e Device
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/app.config.ts` | `appConfig` | Provider router con `withHashLocation()` e `provideBrowserGlobalErrorListeners()` |
| `src/app/app.component.ts` | `AppComponent` | Root component; attiva `DeviceService` e ospita `<router-outlet />` |
| `src/app/app.routes.ts` | `routes` | Definizione delle 7 rotte applicative + wildcard redirect |
| `src/app/auth.service.ts` | `AuthService` | Login/logout client-side (`admin`/`0000`), stato `loggedIn` su `sessionStorage` |
| `src/app/auth.guard.ts` | `authGuard`, `guestGuard` | Protezione delle rotte autenticate e redirect con `returnUrl` |
| `src/app/device.ts` | `DeviceKind`, `DEVICE_LABEL`, `detectDevice()` | Euristica UA/touch/schermo per classificare `smartphone`, `tablet`, `pc` |
| `src/app/device.service.ts` | `DeviceService` | Espone `kind`/`label` come Signals e imposta `data-device` su `<html>` |

### Servizi dati, Parsing e Ricerca
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/models.ts` | `NodeKind`, `TreeNode`, `Section`, `DocMeta`, `SearchHit`, `Snapshot` | Modelli dati principali |
| `src/app/drive.service.ts` | `DriveService`, `mergeGroups()`, `displayName()` | Client Google Drive API v3 con semaforo (`MAX_CONCURRENT = 2`), retry esponenziale, fusione gruppi e download |
| `src/app/library.service.ts` | `LibraryService` | Orchestrazione cache IndexedDB, import/export snapshot NDJSON, sync incrementale, indice `MiniSearch`, ricerca, `linkTerms()`, `isBestiary()` |
| `src/app/doc-parser.ts` | `PARSER_VERSION`, `enrichHtml()`, `buildFormulaHtml()`, `isFormula()`, `baseLevel()`, `sliceSection()`, `normTerm()`, `tokenKey()`, `esc()` | Parsing DOM dell'HTML di `mammoth`: promozione `h5.spell-entry`, wrapper `.tbl`, markup formule e pulsanti, estrazione `Section[]` |
| `src/app/lookup.service.ts` | `LookupService`, `EntryRef`, `SpellRef`, `isDocNode()` | Risoluzione voci, spiegazione semi di formula (incluse tabelle varianti), fallback ricerca, costruzione `spellBook()` |
| `src/app/term-links.ts` | `TermTarget`, `TermMap`, `TextPart`, `termKey()`, `buildTermMap()`, `splitTerms()`, `namesOf()` | Algoritmo *longest-match first* per collegare automaticamente nomi di feat/talenti/spell nei documenti |

### Componenti UI — Navigazione, Lettura e Ricerca
| File | Selector / Rotta | Responsabilità |
|---|---|---|
| `src/app/login.component.ts` | `app-login` · `/accesso` | Form di accesso + sincronizzazione pre-ingresso (max 15 s) |
| `src/app/shell.component.ts` | `app-shell` · `/` | Barra superiore sticky, ricerca globale, barra stato sync, logout con verifica Drive |
| `src/app/home.component.ts` | `app-home` · `/` | Card categorie Drive, card strumenti, box esportazione snapshot, file sciolti |
| `src/app/folder.component.ts` | `app-folder` · `/cartella/:id` | Breadcrumb, ricerca bestiario contestuale, sottocartelle e lista file |
| `src/app/doc.component.ts` | `app-doc` · `/doc/:id` | Visualizzatore HTML, TOC persistente, auto-linking termini, espansione formule, pannello inferiore ridimensionabile |
| `src/app/search.component.ts` | `app-search` · `/cerca` | Pagina risultati ricerca globale (esclude Bestiario) |
| `src/app/bestiary-search.component.ts` | `app-bestiary-search` | Widget di ricerca live limitato al Bestiario, incorporato in `FolderComponent` |
| `src/app/icon.component.ts` | `app-icon`, `iconFor()` | 9 icone SVG inline + mappatura automatica da nome cartella/file |

### Componenti e Dati — Spellbook e Calcolatore Oggetti
| File | Simboli principali | Responsabilità |
|---|---|---|
| `src/app/spellbook.component.ts` | `SpellbookComponent` · `/incantesimi` | Liste incantesimi per classe/livello + filtro testuale + link interni/esterni |
| `src/app/extra-lists.ts` | `ListItem`, `ROGUE_TRICKS` (332), `SHADOW_HAND` (25), `onlineUrl()` | Elenchi statici per Ladro e Mano d'Ombra + helper ricerca Google |
| `src/app/item-calc.ts` | `ModKind`, `Modifier`, `STOCK_RATIO`, `calcItem()`, `levelAdjFromText()` | Motore puro di calcolo costi in *numen* e *gp* + scorta privata (`×18`) |
| `src/app/item-presets.ts` | `PresetMod`, `ItemPreset`, `ITEM_PRESETS` (182) | Preset numerici da *Ch 6a - Item Compendium* (134 magici, 46 alchimia, 2 munizioni) |
| `src/app/item-composite.ts` | `CompositePart`, `CompositeItem`, `COMPOSITE_ITEMS` (37) | Oggetti multi-parte ed eccezioni con totale stampato del libro |
| `src/app/item-calc.component.ts` | `ItemCalcComponent` · `/oggetti` | Interfaccia completa del calcolatore oggetti magici e composti |

---

## Asset (`src/assets/`)

- `src/assets/sfondi/sfondo-1.jpg` … `sfondo-5.jpg` (5 sfondi pergamena, ~2,3 MB totali)
- `src/assets/snapshot-1.jsonl` … `snapshot-12.jsonl` (12 partizioni NDJSON, ~151,6 MB totali, 636 documenti)
