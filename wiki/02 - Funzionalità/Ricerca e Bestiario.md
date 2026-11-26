---
title: Ricerca e Bestiario
aliases:
  - Motore di Ricerca
  - Ricerca Bestiario
  - SearchComponent
  - BestiarySearchComponent
type: feature
tags:
  - biblioteca-gdr
  - funzionalita
  - ricerca
  - minisearch
  - bestiario
status: completo
updated: 2026-11-26
---

# Ricerca e Bestiario

Torna a [[00 - Indice (MOC)]] · Correlati: [[Flusso Dati e Cache]], [[Navigazione e Lettura Documenti]], [[Parser, Formule Spell e Lookup]]

---

## Separazione intenzionale: Regole vs Bestiario

Il Bestiario contiene da solo **666 documenti** su ~732 dell'intera biblioteca. Per evitare che le ricerche sulle regole (spell, feat, classi, abilità) vengano sommerse da schede di mostri che citano quegli stessi termini, `LibraryService.search(query, limit = 150, scope = 'all')` applica una separazione netta tramite `isBestiary(docId)`:

- `scope: 'all'` (usato dalla barra globale in `ShellComponent` → `SearchComponent` e dal fallback di `LookupService.explain()`): **esclude sempre** tutti i documenti che si trovano dentro una cartella il cui nome matcha `/bestiar|bestiary/i`. Include anche i titoli delle voci editoriali in `CUSTOM_DOC_META` (`Effect-Specific Spell [Metamagic]`).
- `scope: 'bestiary'` (usato da `BestiarySearchComponent`): cerca **esclusivamente** dentro il Bestiario.

---

## Algoritmo di ricerca e ranking (`LibraryService.search`)

```mermaid
flowchart TD
    Q["Query utente q"] --> P{"Racchiusa tra\nvirgolette \"...\"?"}
    P -- Sì --> PH["phrase = contenuto\n(match esatto sottostringa)"]
    P -- No --> TX["text = q"]
    PH & TX --> T1["1. Exact Heading Match\nnormTerm(heading) === normTerm(text)\nordinato per level ASC (h1..h5 prima di h6 formula)"]
    T1 --> T2["2. StartsWith Heading Match\nnormTerm(heading).startsWith(key)"]
    T2 --> T3["3. Full-text MiniSearch\nprima combineWith: 'AND'\nse 0 risultati e non phrase -> 'OR'"]
    T3 --> DEDUP["Deduplicazione per docId#anchor\n+ filtro scope + slice(0, limit)"]
```

### Dettagli tecnici
1. **Normalizzazione e tokenizzazione**:
   - L'indice `MiniSearch` indicizza ogni `Section` di ogni `DocMeta` con campi `heading` (boost `3×`) e `text`, con `prefix: true`.
   - Tokenizzatore: `/[^\p{L}\p{N}’']+/u`; ogni token è convertito in minuscolo rimuovendo apostrofi dritti e curvi.
2. **Priorità dei risultati**:
   - **Fascia 1 (Titolo esatto)**: es. cercando `Fireball`, la voce `Fireball` compare prima di qualsiasi menzione nel testo; a parità di titolo, i titoli veri (`level 1..5`) precedono le righe-formula (`level 6`).
   - **Fascia 2 (Prefisso titolo)**: sezioni il cui `normTerm(heading)` inizia per la query.
   - **Fascia 3 (Pertinenza full-text)**: risultati `MiniSearch` (`AND`, con fallback a `OR` se la query non è tra virgolette e `AND` non trova nulla). Se la query è tra virgolette (`"..."`), verifica in aggiunta che `heading + ' ' + text` contenga la frase esatta case-insensitive.
3. **Generazione snippet (`snippet()`)**:
   - Trova la prima occorrenza nel testo di uno qualsiasi dei termini di ricerca.
   - Ritaglia una finestra da `pos - 90` lunga `320` caratteri (con `…` ai margini se troncata).
   - Esegue escape HTML (`esc()`) e poi racchiude in `<mark>...</mark>` ogni termine lungo almeno 2 caratteri (regex case-insensitive con caratteri speciali escapati).
4. **Limite predefinito**: `150` risultati per query.

---

## Componenti UI

### `SearchComponent` (`src/app/search.component.ts`, rotta `/cerca?q=...`)
- Riceve la query dal parametro URL `q` (impostato dal form nella top bar di `ShellComponent`).
- Ricalcola reattivamente i risultati ogni volta che cambia `q()` o `library.version()` (così se i download in background completano mentre si guarda la pagina, i risultati si aggiornano da soli).
- Un `effect()` riporta lo scroll in cima (`window.scrollTo({ top: 0 })`) a ogni cambio query.
- Ogni risultato (`.hit`) è un link `[routerLink]="['/doc', h.docId]" [fragment]="h.anchor"` che porta direttamente al punto esatto del documento.

### `BestiarySearchComponent` (`src/app/bestiary-search.component.ts`)
- Montato automaticamente da `FolderComponent` quando `inBestiary()` è `true` (sia nella radice di `Bestiary` sia in qualunque sottocartella come `Aberrations`, `Aquatic`, ecc.), sotto il banner di accesso rapido a `/bestiario`.
- Ricerca live con debounce di `150 ms` su segnale locale `query` (azzeramento istantaneo se svuotato, senza cambiare URL) chiamando `library.search(q, 150, 'bestiary')`.
- Mostra gli stessi blocchi `.hit` con breadcrumb del documento, titolo sezione e snippet evidenziato.

---

## Bestiario filtrabile e Generatore di Incontri (`/bestiario`)

Introdotto per consultare le **~2.080 singole creature** (estratte dalle 629 schede del Bestiario) e generare incontri bilanciati in pochi clic, è suddiviso in 4 moduli:

### 1. Indicizzazione per singola creatura (`src/app/bestiary-index.ts`)
- `extractBestiaryEntries(meta, pathNodes)` raggruppa le sezioni `h1`/`h2` di ogni scheda con le rispettive sotto-sezioni `h3`–`h6` ed estrae una `BestiaryEntry` per ogni creatura dotata di stat-block CR a fine riga (`CR_EOL_RE = /(?:^|\s)CR\s*(\d+(?:\/\d+)?|[½¼⅓⅛])\s*$/gim`, evitando falsi positivi inline nel testo).
- Ogni voce porta `id` (`${docId}#${anchor}`), `docId`, `docName`, `anchor`, `name` ripulito, `letter` (`A`–`Z`/`#`), `category` / `subcategory` derivate dal percorso cartelle, `crs` (`crMin`, `crMax`, `crLabel`), `sizes` (`Fine`…`Colossal`) ed `envs` (11 gruppi in `BESTIARY_ENV_GROUPS`).
- I documenti introduttivi o template privi di CR restano consultabili come voce unica di documento.

### 2. Interfaccia a 3 viste (`src/app/bestiary.component.ts`)
- **Catalogo filtrabile**:
  - Ricerca testuale con debounce `150 ms`, con priorità ai nomi di creatura (`name`) seguiti dalle creature presenti in pagine col titolo corrispondente (`docName`).
  - Filtri ordinati: `Ordina per` (`Nome A→Z`, `Nome Z→A`, `CR crescente`, `CR decrescente`), `Tipo` (con conteggio), `Sottocategoria` (dinamica), `Ambiente`, `Taglia`, barra **Grado di Sfida (CR)** a doppio cursore (`1/8`–`30+`, `CR_OPTIONS`) e barra alfabetica `A`–`Z` / `#` (tutte le 27 lettere sono sempre attive e cliccabili).
  - Paginazione incrementale a blocchi di `100` (`BESTIARY_PAGE_SIZE`); ogni riga linka direttamente a `/doc/:docId#anchor?from=bestiario` (mostrando `in <Documento>` se la creatura è una sotto-sezione).
- **Generatore incontri**:
  - Parametri gruppo: numero giocatori (`1–12`), livello medio (`1–20`), 7 livelli di difficoltà stile DOOM (`−1` *I'm just a baby boy*, `+0` *I'm Too Young to Die*, `+1` *Hey, Not Too Rough* di default, `+2` *Hurt Me Plenty*, `+3` *Ultra-Violence*, `+4` *Nightmare!*, `+5` *Dante Must Die*) e composizione (`Casuale`, `Boss singolo`, `Piccolo gruppo 2–4`, `Boss + gregari`, `Orda 4–8`), più filtri opzionali per Tipo, Sottocategoria, Ambiente e Taglia.
  - Motore XP Pathfinder 1e / D&D 3.5 (`src/app/encounter-gen.ts`): calcola budget XP (`encounterBudgetXp`), CR stimato (`estimateCrFromXp`), XP totali e per giocatore, e consente di regolare la quantità (`−`/`+`) o sostituire un singolo slot (`rerollSlot`, deduplicato per `entry.id`) mantenendo un CR compatibile. I link alle creature passano `?from=incontro`.
- **Per cartelle**: vista ad albero delle sottocartelle originali del Drive e dei file introduttivi nella radice di `Bestiary`.

### 3. Persistenza stato tra navigazioni (`src/app/bestiary-state.service.ts`)
- Servizio singleton (`providedIn: 'root'`) che conserva tutti i signal di Catalogo (vista attiva, filtri, slider CR, lettera, ordinamento, paginazione) e Generatore (parametri gruppo, filtri e `encSlots` dell'ultimo incontro generato), così tornando indietro da `DocComponent` tramite **← Torna al Bestiario** o **← Torna all’incontro generato** si ritrova l'esatto stato precedente.
