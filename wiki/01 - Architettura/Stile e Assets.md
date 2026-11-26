---
title: Stile e Assets
aliases:
  - Tema Grafico
  - CSS e Sfondi
  - Icone
type: architecture
tags:
  - biblioteca-gdr
  - architettura
  - css
  - ui
  - assets
status: completo
updated: 2026-11-26
---

# Stile e Assets

Torna a [[00 - Indice (MOC)]] · Correlati: [[Stack e Configurazione]], [[Navigazione e Lettura Documenti]], [[Sicurezza, Limiti e Debito Tecnico]]

---

## Tema visivo ("Pergamena logora e invecchiata")

Tutto lo styling globale dell'app è concentrato in un unico file `src/styles.css` (294 righe), senza framework CSS esterni né preprocessori. L'unico componente con stili incapsulati locali è `IconComponent`.

### Tipografia
Importata da Google Fonts nella prima riga di `src/styles.css`:
- **Titoli, brand, pulsanti, formule**: `Cinzel` (`600`, `700`), fallback `Georgia, serif`.
- **Corpo del testo**: `EB Garamond` (`400`, `600`, `italic 400`), fallback `Georgia, 'Times New Roman', serif`, base `18px` (`17px` sotto 600px).

> [!tip] Uso offline
> Se l'app viene aperta completamente offline senza cache browser di Google Fonts, ricade automaticamente su `Georgia` e `Times New Roman`.

### Palette e variabili CSS (`:root`)

| Variabile | Valore | Ruolo |
|---|---|---|
| `--bg-image` | `url('assets/sfondi/sfondo-1.jpg')` | Sfondo pergamena attivo (sostituibile con `sfondo-1`..`5.jpg`) |
| `--paper` | `#d2b87f` | Tono base carta |
| `--panel-dark` | `#bfa068` | Pannello inferiore `.seed-panel` (due toni più scuro) |
| `--paper-light` | `#e3cf9d` | Carta chiara |
| `--paper-deep` | `#b8985c` | Carta scura |
| `--line` | `rgb(78 52 24 / 0.55)` | Bordi e filetti "inchiostro sbiadito" |
| `--panel` | `rgb(219 197 144 / 0.86)` | Sfondo semitrasparente per card, contenuto, liste, risultati |
| `--ink` | `#261b10` | Testo principale |
| `--ink-soft` | `#55402a` | Testo secondario / `.muted` |
| `--wax` | `#6e2018` | Colore accento "ceralacca" (link, brand, errori, chip attivi, icone) |
| `--wax-light` | `#8a2d20` | Hover ceralacca |
| `--wax-dark` | `#4a140e` | Bordi pulsanti ceralacca |
| `--mark` | `#e0b84a` | Evidenziazione `<mark>` nei risultati di ricerca |
| `--leather` | `#3a2816` | Fallback sfondo dietro la pergamena |
| `--cream` | `#ecdcb4` | Testo chiaro su sfondo ceralacca |

Effetto vignettatura: `body::before` applica un `radial-gradient` fisso scuro verso i bordi dello schermo (`pointer-events: none; z-index: 0`), mentre `app-root` resta a `z-index: 1`.

---

## Breakpoint Responsive

| Breakpoint | Comportamento |
|---|---|
| Desktop (`>= 900px`) | `.page` larga max `980px` (`1240px` quando contiene `.doc-wrap` tramite `:has(.doc-wrap)`). Indice laterale `.side` sticky a sinistra (`width: 15.5rem` quando aperto). |
| Tablet / schermi stretti (`<= 899px`) | `.toc-side` diventa un drawer fisso a sinistra (`width: min(18rem, 85vw)`, `z-index: 40`) e `.toc-toggle` resta fisso in alto a sinistra (`z-index: 41`). |
| Smartphone (`<= 600px`) | `body` scende a `17px`, padding ridotto, barra ricerca e azioni su righe dedicate (`flex-basis: 100%`), griglia `.cards` a singola colonna (`1fr`). Input sempre a `16px` per evitare auto-zoom su iOS/Safari. |

---

## Sistema di Icone (`src/app/icon.component.ts`)

`IconComponent` (`<app-icon [name]="...">`) disegna 9 icone SVG inline con stroke in `currentColor` (eredita `color: var(--wax)`). La funzione `iconFor(name, isFolder = true)` assegna automaticamente l'icona in base al nome della cartella o del file:

| `IconKey` | Regex di attivazione (case-insensitive) | Impiego tipico |
|---|---|---|
| `dragon` | `/bestiar\|mostri\|creature\|monster/` | Cartella Bestiary e relativi documenti |
| `shield` | `/class/` | Cartella Classes |
| `scroll` | `/skill\|feat\|talent\|abilit/` | Cartella Skills, Feats, etc |
| `spell` | `/spell\|incantesim\|magia\|grimoire\|\bch\s?8/` | Capitoli incantesimi e card Incantesimi per classe |
| `gem` | `/magic item\|oggett\|tesor\|item/` | Item Compendium e card Creazione oggetti magici |
| `lantern` | `/lumen/` | Contenuti legati a Lumen |
| `people` | `/razz\|race\|specie\|people/` | Razze / specie |
| `folder` | Default se `isFolder === true` | Cartelle generiche |
| `book` | Default se `isFolder === false` | Documenti generici |

---

## Inventario `src/assets/`

### Sfondi pergamena (`src/assets/sfondi/`)
5 immagini JPEG generate proceduralmente (prive di diritti di terzi), ~0,43–0,51 MB ciascuna:
- `sfondo-1.jpg` (0,49 MB — **attivo di default** in `styles.css`)
- `sfondo-2.jpg` (0,43 MB)
- `sfondo-3.jpg` (0,51 MB)
- `sfondo-4.jpg` (0,43 MB)
- `sfondo-5.jpg` (0,45 MB)

### Snapshot precompilati (`src/assets/snapshot-1..12.jsonl`)
12 file NDJSON generati il `2026-11-21T14:48:46.511Z`, per un totale di **~151,6 MB** e **636 documenti**:
- `snapshot-1.jsonl` (13,37 MB) — contiene anche l'intero albero `tree`
- `snapshot-2.jsonl` … `snapshot-9.jsonl` (~13,6–14,3 MB ciascuno)
- `snapshot-10.jsonl` (9,82 MB)
- `snapshot-11.jsonl` (12,94 MB)
- `snapshot-12.jsonl` (2,08 MB)

> [!info] Stile dei termini auto-collegati
> I termini collegati automaticamente nei testi (`<span class="term-link">`) usano `.term-link` in `src/styles.css` (colore `--wax`, grassetto `600`, sottolineatura puntinata e `cursor: pointer`).
