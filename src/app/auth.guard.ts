import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Blocca ogni pagina della biblioteca finché l'utente non accede. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).loggedIn()) return true;
  return inject(Router).createUrlTree(['/accesso'], { queryParams: { returnUrl: state.url } });
};

/** La pagina di accesso non serve a chi è già dentro. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).loggedIn()) return true;
  return inject(Router).createUrlTree(['/']);
};
