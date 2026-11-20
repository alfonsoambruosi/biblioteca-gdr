import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LibraryService } from './library.service';
import { LookupService } from './lookup.service';
import { esc } from './doc-parser';

@Component({
  selector: 'app-doc',
  imports: [RouterLink],
  template: `
    <nav class="crumbs" aria-label="Percorso">
      <a routerLink="/">Home</a>
      @for (n of crumbs(); track n.id) {
        <span>›</span>
        <a [routerLink]="['/cartella', n.id]">{{ n.name }}</a>
      }
    </nav>

    <h1>{{ title() }}</h1>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (loading()) {
      <p class="muted">Caricamento del documento…</p>
    }

    @if (toc().length) {
      <details class="toc">
        <summary>Indice di questo documento ({{ toc().length }} voci)</summary>
        <ol>
          @for (s of toc(); track s.id) {
            <li [class]="'l' + s.level"><button type="button" (click)="jump(s.id)">{{ s.heading }}</button></li>
          }
        </ol>
      </details>
    }

    <div class="content" (click)="onClick($event)" [innerHTML]="html()"></div>

    <aside class="seed-panel" [hidden]="!panel()">
      <div class="seed-panel-head">
        <strong>{{ panelTitle() }}</strong>
        <button type="button" class="ghost" (click)="closePanel()">Chiudi</button>
      </div>
      <div class="seed-panel-body" (click)="onClick($event)" [innerHTML]="panel()"></div>
    </aside>
  `,
})
export class DocComponent {
  private library = inject(LibraryService);
  private lookup = inject(LookupService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), {
    initialValue: '',
  });

  readonly title = computed(() => {
    this.library.tree();
    return this.library.node(this.id())?.name ?? '';
  });

  readonly crumbs = computed(() => {
    this.library.tree();
    return this.library.pathOf(this.id()).slice(0, -1);
  });

  /** Tutti i titoli del documento (h1-h5 e voci di spell), nell'ordine in cui compaiono. */
  readonly toc = computed(() => {
    this.library.version();
    const m = this.library.meta(this.id());
    return (m?.sections ?? []).filter(s => !!s.heading && s.level <= 5);
  });

  readonly html = signal<SafeHtml>(this.sanitizer.bypassSecurityTrustHtml(''));
  readonly loading = signal(false);
  readonly error = signal('');
  readonly panel = signal<SafeHtml | null>(null);
  readonly panelTitle = signal('');

  constructor() {
    // Ricarica quando cambia il documento o quando il Drive viene riletto.
    effect(() => {
      const id = this.id();
      this.library.tree();
      untracked(() => {
        if (this.library.node(id)) {
          void this.load(id);
        } else if (this.library.tree()) {
          this.error.set('Documento non trovato nel Drive.');
          this.html.set('');
        }
      });
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.panel.set(null);
    try {
      const raw = await this.library.getHtml(id);
      // Il contenuto arriva dai tuoi documenti: viene mostrato senza filtri,
      // così restano intatti gli ID, le tabelle e i collegamenti delle formule.
      this.html.set(this.sanitizer.bypassSecurityTrustHtml(raw));
      this.scrollToFragment();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
      this.html.set('');
    } finally {
      this.loading.set(false);
    }
  }

  private scrollToFragment(): void {
    const frag = this.route.snapshot.fragment;
    if (!frag) return;
    setTimeout(() => document.getElementById(frag)?.scrollIntoView({ block: 'start' }));
  }

  async onClick(ev: Event): Promise<void> {
    const t = ev.target as HTMLElement;

    // Clic su un "seme" (es. Reach Spell): apre il pannello con la sua descrizione.
    const seed = t.closest('.seed') as HTMLElement | null;
    if (seed) {
      ev.preventDefault();
      await this.openTerm(seed.textContent?.trim() ?? '', seed.dataset['base']);
      return;
    }

    // Pulsante sotto una formula: mostra o nasconde la descrizione di ogni componente.
    const btn = t.closest('button.expand-formula') as HTMLButtonElement | null;
    if (btn) {
      const box = btn.nextElementSibling as HTMLElement | null;
      if (!box || !box.classList.contains('formula-detail')) return;
      if (!box.hidden) {
        box.hidden = true;
        btn.textContent = 'Mostra la descrizione di ogni componente';
        return;
      }
      btn.textContent = 'Caricamento…';
      const terms = (btn.dataset['terms'] ?? '').split('|').filter(Boolean);
      const blocks: string[] = [];
      for (const t of terms) {
        const m = /^\*(\d)\*(.+)$/.exec(t); // spell base di livello 0-9
        const term = m ? m[2] : t;
        blocks.push(`<h6 class="term">${esc(term)}</h6>${await this.describe(term, m?.[1])}`);
      }
      box.innerHTML = blocks.join('');
      box.hidden = false;
      btn.textContent = 'Nascondi le descrizioni';
    }
  }

  private describe(term: string, base?: string): Promise<string> {
    return base === undefined ? this.lookup.explain(term) : this.lookup.explainSeed(term, Number(base));
  }

  private async openTerm(term: string, base?: string): Promise<void> {
    if (!term) return;
    this.panelTitle.set(term);
    this.panel.set(this.sanitizer.bypassSecurityTrustHtml('<p class="muted">Caricamento…</p>'));
    const html = await this.describe(term, base);
    this.panel.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }

  /** Porta al titolo scelto nell'indice. */
  jump(id: string): void {
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  closePanel(): void {
    this.panel.set(null);
  }
}
