import { Injectable, signal } from '@angular/core';

/**
 * Credenziali di accesso all'app.
 * ATTENZIONE: il controllo avviene nel browser, quindi chi legge il codice
 * sorgente può vedere queste credenziali. È una barriera di comodo, non una
 * protezione vera (vedi README, sezione "Sicurezza").
 */
const LOGIN_USER = 'admin';
const LOGIN_PASS = '0000';
const SESSION_KEY = 'bgdr-session';

function readSession(): boolean {
  try {
    if (localStorage.getItem(SESSION_KEY) === 'ok') return true;
    // Migra eventuale sessione già attiva nella scheda corrente (da sessionStorage).
    if (sessionStorage.getItem(SESSION_KEY) === 'ok') {
      localStorage.setItem(SESSION_KEY, 'ok');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** true = utente autenticato nel browser (condiviso tra tutte le schede). */
  readonly loggedIn = signal(readSession());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', ev => {
        if (ev.key === SESSION_KEY || ev.key === null) this.loggedIn.set(ev.newValue === 'ok');
      });
    }
  }

  login(user: string, pass: string): boolean {
    const ok = user.trim() === LOGIN_USER && pass === LOGIN_PASS;
    if (ok) {
      try {
        localStorage.setItem(SESSION_KEY, 'ok');
      } catch {
        /* localStorage non disponibile: resta valido finché la pagina è aperta */
      }
      this.loggedIn.set(true);
    }
    return ok;
  }

  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignora */
    }
    this.loggedIn.set(false);
  }
}
