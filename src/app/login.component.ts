import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';
import { LibraryService } from './library.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="login">
      <form class="login-card" (ngSubmit)="submit()">
        <h1>Biblioteca GDR</h1>
        <p class="hint">Accedi per consultare la biblioteca.</p>

        <label>
          Utente
          <input name="username" type="text" autocomplete="username" autocapitalize="none" required [(ngModel)]="user" />
        </label>

        <label>
          Password
          <input name="password" type="password" autocomplete="current-password" required [(ngModel)]="pass" />
        </label>

        @if (error()) {
          <p class="error" role="alert">Utente o password non corretti.</p>
        }
        @if (busy()) {
          <p class="hint" role="status">{{ library.statusText() || 'Controllo i documenti…' }}</p>
        }

        <button type="submit" [disabled]="busy()">{{ busy() ? 'Attendere…' : 'Entra' }}</button>
      </form>
      <p class="device-note">Dispositivo rilevato: {{ device.label() }}</p>
    </main>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly device = inject(DeviceService);
  readonly library = inject(LibraryService);

  user = '';
  pass = '';
  readonly error = signal(false);
  readonly busy = signal(false);

  async submit(): Promise<void> {
    if (!this.auth.login(this.user, this.pass)) {
      this.error.set(true);
      this.pass = '';
      return;
    }
    this.error.set(false);
    this.busy.set(true);
    // Prima di entrare: confronta l'elenco del Drive con la copia salvata (pochi secondi).
    // I documenti modificati si scaricano in background, senza tenere ferma la schermata.
    // Attesa massima: se Drive non risponde si entra comunque con la copia salvata.
    await Promise.race([this.library.verify(), new Promise(r => setTimeout(r, 15000))]);
    this.busy.set(false);
    // Torna alla pagina richiesta (solo percorsi interni).
    const back = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    const safe = back.startsWith('/') && !back.startsWith('//') ? back : '/';
    await this.router.navigateByUrl(safe);
  }
}
