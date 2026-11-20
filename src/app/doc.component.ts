import { Component, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LibraryService } from './library.service';
import { LookupService } from './lookup.service';
import { esc } from './doc-parser';

const TOC_KEY = 'bgdr-toc';
const PANEL_KEY = 'bgdr-panel-h';
const PANEL_MIN = 120;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* memoria del browser piena o disattivata: non è essenziale */
  }
}

@Component({
  selector: 'app-doc',
  imports: [RouterLink],
  template: `
    <div class="doc-wrap">
      @if (toc().length) {
        <div class="side" [class.open]="tocOpen()">
          <button type="button" class="ghost toc-toggle" [attr.aria-expanded]="tocOpen()" (click)="toggleToc()">
            {{ tocOpen() ? 'Nascondi indice' : 'Mostra indice' }}
          </button>
          @if (tocOpen()) {
            <aside class="toc-side" aria-label="Indice del documento">
              <p class="toc-title">Indice · {{ toc().length }} voci</p>
              <ol>
                @for (s of toc(); track s.id) {
                  <li [class]="'l' + s.level"><button type="button" (click)="jump(s.id)">{{ s.heading }}</button></li>
                }
              </ol>
            </aside>
          }
        </div>
      }

      <div class="doc-main">
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

        <div #contentEl class="content" (click)="onClick($event)" [innerHTML]="html()"></div>
      </div>
    </div>

    <aside class="seed-panel" [style.height.px]="panelH()" [hidden]="!panel()">
      <div
        class="seed-grip"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Trascina per alzare o abbassare il riquadro"
        tabindex="0"
        [attr.aria-valuenow]="panelH()"
        (pointerdown)="startResize($event)"
        (pointermove)="moveResize($event)"
        (pointerup)="endResize()"
        (pointercancel)="endResize()"
        (keydown)="keyResize($event)"
      ></div>
      <div class="seed-panel-head">
        <strong>{{ panelTitle() }}</strong>
        <button type="button" class="ghost" (click)="closePanel()">Chiudi</button>
      </div>
      <div class="seed-panel-body" (click)="onClick($event)" [innerHTML]="panel()"></div>
    </aside>
  `,
})
export class DocComponent {
  @ViewChild('contentEl') private contentEl?: ElementRef<HTMLElement>;
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

  /** Indice a sinistra: aperto di default su schermi larghi, ricordato sul dispositivo. */
  readonly tocOpen = signal(readStorage(TOC_KEY) === '1' || (readStorage(TOC_KEY) === null && window.innerWidth >= 900));

  readonly html = signal<SafeHtml>(this.sanitizer.bypassSecurityTrustHtml(''));
  readonly loading = signal(false);
  readonly error = signal('');
  readonly panel = signal<SafeHtml | null>(null);
  readonly panelTitle = signal('');

  /** Altezza del riquadro delle spell, in pixel: si regola trascinando la barra in alto. */
  readonly panelH = signal(Number(readStorage(PANEL_KEY)) || Math.round(window.innerHeight * 0.4));
  private drag: { y: number; h: number } | null = null;

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

  toggleToc(): void {
    this.tocOpen.update(v => !v);
    writeStorage(TOC_KEY, this.tocOpen() ? '1' : '0');
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
      setTimeout(() => this.linkNames()); // dopo che Angular ha inserito il testo
      this.scrollToFragment();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
      this.html.set('');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Rende cliccabili i nomi di feat, talenti, spell e altre voci del Drive che compaiono nel testo
   * (anche nel bestiario). Il clic apre la descrizione, come per le formule.
   */
  private linkNames(): void {
    const root = this.contentEl?.nativeElement;
    const re = this.library.linkPattern();
    if (!root || !re) return;
    const test = new RegExp(re.source, 'u');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const p = n.parentElement;
        if (!p || p.closest('h1, h2, h3, h4, h5, h6, a, button, .seed, .formula-detail')) return NodeFilter.FILTER_REJECT;
        return test.test(n.textContent ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      // con un gruppo di cattura, split restituisce testo e nomi a turno: i nomi sono nelle posizioni dispari
      const parts = (node.textContent ?? '').split(re);
      if (parts.length < 2) continue;
      const frag = document.createDocumentFragment();
      parts.forEach((part, i) => {
        if (i % 2 === 1) {
          const span = document.createElement('span');
          span.className = 'seed term-link';
          span.textContent = part;
          frag.append(span);
        } else if (part) {
          frag.append(part);
        }
      });
      node.replaceWith(frag);
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

  /** Porta al titolo scelto nell'indice (su telefono chiude il pannello laterale). */
  jump(id: string): void {
    if (window.innerWidth < 900 && this.tocOpen()) this.toggleToc();
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  closePanel(): void {
    this.panel.set(null);
  }

  // ---------------------------------------------------------------- altezza del riquadro

  private clampPanel(h: number): number {
    return Math.min(window.innerHeight - 40, Math.max(PANEL_MIN, Math.round(h)));
  }

  startResize(ev: PointerEvent): void {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    this.drag = { y: ev.clientY, h: this.panelH() };
  }

  moveResize(ev: PointerEvent): void {
    if (!this.drag) return;
    // trascinando verso l'alto il riquadro cresce
    this.panelH.set(this.clampPanel(this.drag.h + (this.drag.y - ev.clientY)));
  }

  endResize(): void {
    if (!this.drag) return;
    this.drag = null;
    writeStorage(PANEL_KEY, String(this.panelH()));
  }

  /** Stessa regolazione da tastiera: frecce su/giù, con Shift a passi più grandi. */
  keyResize(ev: KeyboardEvent): void {
    const step = ev.shiftKey ? 80 : 20;
    if (ev.key === 'ArrowUp') this.panelH.set(this.clampPanel(this.panelH() + step));
    else if (ev.key === 'ArrowDown') this.panelH.set(this.clampPanel(this.panelH() - step));
    else return;
    ev.preventDefault();
    writeStorage(PANEL_KEY, String(this.panelH()));
  }
}
