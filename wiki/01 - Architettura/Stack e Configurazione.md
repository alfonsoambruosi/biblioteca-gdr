---
title: Stack e Configurazione
aliases:
  - Stack Tecnologico
  - Configurazione
type: architecture
tags:
  - biblioteca-gdr
  - architettura
  - angular
  - configurazione
status: completo
updated: 2026-11-26
---

# Stack e Configurazione

Torna a [[00 - Indice (MOC)]] · Correlati: [[Routing, Layout e Auth]], [[Flusso Dati e Cache]], [[Setup, Build e Deploy]]

---

## Stack tecnologico (`package.json` e `package-lock.json`)

Il progetto è un'applicazione client-side pura basata su **Angular 20** con build via `@angular/build` (esbuild/Vite) e senza alcun backend proprietario. Richiede **Node.js `>= 22.12.0`** (`engines.node` in `package.json`) e committa `package-lock.json` per garantire build riproducibili con `npm ci`.

### Dipendenze di runtime

| Pacchetto | Versione | Ruolo nel progetto |
|---|---|---|
| `@angular/core`, `common`, `compiler`, `forms`, `platform-browser`, `router` | `^20.0.0` | Framework SPA, standalone components, Signals, template control flow (`@if`, `@for`, `@switch`), router |
| `idb-keyval` | `^6.2.1` | Wrapper minimalista chiave-valore su **IndexedDB** (`get`, `getMany`, `set`, `setMany`, `del`) usato da [[Flusso Dati e Cache\|LibraryService]] |
| `mammoth` | `^1.8.0` | Conversione lato browser di file `.docx` (e Google Docs esportati in `.docx`) in HTML semantico (`mammoth/mammoth.browser`, caricato via `import()` dinamico) |
| `minisearch` | `^7.1.0` | Motore di ricerca full-text in memoria per sezioni con boosting, prefissi e combinazione `AND`/`OR` |
| `rxjs` | `~7.8.0` | Usato quasi esclusivamente per adattare `ActivatedRoute` (`paramMap`, `queryParamMap`) a Signals tramite `toSignal` e `map` |
| `zone.js` | `~0.15.0` | Change detection standard di Angular (configurato nei polyfill) |
| `tslib` | `^2.6.0` | Helper runtime TypeScript (`importHelpers: true`) |

### Dipendenze di sviluppo

| Pacchetto | Versione | Ruolo |
|---|---|---|
| `@angular/build` | `^20.0.0` | Builder `@angular/build:application` e dev server |
| `@angular/cli` | `^20.0.0` | CLI `ng serve`, `ng build` |
| `@angular/compiler-cli` | `^20.0.0` | Compilazione AOT e strict templates |
| `typescript` | `~5.8.0` | Compilatore TypeScript |

### Script NPM

| Comando | Definizione | Effetto |
|---|---|---|
| `npm start` | `ng serve` | Avvia dev server su `http://localhost:4200` (configurazione `development`) |
| `npm run build` | `ng build --base-href ./` | Build di produzione in `dist/biblioteca-gdr/browser` con percorsi relativi (`./`) |
| `npm run watch` | `ng build --watch --configuration development` | Build incrementale in modalità development |

> [!note] Assenza di librerie di test e linting
> Non sono presenti `jasmine`, `karma`, `vitest`, `eslint` o script `test`/`lint` in `package.json`.

---

## Configurazione build (`angular.json`)

- **Builder**: `@angular/build:application`
- **Output**: `dist/biblioteca-gdr` (i file web finali risiedono in `dist/biblioteca-gdr/browser`)
- **Entry points**:
  - `index`: `src/index.html`
  - `browser`: `src/main.ts`
  - `polyfills`: `["zone.js"]`
  - `assets`: `["src/assets"]` (copia `sfondi/`, `snapshot-core-1..2.jsonl` e `snapshot-bestiary-1..8.jsonl` in `dist/biblioteca-gdr/browser/assets/`)
  - `styles`: `["src/styles.css"]`
- **`allowedCommonJsDependencies`**: `["mammoth", "mammoth/mammoth.browser", "jszip", "lop", "bluebird", "underscore", "xmlbuilder", "sax", "argparse", "path-is-absolute", "dingbat-to-unicode"]` — elenco necessario per zittire i warning CommonJS generati da `mammoth` e dalle sue dipendenze transitive.
- **Budget di produzione**:
  - `initial`: warning `2MB`, error `5MB` (con il lazy loading delle rotte e di `mammoth` il bundle iniziale reale è sceso a ~`385 kB` raw / `107 kB` transfer).
  - `anyComponentStyle`: warning `8kB`, error `16kB`.
- **`outputHashing`**: `"all"` in produzione; `optimization: false`, `sourceMap: true` in development.
- **`cli.analytics`**: `false`.

---

## Configurazione TypeScript (`tsconfig.json`, `tsconfig.app.json`, `src/typings.d.ts`)

- **Strictness**: `strict: true`, `noImplicitOverride: true`, `noImplicitReturns: true`, `isolatedModules: true`, `strictTemplates: true`, `strictInjectionParameters: true`, `strictInputAccessModifiers: true`.
- **Eccezione intenzionale**: `noPropertyAccessFromIndexSignature: false` (consente l'accesso flessibile a record/risultati `MiniSearch`).
- **Target/Module**: `target: "ES2022"`, `module: "preserve"`, `moduleResolution: "bundler"`, `lib: ["ES2022", "dom"]`.
- **Ambient declaration (`src/typings.d.ts`)**: dichiara manualmente il modulo `mammoth/mammoth.browser` esponendo `MammothImage`, `images.imgElement(...)` (usato da `image-compress.ts` per la compressione WebP) e `convertToHtml({ arrayBuffer }, { styleMap?, includeDefaultStyleMap?, convertImage? })`.

---

## Configurazione applicativa (`src/environments/environment.ts`)

```ts
export const environment = {
  driveRootId: '1zyULW02GoZhcXmsVODW0m4jaxsKIcHkB',
  apiKey: 'INSERISCI_QUI_LA_TUA_API_KEY',
  mergeGroups: [
    { pattern: /^Ch\.?\s*8a?\b/i, name: 'Ch 8 + 8a - Spells e Spells Grimoire' },
  ] as { pattern: RegExp; name: string }[],
};
```

| Chiave | Tipo | Scopo |
|---|---|---|
| `driveRootId` | `string` | ID della cartella radice su Google Drive (condivisa pubblicamente in lettura). |
| `apiKey` | `string` | Chiave API Google Drive. Nel repo è presente il segnaposto `INSERISCI_QUI_LA_TUA_API_KEY`; in CI su GitHub Actions viene validato e sostituito a build time via script Node dal secret `DRIVE_API_KEY` (il job fallisce se vuoto o se il segnaposto manca; vedi [[Setup, Build e Deploy]]). `DriveService.configured` controlla `!!key && !key.startsWith('INSERISCI')`. |
| `mergeGroups` | `{ pattern: RegExp; name: string }[]` | Regole di fusione virtuale per file nella stessa cartella. Attualmente unisce `Ch 8 - Spells` e `Ch 8a - Spells Grimoire` in un unico documento virtuale. **Effetto collaterale importante**: le stesse regex sono usate da `LookupService.spellDocIds()` per individuare quali documenti contengono le spell! |

---

## HTML e Bootstrap (`src/index.html`, `src/main.ts`, `.gitignore`)

- `src/index.html`: lingua `it`, `<title>Biblioteca GDR</title>`, `<base href="./">`, viewport responsive, `<meta name="theme-color" content="#1f2a44">` (nota: colore blu scuro residuo rispetto al tema pergamena/ceralacca attuale).
- `src/main.ts`: avvia `bootstrapApplication(AppComponent, appConfig)`.
- `.gitignore`: ignora solo `node_modules/`, `dist/`, `.angular/`, `.DS_Store`.
