import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LibraryService } from './library.service';
import { LookupService } from './lookup.service';
import { esc } from './doc-parser';
import { splitTerms } from './term-links';
import { EntryRef } from './lookup.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private destroyRef = inject(DestroyRef);
  private linkRun = 0;
  private linkFrame: number | null = null;
  private linkObserver: IntersectionObserver | null = null;

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
    this.destroyRef.onDestroy(() => this.cancelLinkNames());
    // Ricarica quando cambia il documento o quando il Drive viene riletto.
    effect(() => {
      const id = this.id();
      this.library.tree();
      untracked(() => {
        if (this.library.node(id)) {
          void this.load(id);
        } else if (this.library.tree()) {
          this.cancelLinkNames();
          this.error.set('Documento non trovato nel Drive.');
          this.html.set('');
        }
      });
    });
  }

  private cancelLinkNames(): void {
    this.linkRun++;
    if (this.linkFrame !== null) {
      cancelAnimationFrame(this.linkFrame);
      this.linkFrame = null;
    }
    if (this.linkObserver) {
      this.linkObserver.disconnect();
      this.linkObserver = null;
    }
  }

  toggleToc(): void {
    this.tocOpen.update(v => !v);
    writeStorage(TOC_KEY, this.tocOpen() ? '1' : '0');
  }

  private async load(id: string): Promise<void> {
    this.cancelLinkNames();
    this.loading.set(true);
    this.error.set('');
    this.panel.set(null);
    try {
      const raw = await this.library.getHtml(id);
      // Assicura loading="lazy" e decoding="async" sulle immagini anche per i documenti già negli snapshot.
      const optimized = raw.replace(/<img(?=\s(?![^>]*\bloading=))/gi, '<img loading="lazy" decoding="async"');
      // Il contenuto arriva dai tuoi documenti: viene mostrato senza filtri,
      // così restano intatti gli ID, le tabelle e i collegamenti delle formule.
      this.html.set(this.sanitizer.bypassSecurityTrustHtml(optimized));
      const run = this.linkRun;
      setTimeout(() => {
        if (run === this.linkRun) this.linkNames(run);
      }); // dopo che Angular ha inserito il testo
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
   * (anche nel bestiario). Sui documenti lunghi collega solo i blocchi vicini alla viewport
   * tramite IntersectionObserver, evitando migliaia di mutazioni DOM inutili fuori schermo.
   */
  private linkNames(run: number): void {
    const root = this.contentEl?.nativeElement;
    if (!root || run !== this.linkRun) return;
    const terms = this.library.linkTerms();
    if (!terms.map.size) return;

    const linkSubtree = (el: HTMLElement) => {
      if (!el.isConnected || el.dataset['linked']) return;
      el.dataset['linked'] = '1';
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: n => {
          const p = n.parentElement;
          if (!p || p.closest('h1, h2, h3, h4, h5, h6, a, button, .seed, .term-link, .formula-detail')) {
            return NodeFilter.FILTER_REJECT;
          }
          return (n.textContent ?? '').length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        if (!node.isConnected) continue;
        const parts = splitTerms(node.textContent ?? '', terms);
        if (parts.length === 1 && !parts[0].ref) continue;
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (part.ref) {
            const span = document.createElement('span');
            span.className = 'term-link';
            span.dataset['doc'] = part.ref.docId;
            span.dataset['anchor'] = part.ref.anchor;
            span.dataset['heading'] = part.ref.heading;
            span.dataset['docName'] = part.ref.docName;
            span.dataset['level'] = String(part.ref.level);
            span.textContent = part.text;
            frag.append(span);
          } else {
            frag.append(part.text);
          }
        }
        node.replaceWith(frag);
      }
    };

    const blocks = (Array.from(root.children) as HTMLElement[]).filter(
      el => !/^(H[1-6]|BUTTON|HR)$/.test(el.tagName) && !el.classList.contains('formula-detail')
    );

    if (blocks.length > 80 && typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver(
        entries => {
          if (run !== this.linkRun) {
            obs.disconnect();
            return;
          }
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const target = entry.target as HTMLElement;
            obs.unobserve(target);
            linkSubtree(target);
          }
        },
        { rootMargin: '600px 0px' }
      );
      this.linkObserver = obs;
      for (const b of blocks) obs.observe(b);
      return;
    }

    let idx = 0;
    const step = () => {
      this.linkFrame = null;
      if (run !== this.linkRun) return;
      const deadline = performance.now() + 10;
      while (idx < blocks.length && performance.now() < deadline) {
        linkSubtree(blocks[idx++]);
      }
      if (idx < blocks.length && run === this.linkRun) {
        this.linkFrame = requestAnimationFrame(step);
      }
    };
    step();
  }

  private scrollToFragment(): void {
    const frag = this.route.snapshot.fragment;
    if (!frag) return;
    setTimeout(() => document.getElementById(frag)?.scrollIntoView({ block: 'start' }));
  }

  async onClick(ev: Event): Promise<void> {
    const t = ev.target as HTMLElement;

    // Clic su un nome collegato (feat, talento, spell): apre la sua sezione.
    const link = t.closest('.term-link') as HTMLElement | null;
    if (link) {
      ev.preventDefault();
      const d = link.dataset;
      await this.openEntry({
        docId: d['doc'] ?? '',
        docName: d['docName'] ?? '',
        anchor: d['anchor'] ?? '',
        heading: d['heading'] ?? '',
        level: Number(d['level'] ?? 3),
      });
      return;
    }

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
      const blocks = await Promise.all(
        terms.map(async t => {
          const m = /^\*(\d)\*(.+)$/.exec(t); // spell base di livello 0-9
          const term = m ? m[2] : t;
          return `<h6 class="term">${esc(term)}</h6>${await this.describe(term, m?.[1])}`;
        })
      );
      box.innerHTML = blocks.join('');
      box.hidden = false;
      btn.textContent = 'Nascondi le descrizioni';
    }
  }

  private describe(term: string, base?: string): Promise<string> {
    return base === undefined ? this.lookup.explain(term) : this.lookup.explainSeed(term, Number(base));
  }

  private async openEntry(ref: EntryRef): Promise<void> {
    this.panelTitle.set(ref.heading);
    this.panel.set(this.sanitizer.bypassSecurityTrustHtml('<p class="muted">Caricamento…</p>'));
    const html = await this.lookup.entryHtml(ref);
    this.panel.set(this.sanitizer.bypassSecurityTrustHtml(html || '<p class="muted">Voce non trovata.</p>'));
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
