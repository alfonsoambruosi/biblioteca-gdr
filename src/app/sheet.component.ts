import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LibraryService } from './library.service';

type Mode = 'view' | 'edit';

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: 'view', label: 'Solo lettura', hint: 'Anteprima di sola lettura: nessun rischio di modifiche accidentali.' },
  { key: 'edit', label: 'Modifica', hint: 'Foglio modificabile (veloce, adatto a HP e valori).' },
];

/**
 * Scheda personaggio = Google Sheet incorporato (iframe).
 * L'app non legge né scrive il foglio: le modifiche avvengono nel foglio vero,
 * quindi script, trigger e formule collegati continuano a funzionare come sempre.
 */
@Component({
  selector: 'app-sheet',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="crumbs" aria-label="Percorso">
      <a routerLink="/">Home</a>
      @for (n of crumbs(); track n.id) {
        <span>›</span>
        @if (n.kind === 'folder') {
          <a [routerLink]="['/cartella', n.id]">{{ n.name }}</a>
        } @else {
          <span>{{ n.name }}</span>
        }
      }
    </nav>

    @if (valid()) {
      <div class="sheet-wrap"></div>
      <div class="sheet-bar">
        <h1 class="sheet-title">{{ name() || 'Scheda personaggio' }}</h1>
        <div class="sheet-modes" role="group" aria-label="Modalità">
          @for (m of modes; track m.key) {
            <button
              type="button"
              class="ghost"
              [class.on]="mode() === m.key"
              [attr.aria-pressed]="mode() === m.key"
              [title]="m.hint"
              (click)="setMode(m.key)"
            >{{ m.label }}</button>
          }
        </div>
        <label
          class="sheet-menu-toggle"
          [class.disabled]="mode() !== 'edit'"
          [title]="mode() === 'edit' ? 'Mostra la barra dei menu di Google Sheets (include i menu degli script collegati).' : 'Disponibile in modalità Modifica.'"
        >
          <input
            type="checkbox"
            [checked]="showMenu()"
            [disabled]="mode() !== 'edit'"
            (change)="toggleMenu($any($event.target).checked)"
          />
          Mostra menu
        </label>
        <a class="ghost" [href]="openUrl()" target="_blank" rel="noopener">Apri in Google Sheets ↗</a>
      </div>

      <iframe
        class="sheet-frame"
        title="Scheda personaggio"
        [src]="frameUrl()"
        allow="clipboard-read; clipboard-write"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>

      <p class="muted sheet-note">
        Per modificare devi aver fatto l'accesso a Google nel browser con un account che ha i permessi sul foglio.
        Se il riquadro resta vuoto o chiede l'accesso (succede se il browser blocca i cookie di terze parti),
        usa «Apri in Google Sheets».
      </p>
    } @else {
      <p class="muted">{{ library.tree() ? 'Scheda non trovata.' : 'Caricamento…' }}</p>
    }
  `,
  styles: [
    `
      .sheet-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin: 0.3rem 0 0.6rem; }
      .sheet-title { flex: 1 1 auto; margin: 0; font-size: 1.3rem; }
      .sheet-modes { display: flex; flex-wrap: wrap; gap: 0.3rem; }
      .sheet-menu-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.9rem;
        cursor: pointer;
        user-select: none;
        padding: 0 0.2rem;
      }
      .sheet-menu-toggle input { accent-color: var(--wax); cursor: pointer; }
      .sheet-menu-toggle.disabled,
      .sheet-menu-toggle.disabled input { opacity: 0.5; cursor: not-allowed; }
      .sheet-bar a.ghost { text-decoration: none; }
      .on { background: rgb(110 76 34 / 0.18); border-color: var(--wax); }
      .sheet-frame {
        display: block;
        width: 100%;
        height: calc(100dvh - 15rem);
        min-height: 480px;
        border: 1px solid var(--line);
        border-radius: 4px;
        background: #fff;
      }
      .sheet-note { font-size: 0.85rem; margin: 0.5rem 0 0; }
    `,
  ],
})
export class SheetComponent {
  readonly library = inject(LibraryService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  readonly modes = MODES;
  readonly mode = signal<Mode>('view');
  readonly showMenu = signal(false);

  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });

  private node = computed(() => {
    this.library.tree();
    const n = this.library.node(this.id());
    return n?.kind === 'gsheet' ? n : undefined;
  });

  readonly name = computed(() => this.node()?.name ?? '');
  readonly crumbs = computed(() => {
    this.library.tree();
    return this.library.pathOf(this.id());
  });

  /** Solo ID di Drive ben formati e presenti nell'albero: l'URL dell'iframe non dipende da altro. */
  readonly valid = computed(() => !!this.node() && /^[A-Za-z0-9_-]+$/.test(this.id()));

  private base = computed(() => `https://docs.google.com/spreadsheets/d/${encodeURIComponent(this.id())}`);

  readonly openUrl = computed(() => `${this.base()}/edit`);

  readonly frameUrl = computed(() => {
    const b = this.base();
    const url =
      this.mode() === 'view' ? `${b}/preview` : this.showMenu() ? `${b}/edit` : `${b}/edit?rm=minimal`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  setMode(m: Mode): void {
    this.mode.set(m);
  }

  toggleMenu(checked: boolean): void {
    this.showMenu.set(checked);
  }
}
