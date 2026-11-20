# Pubblicare su GitHub Pages, passo per passo

Il progetto contiene già il file `.github/workflows/pages.yml`, che compila l'app e la pubblica a ogni modifica del ramo `main`.
La chiave API non va scritta nel codice: la metti nei **segreti** del repository.

## 1. Crea l'account e il repository
1. Crea un account su github.com, se non lo hai.
2. Clicca **New** (o **+ → New repository**).
3. Nome: `biblioteca-gdr` (o un altro). Scegli **Public** (GitHub Pages gratuito richiede un repository pubblico).
4. Non spuntare nulla (né README, né .gitignore). Clicca **Create repository**.

## 2. Carica il progetto
Modo più semplice, dal browser:
1. Estrai lo zip `biblioteca-gdr-v11.zip` in una cartella sul tuo computer.
2. Nella pagina del repository clicca **uploading an existing file**.
3. Trascina dentro **tutto il contenuto** della cartella (anche la cartella nascosta `.github` e il file `.gitignore`).
   Se il browser non mostra le cartelle nascoste, usa il metodo con Git qui sotto.
4. Clicca **Commit changes**.

Con Git (consigliato per aggiornare in seguito):
```bash
cd percorso/della/cartella
git init
git add .
git commit -m "Prima versione"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/biblioteca-gdr.git
git push -u origin main
```

## 3. Inserisci la chiave API come segreto
1. Nel repository: **Settings → Secrets and variables → Actions**.
2. **New repository secret**.
3. Name: `DRIVE_API_KEY`. Secret: incolla la chiave che inizia con `AIza`.
4. **Add secret**.

## 4. Attiva GitHub Pages
1. **Settings → Pages**.
2. In **Build and deployment → Source** scegli **GitHub Actions**.

## 5. Avvia la pubblicazione
1. Vai alla scheda **Actions**.
2. Se il flusso non parte da solo, scegli **Pubblica su GitHub Pages** e clicca **Run workflow**.
3. Aspetta il segno verde (circa 2-4 minuti).
4. L'indirizzo compare in **Settings → Pages**, di solito `https://TUO-UTENTE.github.io/biblioteca-gdr/`.

## 6. Limita la chiave API al tuo sito
Su Google Cloud, nella chiave API, in **Restrizioni per applicazione → Siti web**, aggiungi:
- `https://TUO-UTENTE.github.io/*`
- `http://localhost:4200/*` (per le prove sul tuo computer)

## Aggiornare
Ogni volta che cambi un file e fai `git push` (o carichi i file dal browser sul ramo `main`), il sito si ricompila da solo.
Le modifiche ai documenti del Drive compaiono al prossimo login o logout, come da regola dell'app.

## Problemi comuni
- **Pagina bianca o errore 404 sulle risorse:** controlla che l'indirizzo sia quello con il nome del repository alla fine.
- **"Manca la chiave API":** il segreto `DRIVE_API_KEY` non esiste o è vuoto.
- **Errore 403 dall'API:** la restrizione del referrer non include `https://TUO-UTENTE.github.io/*`.
- **Flusso rosso in Actions:** apri il flusso, clicca sul passo rosso e copia l'ultimo messaggio.

## Avvertenza
La chiave API arriva comunque nel codice del sito, perché l'app gira nel browser. Per questo la protezione reale è la restrizione del referrer. Il login `admin` / `0000` è solo una barriera di comodo (vedi README, sezione Sicurezza).

## Copia precompilata (caricamento rapido)

Di default ogni nuovo dispositivo scarica e converte tutti i documenti dal Drive al primo accesso.
Per evitarlo, puoi pubblicare una copia già pronta. Se la copia è grande, viene divisa in più file
da circa 15 MB, perché GitHub accetta al massimo 25 MB per file caricato dal browser.

1. Apri la biblioteca su un computer già aggiornato, vai in Home, apri **Copia per il caricamento rapido** e premi **Scarica la copia**.
   Il browser salva uno o più file: `snapshot-1.jsonl`, `snapshot-2.jsonl`, ...
2. Su GitHub apri `src/assets`, clicca **Add file → Upload files** e carica **tutti** i file `snapshot-N.jsonl`.
3. Fai il commit come per gli altri file (**Commit directly to the main branch**): il workflow si rilancia da solo.

Quando aggiorni la copia, carica i file nuovi e cancella quelli vecchi che non servono più (es. se prima erano 4 e ora sono 3, elimina il quarto).
I dispositivi nuovi scaricano questi file in sequenza. Poi il login confronta soltanto la struttura del Drive
e riscarica i soli documenti cambiati.
