---
title: Incantesimi per Classe
aliases:
  - Spellbook
  - SpellbookComponent
  - Liste Incantesimi
type: feature
tags:
  - biblioteca-gdr
  - funzionalita
  - spellbook
  - incantesimi
status: completo
updated: 2026-11-26
---

# Incantesimi per Classe

Torna a [[00 - Indice (MOC)]] · Correlati: [[Parser, Formule Spell e Lookup]], [[Calcolatore Oggetti Magici]], [[Modelli Dati]]

---

## Scopo e funzionamento (`src/app/spellbook.component.ts`, rotta `/incantesimi`)

La vista **Incantesimi per classe** aggrega in un'unica schermata filtrabile sia le spell lette dinamicamente dai documenti del Google Drive sia due elenchi statici incorporati nel codice (`src/app/extra-lists.ts`).

### Origine delle liste (`SpellbookComponent.book`)
Il `computed` `book()` si aggiorna a ogni cambio di `library.version()` e costruisce una struttura `Map<lista, Map<livello, SpellRef[]>>` combinando:

1. **Liste dinamiche dal Drive (`LookupService.spellBook()`)**:
   - Letto dalle righe `Level ...` di tutte le voci di spell (`h5.spell-entry`, `level === 5`).
   - Esempio: `Level arcane 1, divine 1` popola sia la chiave `arcane` (livello 1) sia `divine` (livello 1).
   - Etichette tradotte: `arcane` → **Mago**, `divine` → **Divina**, `rogue` → **Ladro**; ogni altra chiave viene capitalizzata (es. `bard` → `Bard`).
2. **Manovre della Mano d'Ombra (`SHADOW_HAND`) → aggiunte alla lista `arcane` (Mago)**:
   - **25 manovre** di *Tome of Battle: The Book of Nine Swords* (D&D 3.5), livelli 1–9.
   - Non essendo nel Drive (e non includendo testo coperto da copyright), ogni voce punta a una ricerca Google (`onlineUrl(name, 'maneuver Tome of Battle 3.5')`), aperta in nuova scheda (`target="_blank" rel="noopener"`).
3. **Trucchi / Spell del Ladro (`ROGUE_TRICKS`) → lista `rogue` (Ladro)**:
   - **332 voci** (livelli 1–7, raggruppate per abilità: *Acrobatics*, *Athletics*, *Bluff*, *Craft (Alchemy)*, *Craft (Toxicology)*, *Diplomacy*, *Disable Device*, *Endurance*, *Escape Artist*, *Knowledge (...)*, *Perception*, *Perform (Acting)*, *Sleight of Hand*, *Spellcraft*, *Stealth*, *Streetwise*, *Survival*, *Any*).
   - Per ogni voce esegue `lookup.findEntries(r.name)[0]`:
     - Se trovata nei documenti del Drive → link interno diretto `[routerLink]="['/doc', docId]" [fragment]="anchor"`.
     - Se assente dal Drive → link esterno di ricerca Google (`onlineUrl(name, 'spell Pathfinder 1e 3.5')`) con dicitura `(cerca online)`.

---

## Interfaccia e ordinamento

- **Chip delle liste**: ordinati mettendo sempre **Mago (`arcane`)** per primo, e poi le altre liste per numero decrescente di incantesimi; ogni chip mostra il conteggio totale.
- **Chip dei livelli**: generati dinamicamente dalle chiavi numeriche della lista selezionata, in ordine crescente. Quando si cambia lista con `pick(key)`, se il livello selezionato non esiste nella nuova lista (es. passando da Mago livello 0 a Ladro che parte da livello 1), seleziona automaticamente il primo livello disponibile.
- **Filtro testuale**: campo `search` con debounce di `120 ms` (`filter` signal, azzeramento istantaneo se svuotato) case-insensitive sul nome; le voci risultanti sono ordinate alfabeticamente (`localeCompare('en', { sensitivity: 'base' })`).
- **Metadato a destra**: nome del documento di origine per le spell del Drive, oppure `<Abilità> · Ladro` / `Mano d'Ombra (Tome of Battle) · livello N`.

---

## Dati statici (`src/app/extra-lists.ts`)

| Esportazione | Tipo | Quantità | Note |
|---|---|---|---|
| `ROGUE_TRICKS` | `ListItem[]` | 332 elementi | Estratto dal documento *Rogue* (cap. 3); contiene solo `level`, `group`, `name`. Rilevato almeno un duplicato esatto (`insightful feint` lvl 1 Bluff alle righe 128 e 132). |
| `SHADOW_HAND` | `ListItem[]` | 25 elementi | Livelli 1–9, `group: "Mano d'Ombra"`. |
| `onlineUrl(name, suffix)` | `(string, string) => string` | — | Costruisce `https://www.google.com/search?q=...` con `encodeURIComponent`. |
