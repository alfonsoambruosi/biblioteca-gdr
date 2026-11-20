import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';
import { LibraryService } from './library.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet, FormsModule],
  template: `
    <header class="top">
      <a class="brand" routerLink="/">Biblioteca GDR</a>

      <form class="search" role="search" (ngSubmit)="go()">
        <input
          name="q"
          type="search"
          placeholder="Cerca una parola in tutti i testi…"
          aria-label="Cerca"
          [(ngModel)]="query"
        />
        <button type="submit">Cerca</button>
      </form>

      <div class="actions">
        <button type="button" class="ghost" (click)="logout()" [disabled]="leaving()">
          {{ leaving() ? 'Controllo…' : 'Esci' }}
        </button>
      </div>
    </header>

    <div class="sync" [class.warn]="library.status() === 'error'">
      <span>{{ syncText() }}</span>
      <span class="device">Dispositivo: {{ device.label() }}</span>
    </div>

    <main class="page">
      <router-outlet />
    </main>
  `,
})
export class ShellComponent {
  readonly library = inject(LibraryService);
  readonly device = inject(DeviceService);
  private auth = inject(AuthService);
  private router = inject(Router);

  query = '';
  readonly leaving = signal(false);

  constructor() {
    // La pagina del Drive esiste solo dopo il login (vedi authGuard).
    void this.library.start();
  }

  readonly syncText = computed(() => {
    const s = this.library.status();
    if (s === 'error') return this.library.fatalError() || 'Errore di lettura del Drive: resta la copia salvata.';
    if (s === 'syncing') return `Aggiorno i documenti modificati… ${this.library.done()} / ${this.library.total()}`;
    if (s === 'checking') return 'Controllo il Drive…';
    const errors = Object.keys(this.library.docErrors()).length;
    const last = this.library.lastCheck();
    const when = last
      ? `Verificato alle ${last.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    return errors ? `${when} · ${errors} documenti non letti` : when;
  });

  go(): void {
    const q = this.query.trim();
    if (!q) return;
    void this.router.navigate(['/cerca'], { queryParams: { q } });
  }

  /** All'uscita: confronto con il Drive, così la volta successiva la copia è già aggiornata. */
  async logout(): Promise<void> {
    this.leaving.set(true);
    try {
      await this.library.verify();
    } finally {
      this.auth.logout();
      this.leaving.set(false);
      await this.router.navigateByUrl('/accesso');
    }
  }
}
