---
title: Calcolatore Oggetti Magici
aliases:
  - Item Calculator
  - ItemCalcComponent
  - Creazione Oggetti Magici
type: feature
tags:
  - biblioteca-gdr
  - funzionalita
  - calcolatore
  - oggetti-magici
  - numen
status: completo
updated: 2026-11-26
---

# Calcolatore Oggetti Magici

Torna a [[00 - Indice (MOC)]] · Correlati: [[Incantesimi per Classe]], [[Parser, Formule Spell e Lookup]], [[Modelli Dati]]

---

## Panoramica (`rotta /oggetti`)

Calcolatore interattivo per la creazione di oggetti magici, alchimia/veleni e oggetti composti, distribuito su **4 file**:
- `src/app/item-calc.ts` — Motore di calcolo puro
- `src/app/item-presets.ts` — **182 preset** estratti da *Ch 6a - Item Compendium*
- `src/app/item-composite.ts` — **37 oggetti composti** multi-parte o con eccezioni rispetto alla formula
- `src/app/item-calc.component.ts` — Interfaccia utente a 5 sezioni

---

## 1. Motore di calcolo (`src/app/item-calc.ts`)

### Formula base (`calcItem(input)`)

$$\text{Livello finale} = \max\left(0,\; \text{baseLevel} + \sum_{m \in \text{mods attivo}} m.\text{adj}\right)$$

$$\text{Livello effettivo} = \begin{cases} 0{,}5 & \text{se Livello finale} = 0 \\ \text{Livello finale} & \text{altrimenti} \end{cases}$$

$$\text{Totale} = \text{Livello effettivo} \times \text{CL} \times \text{price} \times \text{multiplier}$$

### Regole speciali per unità di misura
- **Trucchetti (livello finale `0`)**: nel calcolo del costo (sia `numen` sia `gp`) il livello `0` viene sempre considerato **`0,5`** (es. alchimia a CL 1 e 50 gp = `0,5 × 1 × 50 = 25 gp`; uso attivato CL 1 e 500 numen = `250 numen`).
- **`unit: 'numen'`** (default — oggetti magici, armi, armature, munizioni):
  - Prezzo base tipico di default: `500` (uso attivato), `900` (a comando), `1000` (continuo), `750` (armi a energia/futuristiche), `50` (uso singolo).
  - `stockNumen = null`.
- **`unit: 'gp'`** (alchimia e veleni — *gp a dose*):
  - Prezzo base di default: `50 gp` per livello × CL.
  - **Scorta privata in numen**: `stockNumen = total * STOCK_RATIO`, con `STOCK_RATIO = 18`.

### Estrazione automatica della variazione di livello (`levelAdjFromText`)
Legge il testo della sezione della biblioteca cercando:
1. `/Metamagic Cost:\s*\+\s*(\d+)\s+levels?/i`
2. In fallback `/\+\s*(\d+)\s+levels?\b/i`

Restituisce il numero trovato oppure `null` (in tal caso il modificatore viene aggiunto con `adj = 0` e `source = 'manuale'`).

---

## 2. Dataset integrati

### Preset a formula singola (`src/app/item-presets.ts`)
Contiene **182 `ItemPreset`** verificati rispetto al totale stampato nel Compendio (*Ch 6a*), ripartiti per categoria:

| Categoria (`category`) | Unità (`unit`) | Quantità | Descrizione UI |
|---|---|---:|---|
| `magico` | `numen` | 134 | Oggetti magici e armi (numen) |
| `alchimia` | `gp` | 46 | Alchimia e veleni (gp a dose) + eventuale `stock` |
| `munizione` | `numen` | 2 | Frecce e dardi (numen a pezzo — voci *Slaying* inserite a mano) |

Ogni preset include anche `excluded: string[]`: quando viene caricato (`loadPreset()`), le variazioni presenti in `excluded` vengono comunque elencate nella UI ma con la spunta `on: false`, riproducendo fedelmente i casi in cui il Compendio non conteggia un modificatore nel livello finale.

### Oggetti composti ed eccezioni (`src/app/item-composite.ts`)
Contiene **37 `CompositeItem`** che o combinano più parti (es. *Null Blade*, *Holy Avenger*, *Luck Blade*, *Frost Brand*, *Staff of Withering*) oppure presentano nel libro un totale stampato (`stated`) che diverge dalla formula o ha livelli frazionari/livello 0 (es. *Belt of Dwarvenkind*, *Rope of Entanglement*, *Potion of Longevity*, *Belladonna*, *Grinding*).

Ogni parte (`CompositePart`) è una union discriminata:
- `{ kind: 'formula', label, level, cl, price, mult }` → valore `(level === 0 ? 0.5 : level) * cl * price * mult`
- `{ kind: 'fixed', label, total }` → valore fisso stampato dal libro

> [!info] Fedeltà al manuale
> Dove il manuale stampa un totale diverso dalla somma delle parti o dalla formula, la UI **non altera il libro** ma evidenzia la discrepanza (`Non coincide: il libro stampa X, le parti incluse danno Y`) e mostra l'eventuale campo `note`.

---

## 3. Struttura dell'interfaccia (`src/app/item-calc.component.ts`)

La pagina è organizzata in 5 blocchi sequenziali (`.calc-block`) con debounce di `120 ms` sui 3 campi di ricerca:

1. **Sezione 0 — Oggetto del Compendio (facoltativo)**:
   - Filtro per categoria + ricerca testuale sui 182 `ITEM_PRESETS` (max 500 opzioni).
   - Selezionando un preset, popola automaticamente spell base (agganciandola alla lista `arcane` se presente, altrimenti con i dati del preset), `mods`, `unit`, `cl`, `price`, `multiplier`, e memorizza `presetTotal`/`presetStock` per il confronto finale.
2. **Sezione 1 — Spell base**:
   - Popolata dinamicamente da `lookup.spellBook().get('arcane')` prendendo il livello minimo di ciascuna spell, ordinata alfabeticamente (`localeCompare('it')`), filtrabile (max 400 opzioni).
3. **Sezione 2 — Variazioni**:
   - 4 tipologie selezionabili da menu a tendina (`KINDS`):
     - `metamagia`: sezioni con `level >= 3` dai documenti il cui nome matcha `/Ch 8/i` e il cui titolo contiene `[...Metamagic...]` + voci editoriali `CUSTOM_ENTRIES` (`Effect-Specific Spell`, `-2 livelli`) + componenti dei preset con `\bSpell\b|Evocation` assenti dalla biblioteca.
     - `talento`: sezioni con `level >= 3` dai documenti il cui nome matcha `/Feat/i`.
     - `abilita`: sezioni con `level >= 3` dai documenti il cui nome matcha `/Skill/i`.
     - `proprieta`: componenti dei preset non classificati come metamagia e assenti dalla biblioteca (es. `ghost touch`, `Crippling Drain`, `Fell Frightening`).
   - Elenco delle variazioni scelte con checkbox `conta` (`toggle`), campo numerico modificabile `livelli` (`setAdj`, marca `source: 'manuale'`), badge `dal testo` / `manuale`, pulsante `Rimuovi`.
   - Riga di inserimento rapido per **variazioni manuali** arbitrarie (`addManual`).
4. **Sezione 3 — Parametri**:
   - Selettore unità (`numen` / `gp` — cambiare unità aggiorna il prezzo base di default a `500` o `50`), `CL` (min 1), `Prezzo base`, `Moltiplicatore durata/uso` (`step="any"`).
5. **Risultato (`aria-live="polite"`)**:
   - Livello finale, formula esplicita passo-passo, totale formattato (`it-IT`), scorta privata (se `gp`), e verifica di corrispondenza (`Math.abs(total - presetTotal) < 0.5`) se si è partiti da un preset.
6. **Sezione 4 — Oggetti composti (più parti)**:
   - Selettore dei 37 `COMPOSITE_ITEMS`, checklist delle singole parti con valore calcolato/fisso, somma dinamica delle sole parti spuntate, confronto con `stated` e note editoriali.
