---
title: Sicurezza, Limiti e Debito Tecnico
aliases:
  - Analisi Critica
  - Bug e Limiti Noti
  - Debito Tecnico
  - Sicurezza
type: analysis
tags:
  - biblioteca-gdr
  - sicurezza
  - debito-tecnico
  - bug
  - manutenzione
status: completo
updated: 2026-11-26
---

# Sicurezza, Limiti e Debito Tecnico

Torna a [[00 - Indice (MOC)]] · Correlati: [[Stack e Configurazione]], [[Routing, Layout e Auth]], [[Flusso Dati e Cache]], [[Stile e Assets]]

---

## 1. Profilo di sicurezza

### Autenticazione client-side e chiave API
- **Login (`admin` / `0000`)**: validato interamente lato browser (`src/app/auth.service.ts`). Chiunque ispezioni il bundle JS può leggere credenziali, `driveRootId` e `apiKey`.
- **Condivisione Drive pubblica**: la cartella Drive è accessibile in lettura a chiunque abbia il link o l'ID. La chiave API, pur iniettata via GitHub Secrets in build time, finisce comunque nel bundle pubblico servito al browser.
- **Unica mitigazione effettiva attuale**: restrizione per **HTTP Referrer** e per **API** (solo Google Drive API) sulla console Google Cloud.
- **Contenuti di terze parti**: i manuali contengono testi/regole potenzialmente coperti da copyright; se il repository è pubblico su GitHub, anche i 10 file `src/assets/snapshot-*.jsonl` (~121,3 MB) sono pubblicamente leggibili da chiunque sul repository.

> [!danger] Cronologia Git di `src/environments/environment.ts`
> Dalla history Git (`git log`) risultano diversi commit passati che hanno modificato `src/environments/environment.ts` (es. *"Update API key in environment configuration"*). Anche se oggi il file contiene il segnaposto `INSERISCI_QUI_LA_TUA_API_KEY`, eventuali chiavi committate in passato restano visibili nella cronologia Git. **Azione consigliata**: verificare su Google Cloud Console che eventuali vecchie chiavi siano revocate o strettamente limitate per referrer e quota, oppure ripulire la history se necessario.

### Sanitizzazione HTML (`bypassSecurityTrustHtml`) e iframe Google Sheets (`SheetComponent`)
- `DocComponent` inserisce l'HTML dei documenti e dei pannelli con `DomSanitizer.bypassSecurityTrustHtml()` per preservare `id`, `data-*`, tabelle e bottoni. È sicuro solo assumendo che chi ha accesso in scrittura alla cartella Google Drive (e agli snapshot nel repo) sia fidato.
- `SheetComponent` usa `bypassSecurityTrustResourceUrl()` solo dopo aver verificato che l'ID esista nell'albero come `kind === 'gsheet'` e soddisfi `/^[A-Za-z0-9_-]+$/`, costruendo l'URL esclusivamente sul dominio `https://docs.google.com/spreadsheets/d/<id>/...`. Se il browser blocca i cookie di terze parti, resta disponibile il link esterno `Apri in Google Sheets ↗`.

### Per una protezione reale in futuro
Come già indicato nel `README.md`, servirebbe passare a **Google OAuth 2.0** lato client (o un piccolo proxy backend) con cartella Drive condivisa solo con account Google autorizzati — e rimuovere gli snapshot da un repository pubblico.

---

## 2. Anomalie e piccoli bug residui nel codice

### Fix già applicati su `SteBranch`
- **Asset degli snapshot in `angular.json`**: aggiunto `"assets": ["src/assets"]` in `architect.build.options` così i 10 file `snapshot-core-*.jsonl` e `snapshot-bestiary-*.jsonl` vengono copiati in `dist/biblioteca-gdr/browser/assets/`.
- **Stile `.term-link` e `[hidden]` in `src/styles.css`**: corretto `.seed.term-link` in `.term-link` (con `color: var(--wax)`, `font-weight: 600`, sottolineatura puntinata e `cursor: pointer`) e rimosso il duplicato di `[hidden]`.
- **`README.md` aggiornato**: allineato a tutte le funzionalità correnti (calcolatore oggetti magici, ricerca Bestiario, `term-links`, pannello ridimensionabile, snapshot).

### Anomalie minori nei dati statici
- **`src/app/extra-lists.ts`**: `ROGUE_TRICKS` contiene duplicati esatti (es. `"insightful feint"` in *Bluff* livello 1 alle righe 128 e 132).
- **`src/app/item-presets.ts`**: alcune voci generate automaticamente dal parsing di *Ch 6a* presentano residui testuali:
  - `.45 “Hog Leg` con `base.name: "” Bullet"` (riga 53)
  - `Hodentin Sack` con una frase descrittiva intera nel campo `base.name` (riga 72)
  - `Etherealnes` (refuso nel nome, riga 36) e `qualifier: "contionuous"` in `Putrid` (riga 47).

### Pulizie minori in HTML / Codice
- `src/index.html`: `<meta name="theme-color" content="#1f2a44">` è un blu scuro non allineato al tema pergamena/cuoio (`#3a2816` o `#6e2018`).
- `DeviceService`: imposta `data-device` su `<html>`, ma nessun selettore CSS lo utilizza.

---

## 3. Disallineamenti residui nei commenti

| File | Cosa dice | Stato reale nel codice |
|---|---|---|
| `src/environments/environment.ts` (commento riga 9) | *"Il Drive viene riletto solo quando la pagina viene aperta o aggiornata (F5)"* | Il Drive viene verificato a **login** e **logout** (e al primo avvio solo se la cache è vuota) |

---

## 4. Limiti architetturali e debito tecnico

1. **Accoppiamento tra `mergeGroups` e `LookupService.spellDocIds()`**:
   - I capitoli delle spell sono identificati riutilizzando le regex di `environment.mergeGroups`. Modificare o rimuovere `mergeGroups` comprometterebbe la ricerca mirata dei semi in `explainSeed()`.
2. **Dimensione del repository Git (~121,3 MB di snapshot in `src/assets/`)**:
   - Committare ripetutamente oltre 120 MB di file `.jsonl` su Git fa crescere rapidamente la dimensione del repository `.git` (non è usato Git LFS).
3. **Dipendenza dai nomi dei file nel calcolatore (`ItemCalcComponent`)**:
   - La classificazione delle variazioni usa regex rigide sui nomi dei documenti (`/Ch 8/i`, `/Feat/i`, `/Skill/i`): rinominare quei file sul Drive svuoterebbe le rispettive liste nel calcolatore.
4. **Euristiche fragili sul formato dei `.docx`**:
   - Le voci di spell richiedono `<p>` `< 90` caratteri seguito esattamente da `School ...` e una riga `Level ...`; righe non formula che assomigliano a una formula mostrano comunque il pulsante di espansione.
5. **Assenza di test automatizzati**:
   - Moduli puramente funzionali e critici come `doc-parser.ts`, `term-links.ts`, `item-calc.ts`, `device.ts` e `mergeGroups()` sono già strutturati benissimo per unit test (zero dipendenze DOM o facilmente testabili), ma manca una suite di test.
6. **Limiti hard-coded**:
   - `importSnapshot()` si ferma al massimo a `part <= 50` (~750 MB).
   - `SearchComponent` e `BestiarySearchComponent` limitano i risultati a `150`.
   - `ItemCalcComponent` tronca le liste dei `<select>` a `400` (`spellOptions`, `modOptions`) o `500` (`presetOptions`) voci.

---

## 5. Idee di evoluzione futura

- [x] Aggiungere `"assets": ["src/assets"]` in `angular.json` per rendere effettivi gli snapshot in build (fatto su `SteBranch`; in prospettiva valutare hosting esterno degli snapshot per alleggerire Git).
- [x] Correggere `.term-link` in `styles.css` così da rendere visivamente riconoscibili i termini cliccabili nei testi (fatto su `SteBranch`).
- [x] Aggiornare `README.md` con tutte le nuove funzionalità (fatto su `SteBranch`).
- [ ] **Mini-refactoring di `src/app/custom-entries.ts` (se crescono le voci editoriali del sito):**
  - Generare automaticamente `html` e `text` a partire da campi strutturati (`prerequisite`, `benefit`, `cost`, `special`, `note`) per eliminare la duplicazione manuale tra plain text e HTML.
  - Registrare il documento virtuale `site:custom-metamagic` direttamente dentro `LibraryService` (in `metas` e `MiniSearch`) così `LookupService`, `linkTerms()`, `headingEntries()` e la ricerca full-text lo ereditano automaticamente senza i controlli `if (id === CUSTOM_DOC_ID)` sparsi nei servizi.
- [ ] Paginazione / rendering on-demand per sezione su documenti enormi come `Ch 8 + 8a` (5,6 MB, >5.200 bottoni formula nel DOM).
- [ ] Aggiornare `theme-color` in `index.html` e il commento datato in `environment.ts`.
- [ ] Introdurre una suite leggera di unit test (es. Vitest) per `doc-parser`, `term-links`, `item-calc` e verifica automatica di `ITEM_PRESETS` / `COMPOSITE_ITEMS`.
- [ ] Aggiungere un pulsante manuale "Aggiorna dal Drive" nella barra di stato senza dover fare logout/login.
- [ ] Valutare OAuth Google se si vuole rendere privata la biblioteca.
