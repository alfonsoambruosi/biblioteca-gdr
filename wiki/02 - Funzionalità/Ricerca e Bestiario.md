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

- `scope: 'all'` (usato dalla barra globale in `ShellComponent` → `SearchComponent` e dal fallback di `LookupService.explain()`): **esclude sempre** tutti i documenti che si trovano dentro una cartella il cui nome matcha `/bestiar|bestiary/i`.
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
- Montato automaticamente da `FolderComponent` quando `inBestiary()` è `true` (sia nella radice di `Bestiary` sia in qualunque sottocartella come `Aberrations`, `Aquatic`, ecc.).
- Ricerca live su segnale locale `query` (senza cambiare URL) chiamando `library.search(q, 150, 'bestiary')`.
- Mostra gli stessi blocchi `.hit` con breadcrumb del documento, titolo sezione e snippet evidenziato.
