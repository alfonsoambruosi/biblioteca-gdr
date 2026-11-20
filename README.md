# Biblioteca GDR

Sito responsive (PC, notebook, tablet, smartphone) che legge in tempo reale la cartella Google Drive
e mostra i documenti .docx con ricerca su tutto il testo, schede delle spell con formula e descrizione
di ogni componente.

- Accesso dell'app: utente `admin`, password `0000` (modificabili in `src/app/auth.service.ts`).
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

## Passo 4 — Prova in locale (facoltativo ma consigliato)

Serve [Node.js](https://nodejs.org/) versione LTS. Dalla cartella del progetto:

```bash
npm install
npm start
```

Apri <http://localhost:4200>. Accedi con `admin` / `0000`. La prima apertura scarica i documenti (può
richiedere qualche minuto); poi l'app li tiene in memoria nel browser.

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

- **Tre categorie:** la schermata iniziale mostra le cartelle del Drive (Classes, Skills Feats etc, Bestiary).
  Dentro ogni categoria trovi le sottocartelle e i file, come nel Drive.
- **Ricerca:** la barra in alto cerca in tutto il testo dei documenti. Il risultato apre il documento
  sul punto esatto.
- **Google Docs e Markdown:** i Google Docs vengono letti come .docx; i file .md come testo semplice.
- **Ch 8 e Ch 8a uniti:** i file "Ch 8 - Spells" e "Ch 8a - Spells Grimoire" appaiono come un solo documento
  (la regola è in `mergeGroups`, `src/environments/environment.ts`). I file originali nel Drive non cambiano.
- **Formule delle spell:** ogni formula (es. `Fireball: Jet of flame (0 level) + Reach Spell (…) = 3rd level`)
  ha il pulsante **Mostra la descrizione di ogni componente**. Ogni componente è sottolineato: un clic apre
  in basso la sua descrizione presa dai documenti.
  - Se il componente è una **spell di livello 0-9** (es. *Jet of flame (0 level)*, sottolineata con linea piena),
    l'app la cerca nei capitoli delle spell: prima come voce con quel titolo, poi come riga di una tabella
    di varianti (*Jet of flame* è nella tabella di *Acid Splash*), poi come voce "Nome: formula" di Ch 8a.
    Il testo è quello del documento, con il livello indicato nella formula.
  - Gli altri componenti (metamagie come *Reach Spell*, sottolineatura a puntini) mostrano la loro voce.
- **Testo originale:** il testo viene mostrato come nei file, senza abbreviazioni né traduzioni.
- **Cache:** i documenti già letti restano nel browser. Se un file cambia nel Drive, viene riletto da solo.

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

Vedi il file `GITHUB-PAGES.md`: passo per passo, con il segreto per la chiave API e il flusso automatico in `.github/workflows/pages.yml`.

## Incantesimi per classe

Dalla Home, la card **Incantesimi per classe** elenca le spell per lista e per livello:
- **Mago**: tutte le spell arcane lette dal Drive (il mago può conoscerle tutte), più le 25 manovre della Mano d'Ombra di *Tome of Battle* (solo nomi e livello).
- **Ladro**: le spell del documento Rogue, livelli 1-7, divise per abilità (`src/app/extra-lists.ts`).
- Altre liste (divina, bardo, …) dalla riga `Level …` di ogni voce.

Le spell che non sono nel Drive (Ladro e manovre) portano a una ricerca online su Pathfinder 1e o D&D 3.5.
Il testo delle manovre non è nel Drive e non è copiato nel progetto: aggiungilo come documento se lo possiedi.

## Indice del documento

Ogni documento ha in alto un **Indice** con tutti i titoli (h1-h5 e voci di spell). Un clic porta al punto scelto.

## Sfondo pergamena

Ci sono cinque sfondi di pergamena invecchiata in `src/assets/sfondi/` (`sfondo-1.jpg` … `sfondo-5.jpg`),
generati al computer, quindi senza diritti di terzi. Per sceglierne uno, cambia la riga `--bg-image` nel blocco
`:root` di `src/styles.css`, per esempio `url('assets/sfondi/sfondo-3.jpg')`. I colori di tutto il sito sono
nello stesso blocco.

## Limiti noti

- Il primo caricamento è lento se la cartella è grande (alcuni file superano i 5 MB).
- Il riconoscimento delle formule usa la struttura dei testi attuali. Una riga che somiglia a una formula
  mostra il pulsante anche se non lo è: in quel caso compare "nessuna descrizione trovata" e il testo resta invariato.
- Se una descrizione di un seme non ha un titolo proprio nei documenti, l'app mostra i passaggi in cui il
  termine compare, senza inventare una descrizione.

## Struttura del progetto

```
src/
  environments/environment.ts   ← chiave API e ID della cartella
  app/
    auth.service.ts             ← utente e password
    login.component.ts          ← schermata di accesso (/accesso)
    auth.guard.ts               ← blocca le pagine finché non si accede
    device.ts / device.service.ts ← riconosce PC, tablet o smartphone
    drive.service.ts            ← lettura del Drive
    library.service.ts          ← cache, sincronizzazione, ricerca
    doc-parser.ts               ← formule, voci e sezioni
    lookup.service.ts           ← descrizioni dei componenti
    shell.component.ts          ← barra superiore e ricerca
    home / folder / doc / search .component.ts
    app.routes.ts, app.config.ts
  styles.css                    ← aspetto e responsive
```
