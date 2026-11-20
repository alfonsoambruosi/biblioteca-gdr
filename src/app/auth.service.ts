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
    return sessionStorage.getItem(SESSION_KEY) === 'ok';
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** true = utente autenticato in questa scheda del browser. */
  readonly loggedIn = signal(readSession());

  login(user: string, pass: string): boolean {
    const ok = user.trim() === LOGIN_USER && pass === LOGIN_PASS;
    if (ok) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'ok');
      } catch {
        /* sessionStorage non disponibile: resta valido finché la pagina è aperta */
      }
      this.loggedIn.set(true);
    }
    return ok;
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignora */
    }
    this.loggedIn.set(false);
  }
}
