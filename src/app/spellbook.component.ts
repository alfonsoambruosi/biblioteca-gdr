import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { LibraryService } from './library.service';
import { LookupService, SpellRef } from './lookup.service';
import { ROGUE_TRICKS, SHADOW_HAND, onlineUrl } from './extra-lists';

const LABELS: Record<string, string> = { arcane: 'Mago', divine: 'Divina' };
function label(key: string): string {
  return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

@Component({
  selector: 'app-spellbook',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="card-title"><app-icon [name]="'spell'" />Incantesimi per classe</h1>
    <p class="muted">
      Il Mago conosce tutte le spell arcane del Drive, più le manovre della Mano d'Ombra.
      Le spell non presenti nel Drive si cercano online (Pathfinder 1e o D&amp;D 3.5).
    </p>

    @if (!lists().length) {
      <p class="muted">Nessuna lista trovata: le voci devono riportare la riga “Level …”.</p>
    }

    <div class="chips" role="group" aria-label="Liste">
      @for (l of lists(); track l.key) {
        <button type="button" class="chip" [class.on]="l.key === current()" (click)="pick(l.key)">
          {{ l.label }}<small>{{ l.count }}</small>
        </button>
      }
    </div>

    <div class="chips" role="group" aria-label="Livelli">
      @for (lv of levels(); track lv) {
        <button type="button" class="chip" [class.on]="lv === level()" (click)="level.set(lv)">
          Livello {{ lv }}
        </button>
      }
    </div>

    <input
      class="filter"
      type="search"
      placeholder="Filtra per nome…"
      aria-label="Filtra per nome"
      (input)="onFilter($any($event.target).value)"
    />

    <ul class="list">
      @for (s of items(); track s.name + (s.docId ?? s.url)) {
        <li>
          @if (s.docId) {
            <a [routerLink]="['/doc', s.docId]" [fragment]="s.anchor ?? ''">{{ s.name }}</a>
          } @else {
            <a [href]="s.url" target="_blank" rel="noopener">{{ s.name }} (cerca online)</a>
          }
          <small class="muted">{{ s.docName }}</small>
        </li>
      } @empty {
        <li class="muted">Nessuna spell con questi filtri.</li>
      }
    </ul>
  `,
})
export class SpellbookComponent {
  private library = inject(LibraryService);
  private lookup = inject(LookupService);
  private destroyRef = inject(DestroyRef);
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.filterTimer !== null) clearTimeout(this.filterTimer);
    });
  }

  onFilter(value: string): void {
    if (this.filterTimer !== null) clearTimeout(this.filterTimer);
    if (!value.trim()) {
      this.filterTimer = null;
      this.filter.set('');
      return;
    }
    this.filterTimer = setTimeout(() => {
      this.filterTimer = null;
      this.filter.set(value);
    }, 120);
  }

  /** Liste dal Drive, più quelle aggiuntive: Mago (tutte le arcane + Mano d'Ombra) e Ladro. */
  readonly book = computed(() => {
    this.library.version();
    const base = this.lookup.spellBook();
    const out = new Map<string, Map<number, SpellRef[]>>();
    const add = (key: string, level: number, ref: SpellRef) => {
      if (!out.has(key)) out.set(key, new Map());
      const byLevel = out.get(key)!;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(ref);
    };

    // Il Mago può conoscere qualsiasi spell arcana: unisco tutte le liste arcane.
    for (const [lvl, refs] of base.get('arcane') ?? []) refs.forEach(r => add('arcane', lvl, r));
    for (const [key, byLevel] of base) {
      if (key === 'arcane') continue;
      for (const [lvl, refs] of byLevel) refs.forEach(r => add(key, lvl, r));
    }
    for (const m of SHADOW_HAND) {
      add('arcane', m.level, {
        name: m.name,
        docName: `Mano d'Ombra (Tome of Battle) · livello ${m.level}`,
        url: onlineUrl(m.name, 'maneuver Tome of Battle 3.5'),
      });
    }

    // Ladro: le spell per livello 1-7, collegate al Drive se ci sono, altrimenti ricerca online.
    for (const r of ROGUE_TRICKS) {
      const hit = this.lookup.findEntries(r.name)[0];
      const ref: SpellRef = hit
        ? { name: r.name, docId: hit.docId, anchor: hit.anchor, docName: `${r.group} · Ladro` }
        : { name: r.name, docName: `${r.group} · Ladro`, url: onlineUrl(r.name, 'spell Pathfinder 1e 3.5') };
      add('rogue', r.level, ref);
    }
    return out;
  });

  readonly lists = computed(() =>
    [...this.book().entries()]
      .map(([key, byLevel]) => ({
        key,
        label: key === 'rogue' ? 'Ladro' : label(key),
        count: [...byLevel.values()].reduce((a, v) => a + v.length, 0),
      }))
      .sort((a, b) => (a.key === 'arcane' ? -1 : b.key === 'arcane' ? 1 : b.count - a.count))
  );

  readonly chosen = signal<string | null>(null);
  readonly current = computed(() => {
    const c = this.chosen();
    return c && this.book().has(c) ? c : (this.lists()[0]?.key ?? '');
  });

  readonly levels = computed(() =>
    [...(this.book().get(this.current())?.keys() ?? [])].sort((a, b) => a - b)
  );

  readonly level = signal(0);
  readonly filter = signal('');

  readonly items = computed<SpellRef[]>(() => {
    const list = this.book().get(this.current())?.get(this.level()) ?? [];
    const q = this.filter().trim().toLowerCase();
    return list
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  });

  pick(key: string): void {
    this.chosen.set(key);
    const lv = [...(this.book().get(key)?.keys() ?? [])].sort((a, b) => a - b);
    if (!lv.includes(this.level())) this.level.set(lv[0] ?? 0);
  }
}
