import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Indirizzi con # (es. sito/#/doc/...): funzionano su qualsiasi hosting statico.
    provideRouter(routes, withHashLocation()),
  ],
};
