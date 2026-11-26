# Biblioteca GDR

Sito responsive (PC, notebook, tablet, smartphone) che legge la cartella Google Drive e mostra i documenti `.docx`, Google Docs, Google Sheets (schede personaggio incorporate) e file di testo con:
- ricerca full-text su regole e ricerca dedicata al Bestiario;
- **Bestiario filtrabile** (`/bestiario`) per singola creatura (~2.080 voci) con barra CR, filtri e **generatore di incontri casuali**;
- **schede personaggio Google Sheets** incorporate (`/scheda/:id`) con modalità *Solo lettura* di default, *Modifica* e toggle barra menu per gli Apps Script;
- schede delle spell con formule interattive e descrizione di ogni componente (inclusa la voce editoriale `Effect-Specific Spell`);
- collegamenti automatici nei testi per feat, talenti, spell e altre voci della biblioteca;
- elenco degli incantesimi per classe e livello (`/incantesimi`);
- calcolatore per la creazione di oggetti magici in *numen* e *gp* (`/oggetti`, con livello 0 valutato `0,5`);
- copia precompilata divisa per priorità (`snapshot-core-*.jsonl` caricato subito + `snapshot-bestiary-*.jsonl` in background).

- Accesso dell'app: utente `admin`, password `0000` (modificabili in `src/app/auth.service.ts`; sessione salvata in `localStorage` e condivisa tra schede).
- Il Drive viene confrontato con la copia salvata **a ogni login e a ogni logout**. Se ci sono differenze,
  l'app scarica solo i file nuovi o modificati, rimuove quelli cancellati e poi procede. Durante l'uso
  non c'è nessun aggiornamento automatico.

---

## Passo 1 — Condividi la cartella del Drive

Apri la cartella principale del Drive, clic destro → **Condividi** → **Generale: Chiunque abbia il link** → ruolo **Visualizzatore**.
La condivisione vale per tutte le sottocartelle e i file.

## Passo 2 — Crea la chiave API di Google

1. Vai su <https://console.cloud.google.com/> e crea un progetto (es. "Biblioteca GDR").
2. **API e servizi → Libreria** → cerca **Google Drive API** → **Abilita**.
3. **API e servizi → Credenziali → Crea credenziali → Chiave API**. Copia la chiave.
4. Consigliato (protegge la chiave): nella chiave, sezione **Restrizioni per applicazione**, scegli
   **Siti web** e inserisci l'indirizzo del sito una volta pubblicato (es. `https://tuo-sito.netlify.app/*`)
   e anche `http://localhost:4200/*` per le prove.
   In **Restrizioni per API** seleziona solo **Google Drive API**.

## Passo 3 — Inserisci la chiave nel progetto

Apri `src/environments/environment.ts` e sostituisci:

```ts
apiKey: 'INSERISCI_QUI_LA_TUA_API_KEY',
```

con la tua chiave, ad esempio `apiKey: 'AIza…'`. L'ID della cartella è già inserito.
Se pubblichi con GitHub Pages, non inserire la chiave nel file: segui `GITHUB-PAGES.md` e salvala nel segreto `DRIVE_API_KEY`.

## Passo 4 — Prova in locale (facoltativo ma consigliato)

Serve [Node.js](https://nodejs.org/) `>= 22.12.0` (LTS). Dalla cartella del progetto:

```bash
npm ci
npm start
```

Apri <http://localhost:4200>. Accedi con `admin` / `0000`. La prima apertura scarica i documenti (o importa gli snapshot se presenti); poi l'app li tiene in memoria nel browser (IndexedDB).

## Passo 5 — Crea la versione per la pubblicazione

```bash
npm run build
```

La cartella da pubblicare è **`dist/biblioteca-gdr/browser`**.

## Passo 6 — Pubblica e ottieni il link

Opzione più semplice, senza account tecnici:

1. Vai su <https://app.netlify.com/drop> (serve un account Netlify gratuito).
2. Trascina dentro la pagina la cartella `dist/biblioteca-gdr/browser`.
3. Netlify ti dà un link del tipo `https://nome-casuale.netlify.app`: è il link del sito.
   Puoi cambiare il nome nelle impostazioni del sito.

Dopo la pubblicazione, se il link è diverso da quello previsto nel Passo 2 (punto 4), aggiorna le restrizioni della chiave.

Per aggiornare il sito dopo modifiche al codice: rifai `npm run build` e trascina di nuovo la cartella.
Le modifiche ai **documenti** nel Drive non richiedono nessuna nuova pubblicazione.

---

## Come funziona

- **Categorie e cartelle:** la schermata iniziale mostra le cartelle presenti nella radice del Drive (es. *Manuale* con *Bestiary*, *Classes*, *Skills, Feats, etc*, e *Schede*), oltre alle tre card degli strumenti (**Bestiario**, **Incantesimi per classe**, **Creazione oggetti magici**) ed eventuali file sciolti. Ogni categoria e file riceve automaticamente un'icona tematica.
- **Bestiario filtrabile e Generatore incontri (`/bestiario`):** espande le 629 schede del Bestiario in **~2.080 singole creature** con link diretto alla sezione (`#s-N`), barra Grado di Sfida (CR) a doppio cursore (`1/8`–`30+`), filtri ordinati (Ordina per, Tipo, Sottocategoria, Ambiente, Taglia), barra alfabetica A–Z, vista per cartelle e **Generatore di incontri casuali** (XP Pathfinder 1e/3.5, 7 difficoltà DOOM da `−1` a `+5`, composizioni e regolazione `−`/`+`/`Cambia`). Lo stato di filtri e incontro viene preservato tornando indietro dalle schede.
- **Schede personaggio Google Sheets (`/scheda/:id`):** i fogli Google Sheets nel Drive sono incorporati a larghezza piena direttamente nell'app senza rompere formule, trigger né Apps Script collegati, con partenza di default in **Solo lettura**, pulsante **Modifica**, checkbox **Mostra menu** (per mostrare i menu degli script in *Modifica*) e link diretto **Apri in Google Sheets ↗**.
- **Ricerca globale:** la barra in alto cerca in tutto il testo delle regole (escludendo il Bestiario, così le centinaia di schede mostro non sommergono i risultati). I risultati mettono prima i titoli esatti, poi quelli che iniziano con la parola cercata e infine il testo completo; un clic apre il documento sul punto esatto. Le frasi tra virgolette (`"..."`) cercano la sequenza esatta.
- **Ricerca nel Bestiario:** entrando nella cartella *Bestiary* (o in una delle sue sottocartelle) compare il link rapido al Bestiario filtrabile e una barra di ricerca dedicata che cerca in tempo reale solo nelle schede del Bestiario.
- **Google Docs, Google Sheets e Markdown:** i Google Docs vengono letti come `.docx` (con compressione automatica delle immagini in WebP); i Google Sheets si aprono incorporati in `/scheda/:id`; i file `.md` e `.txt` come testo semplice.
- **Ch 8 e Ch 8a uniti:** i file "Ch 8 - Spells" e "Ch 8a - Spells Grimoire" appaiono come un solo documento
  (la regola è in `mergeGroups`, `src/environments/environment.ts`). I file originali nel Drive non cambiano.
- **Formule delle spell:** ogni formula (es. `Fireball: Jet of flame (0 level) + Reach Spell (…) = 3rd level`)
  ha il pulsante **Mostra la descrizione di ogni componente**. Ogni componente è sottolineato: un clic apre
  in basso la sua descrizione presa dai documenti (inclusa la voce editoriale `Effect-Specific Spell [Metamagic]` in `src/app/custom-entries.ts`).
  - Se il componente è una **spell di livello 0-9** (es. *Jet of flame (0 level)*, sottolineata con linea piena),
    l'app la cerca nei capitoli delle spell: prima come voce con quel titolo, poi come riga di una tabella
    di varianti (*Jet of flame* è nella tabella di *Acid Splash*), poi come voce "Nome: formula" di Ch 8a.
    Il testo è quello del documento, con il livello indicato nella formula.
  - Gli altri componenti (metamagie come *Reach Spell*, sottolineatura a puntini) mostrano la loro voce.
- **Collegamenti automatici nei testi:** aprendo qualsiasi documento (anche nel Bestiario), i nomi di feat, talenti, spell e altre voci del Drive riconosciuti nel testo diventano cliccabili con sottolineatura puntinata e aprono subito la loro descrizione nel riquadro inferiore.
- **Riquadro descrizioni ridimensionabile:** il pannello inferiore che mostra descrizioni di semi, metamagie e termini collegati si può alzare o abbassare trascinando la barra superiore (o con le frecce su/giù da tastiera, anche con `Shift`); l'altezza scelta viene ricordata sul dispositivo.
- **Testo originale:** il testo viene mostrato come nei file, senza abbreviazioni né traduzioni.
- **Cache e copia precompilata:** i documenti già letti e l'indice `MiniSearch` restano nel browser (IndexedDB). Se un file cambia nel Drive, viene riletto da solo. Dalla Home, la sezione **Copia per il caricamento rapido** permette di esportare tutti i documenti in due serie separate — `snapshot-core-1..N.jsonl` (regole core, caricate subito al login) e `snapshot-bestiary-1..N.jsonl` (schede mostri, caricate in background) — da salvare in `src/assets/` (vedi `GITHUB-PAGES.md`).

## Incantesimi per classe

Dalla Home, la card **Incantesimi per classe** (`/incantesimi`) elenca le spell per lista, per livello e con filtro testuale:
- **Mago**: tutte le spell arcane lette dal Drive (il mago può conoscerle tutte), più le 25 manovre della Mano d'Ombra di *Tome of Battle* (solo nomi e livello).
- **Ladro**: le spell/trucchi del documento *Rogue*, livelli 1-7, divise per abilità (`src/app/extra-lists.ts`), collegate al Drive se presenti.
- **Altre liste** (Divina, Bardo, …): lette dalla riga `Level …` di ogni voce di spell.

Le spell che non sono nel Drive (parte di quelle del Ladro e le manovre) portano a una ricerca online su Pathfinder 1e o D&D 3.5.
Il testo delle manovre non è nel Drive e non è copiato nel progetto: aggiungilo come documento se lo possiedi.

## Creazione oggetti magici

Dalla Home, la card **Creazione oggetti magici** (`/oggetti`) calcola il costo di creazione degli oggetti secondo le regole del Compendio (*Ch 6a - Item Compendium*):

- **Preset del Compendio:** 182 oggetti precompilati (134 oggetti magici/armi in *numen*, 46 alchimia e veleni in *gp a dose*, 2 munizioni) filtrabili per categoria e nome. Caricando un preset vengono compilati spell base, variazioni (incluse quelle escluse dal conteggio del libro), CL, prezzo base e moltiplicatore, e il risultato viene confrontato con il totale stampato nel Compendio.
- **Calcolo personalizzato:** scegli una spell base arcana, aggiungi **metamagie**, **talenti**, **potenziamenti abilità**, **proprietà** (letti dalla biblioteca e dal Compendio) o **variazioni manuali**. Ogni variazione può essere inclusa/esclusa o modificata nei livelli.
- **Unità *numen* e *gp* e trucchetti di livello 0:**
  - Formula generale: `livello effettivo × CL × prezzo base × moltiplicatore`, dove un **livello finale `0` (trucchetto) vale `0,5`** sia in *numen* sia in *gp*.
  - *Alchimia e veleni* (`gp` a dose): prezzo base `50 gp` (a livello 0 e CL 1 dà naturalmente `25 gp`) e calcolo automatico della **scorta privata** in numen (`18 ×` il prezzo in gp).
- **Oggetti composti (più parti):** sezione dedicata a 37 oggetti composti da più parti o con totali particolari nel Compendio. Ogni parte può essere inclusa o esclusa dal totale, con segnalazione automatica se la somma diverge dal totale stampato nel libro.

## Indice del documento

Ogni documento ha a sinistra un **Indice** apribile/chiudibile (aperto di default su schermi larghi, a comparsa su smartphone/tablet, con preferenza salvata sul dispositivo) contenente tutti i titoli (`h1`–`h5` e voci di spell). Un clic porta al punto scelto.

## Sfondo pergamena

Ci sono cinque sfondi di pergamena invecchiata in `src/assets/sfondi/` (`sfondo-1.jpg` … `sfondo-5.jpg`),
generati al computer, quindi senza diritti di terzi. Per sceglierne uno, cambia la riga `--bg-image` nel blocco
`:root` di `src/styles.css`, per esempio `url('assets/sfondi/sfondo-3.jpg')`. I colori di tutto il sito sono
nello stesso blocco.

## Sicurezza: leggi prima di pubblicare

- **Il login è una barriera di comodo, non una protezione.** Utente e password sono nel codice, quindi
  chi conosce come leggere il sorgente di una pagina può vederli.
- **La chiave API e la condivisione "chiunque abbia il link" permettono la lettura diretta** dei file
  del Drive a chiunque abbia il link della cartella o la chiave. Il login dell'app non le blocca.
- Per una protezione reale serve l'accesso con l'account Google (OAuth) e una cartella condivisa solo
  con gli account autorizzati. È una modifica separata da chiedere.
- I documenti contengono testi di terzi (per esempio citazioni di romanzi e regole di altri manuali).
  Chi ha accesso al sito può leggerli: valuta questo aspetto prima di renderlo pubblico.

## Pubblicare su GitHub Pages

Vedi il file `GITHUB-PAGES.md`: passo per passo, con il segreto `DRIVE_API_KEY`, la copia precompilata (`snapshot-core-*.jsonl` + `snapshot-bestiary-*.jsonl`) e il flusso automatico in `.github/workflows/pages.yml`. La documentazione tecnica completa del progetto è raccolta nella mini-wiki Obsidian in `wiki/`.

## Limiti noti

- Il primo caricamento è lento se la cartella è grande (alcuni file superano i 5 MB) e non sono caricati gli snapshot precompilati.
- Il riconoscimento delle formule usa la struttura dei testi attuali. Una riga che somiglia a una formula
  mostra il pulsante anche se non lo è: in quel caso compare "nessuna descrizione trovata" e il testo resta invariato.
- Se una descrizione di un seme non ha un titolo proprio nei documenti, l'app mostra i passaggi in cui il
  termine compare, senza inventare una descrizione.

## Struttura del progetto

```text
wiki/                           ← mini-wiki tecnica Obsidian (architettura, funzionalità, registro commit)
src/
  environments/
    environment.ts              ← chiave API (segnaposto), ID cartella Drive e mergeGroups
  assets/
    sfondi/                     ← 5 sfondi pergamena (sfondo-1.jpg … sfondo-5.jpg)
    snapshot-core-*.jsonl       ← copia precompilata regole core (caricata subito al login)
    snapshot-bestiary-*.jsonl   ← copia precompilata Bestiario (caricata in background)
  app/
    models.ts                   ← tipi principali (NodeKind, TreeNode, Section, DocMeta, SearchHit, Snapshot)
    auth.service.ts             ← utente e password (localStorage sincronizzato tra schede)
    auth.guard.ts               ← protegge le rotte finché non si accede
    login.component.ts          ← schermata di accesso (/accesso)
    device.ts / device.service.ts ← riconosce PC, tablet o smartphone
    drive.service.ts            ← lettura Google Drive API v3 (con retry e mergeGroups)
    library.service.ts          ← cache IndexedDB, snapshot Core/Bestiario, sincronizzazione, MiniSearch persistente
    doc-parser.ts               ← arricchimento HTML, formule, voci di spell e sezioni
    image-compress.ts           ← compressione automatica WebP delle immagini incorporate in mammoth
    lookup.service.ts           ← descrizioni di componenti (O(1) + LRU DOM), semi e indice spellBook
    term-links.ts               ← riconoscimento e collegamento automatico dei nomi nei testi
    custom-entries.ts           ← voci editoriali del sito (es. Effect-Specific Spell)
    extra-lists.ts              ← elenchi statici Ladro e Mano d'Ombra
    icon.component.ts           ← icone SVG inline per categorie e documenti
    shell.component.ts          ← barra superiore, ricerca globale e barra di sincronizzazione
    home.component.ts           ← Home, categorie, card strumenti ed export snapshot
    folder.component.ts         ← navigazione cartelle, schede e sottocartelle
    bestiary-search.component.ts ← ricerca dedicata al solo Bestiario nelle cartelle
    bestiary-index.ts           ← estrazione singole creature (~2.080), CR a fine riga, taglie e ambienti
    bestiary-state.service.ts   ← persistenza stato Bestiario e ultimo incontro generato
    encounter-gen.ts            ← motore generazione incontri casuali (XP Pathfinder/3.5, livelli DOOM)
    bestiary.component.ts       ← pagina Bestiario filtrabile e Generatore incontri (/bestiario)
    doc.component.ts            ← lettore documenti, TOC, link incrementali e pannello ridimensionabile
    sheet.component.ts          ← schede personaggio Google Sheets incorporate (/scheda/:id)
    search.component.ts         ← pagina risultati ricerca globale (/cerca)
    spellbook.component.ts      ← incantesimi per classe e livello (/incantesimi)
    item-calc.ts                ← formula di calcolo costi in numen e gp (livello 0 = 0,5; scorta privata)
    item-presets.ts             ← 182 preset da Ch 6a - Item Compendium
    item-composite.ts           ← 37 oggetti composti o con eccezioni del Compendio
    item-calc.component.ts      ← pagina Creazione oggetti magici (/oggetti)
    app.routes.ts, app.config.ts, app.component.ts
  styles.css                    ← tema pergamena, responsive e stili dei componenti
```
