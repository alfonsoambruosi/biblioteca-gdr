---
title: Modelli Dati e Storage
aliases:
  - Modelli Dati
  - Interfacce TypeScript
  - Storage Browser
type: reference
tags:
  - biblioteca-gdr
  - riferimento
  - modelli
  - typescript
  - storage
status: completo
updated: 2026-11-26
---

# Modelli Dati e Storage

Torna a [[00 - Indice (MOC)]] · Correlati: [[Flusso Dati e Cache]], [[Mappa Completa dei File]]

---

## Modelli core (`src/app/models.ts`)

| Tipo / Interfaccia | Campi principali | Usato in |
|---|---|---|
| `NodeKind` | `'folder' \| 'docx' \| 'gdoc' \| 'text' \| 'other'` | `DriveService`, `LibraryService`, `LookupService`, `HomeComponent`, `FolderComponent` |
| `TreeNode` | `id`, `name`, `kind`, `modifiedTime?`, `size?`, `children?: TreeNode[]`, `parts?: TreeNode[]` | Albero gerarchico del Drive; `parts` è valorizzato solo nei nodi virtuali fusi da `mergeGroups` |
| `Section` | `id` (es. `s-12`, `p0-4`, `s-f3`), `heading`, `level` (`1..6`), `text` | Unità atomica di indicizzazione (MiniSearch), TOC (`level <= 5`), Spellbook (`level === 5`), formule (`level === 6`) |
| `DocMeta` | `id`, `name`, `modifiedTime`, `size`, `parser?: number`, `sections: Section[]` | Metadati persistenti in IndexedDB (`meta:<id>`) e negli snapshot |
| `SearchHit` | `docId`, `docName`, `path`, `anchor`, `heading`, `snippet` (HTML escapato con `<mark>`) | Risultati di `LibraryService.search()` |
| `Snapshot` | `generatedAt`, `tree`, `docs: Record<string, { meta, html }>` | Tipo legacy/documentativo (il formato runtime attuale è NDJSON streaming per riga in `snapshot-N.jsonl`) |

---

## Tipi di dominio negli altri moduli

| File | Tipo / Interfaccia | Struttura / Scopo |
|---|---|---|
| `doc-parser.ts` | `FormulaTerm` | `{ name: string; base: number \| null }` — componente di una formula (`base` = livello 0–9 per semi, `null` per metamagie) |
| `doc-parser.ts` | `ParseResult` | `{ html: string; sections: Section[] }` |
| `lookup.service.ts` | `EntryRef` | `{ docId, docName, anchor, heading, level }` (`1..5` voce vera, `6` riga-formula) |
| `lookup.service.ts` | `SpellRef` | `{ name, docName, docId?, anchor?, url? }` (interno se `docId` presente, altrimenti ricerca online `url`) |
| `term-links.ts` | `TermTarget` | `{ docId, docName, anchor, heading, level }` |
| `term-links.ts` | `TermMap` | `{ map: Map<string, TermTarget>; maxWords: number }` |
| `term-links.ts` | `TextPart` | `{ text: string; ref?: TermTarget }` |
| `extra-lists.ts` | `ListItem` | `{ level: number; group: string; name: string }` |
| `device.ts` | `DeviceKind` | `'smartphone' \| 'tablet' \| 'pc'` |
| `icon.component.ts` | `IconKey` | `'dragon' \| 'shield' \| 'scroll' \| 'spell' \| 'gem' \| 'lantern' \| 'people' \| 'book' \| 'folder'` |
| `item-calc.ts` | `ModKind` | `'metamagia' \| 'talento' \| 'abilita' \| 'proprieta' \| 'manuale'` |
| `item-calc.ts` | `Modifier` | `{ kind, name, adj, on, source: 'biblioteca' \| 'manuale' }` |
| `item-calc.ts` | `ItemInput` / `ItemResult` | Input e output di `calcItem()` (con `unit?: 'numen' \| 'gp'`, `stockNumen: number \| null`, `formula: string`) |
| `item-presets.ts` | `PresetMod`, `ItemPreset` | Scheda numerica preset (`category: 'magico' \| 'alchimia' \| 'munizione'`, `base`, `mods`, `excluded`, `cl`, `price`, `multiplier`, `total`, `stock`, `qualifier`) |
| `item-composite.ts` | `CompositePart`, `CompositeItem` | Parti `'formula'` o `'fixed'`, `stated`, `unit`, `note?` |

---

## Mappa completa dello Storage nel Browser

| Meccanismo | Chiave | Valore salvato | Gestito da |
|---|---|---|---|
| **IndexedDB** (`idb-keyval`, store default `keyval`) | `tree` | `TreeNode` radice dell'intera biblioteca | `LibraryService` |
| **IndexedDB** | `meta:<docId>` | `DocMeta` (sezioni, versione parser, `modifiedTime`) | `LibraryService` |
| **IndexedDB** | `html:<docId>` | Stringa HTML arricchita da `enrichHtml()` / `plainParse()` | `LibraryService` |
| **IndexedDB** | `lastCheck` | Stringa ISO data ultima verifica Drive completata | `LibraryService` |
| **IndexedDB** | `snapshotAt` | Stringa ISO `generatedAt` dell'ultimo snapshot importato | `LibraryService` |
| **`sessionStorage`** | `bgdr-session` | `'ok'` quando autenticato nella scheda corrente | `AuthService` |
| **`localStorage`** | `bgdr-toc` | `'1'` (indice aperto) o `'0'` (indice chiuso) | `DocComponent` |
| **`localStorage`** | `bgdr-panel-h` | Altezza in pixel (stringa numerica) del pannello inferiore | `DocComponent` |
