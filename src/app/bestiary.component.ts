import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, iconFor } from './icon.component';
import { LibraryService } from './library.service';
import { LookupService, isDocNode } from './lookup.service';
import { TreeNode } from './models';
import {
  BESTIARY_ENV_GROUPS,
  BESTIARY_SIZES,
  BestiaryEntry,
  CR_OPTIONS,
  extractBestiaryEntry,
} from './bestiary-index';

type ViewMode = 'catalog' | 'folders';
type SortMode = 'name-asc' | 'name-desc' | 'cr-asc' | 'cr-desc';

const PAGE_SIZE = 100;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

function findBestiaryFolder(node: TreeNode | null): TreeNode | undefined {
  if (!node) return undefined;
  if (node.kind === 'folder' && /bestiar|bestiary/i.test(node.name)) return node;
  for (const c of node.children ?? []) {
    const hit = findBestiaryFolder(c);
    if (hit) return hit;
  }
  return undefined;
}

@Component({
  selector: 'app-bestiary',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="crumbs" aria-label="Percorso">
      <a routerLink="/">Home</a>
      <span>›</span>
      <span>Bestiario</span>
    </nav>

    <h1 class="card-title"><app-icon [name]="'dragon'" />Bestiario</h1>
    <p class="muted">
      Consulta le creature filtrando per CR, tipo, ambiente e taglia, oppure sfoglia le cartelle originali del Drive.
    </p>

    <div class="chips" role="tablist" aria-label="Modalità vista bestiario">
      <button type="button" class="chip" role="tab" [attr.aria-selected]="mode() === 'catalog'" [class.on]="mode() === 'catalog'" (click)="mode.set('catalog')">
        Catalogo filtrabile<small>{{ entries().length }}</small>
      </button>
      <button type="button" class="chip" role="tab" [attr.aria-selected]="mode() === 'folders'" [class.on]="mode() === 'folders'" (click)="mode.set('folders')">
        Per cartelle<small>{{ folders().length }}</small>
      </button>
    </div>

    @if (library.bestiaryStatus()) {
      <p class="muted">{{ library.bestiaryStatus() }}</p>
    }

    @if (mode() === 'catalog') {
      <section class="calc-block bestiary-controls">
        <input
          type="search"
          class="filter"
          placeholder="Cerca per nome, abilità o testo nelle schede del bestiario…"
          aria-label="Cerca nel bestiario"
          [value]="rawQuery()"
          (input)="onSearch($any($event.target).value)"
        />

        <div class="bestiary-filters">
          <label>
            Ordina per
            <select aria-label="Ordina per" [value]="sort()" (change)="sort.set($any($event.target).value)">
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="cr-asc">CR crescente</option>
              <option value="cr-desc">CR decrescente</option>
            </select>
          </label>

          <label>
            Tipo
            <select aria-label="Tipo di creatura" [value]="category()" (change)="setCategory($any($event.target).value)">
              <option value="">Tutti i tipi ({{ entries().length }})</option>
              @for (c of categories(); track c.name) {
                <option [value]="c.name">{{ c.name }} ({{ c.count }})</option>
              }
            </select>
          </label>

          @if (subcategories().length) {
            <label>
              Sottocategoria
              <select aria-label="Sottocategoria" [value]="subcategory()" (change)="setSubcategory($any($event.target).value)">
                <option value="">Tutte</option>
                @for (s of subcategories(); track s.name) {
                  <option [value]="s.name">{{ s.name }} ({{ s.count }})</option>
                }
              </select>
            </label>
          }

          <label>
            Ambiente
            <select aria-label="Ambiente" [value]="env()" (change)="setEnv($any($event.target).value)">
              <option value="">Tutti gli ambienti</option>
              @for (g of envGroups; track g.key) {
                <option [value]="g.key">{{ g.label }}</option>
              }
            </select>
          </label>

          <label>
            Taglia
            <select aria-label="Taglia" [value]="size()" (change)="setSize($any($event.target).value)">
              <option value="">Tutte le taglie</option>
              @for (sz of sizes; track sz) {
                <option [value]="sz">{{ sz }}</option>
              }
            </select>
          </label>

          <div class="cr-range-box">
            <div class="cr-range-head">
              <span>Grado di Sfida (CR)</span>
              <strong>{{ crRangeLabel() }}</strong>
            </div>
            <div class="cr-track">
              <div class="cr-rail"></div>
              <div class="cr-fill" [style.left.%]="crMinPct()" [style.width.%]="crMaxPct() - crMinPct()"></div>
              <input
                type="range"
                class="cr-thumb cr-min"
                [class.top-thumb]="crMinIdx() >= crMaxIndex - 1"
                aria-label="CR minimo"
                [min]="0"
                [max]="crMaxIndex"
                [value]="crMinIdx()"
                (input)="setCrMinIdx($any($event.target))"
              />
              <input
                type="range"
                class="cr-thumb cr-max"
                aria-label="CR massimo"
                [min]="0"
                [max]="crMaxIndex"
                [value]="crMaxIdx()"
                (input)="setCrMaxIdx($any($event.target))"
              />
            </div>
            <div class="cr-ticks">
              <span>{{ crOptions[0].label }}</span>
              <span>{{ crOptions[crMaxIndex].label }}</span>
            </div>
          </div>
        </div>

        <div class="alpha-bar" role="group" aria-label="Indice alfabetico">
          <button type="button" class="alpha" [class.on]="letter() === ''" (click)="setLetter('')">Tutte</button>
          @for (ch of letters; track ch) {
            <button
              type="button"
              class="alpha"
              [class.on]="letter() === ch"
              [disabled]="!availableLetters().has(ch)"
              (click)="setLetter(letter() === ch ? '' : ch)"
            >
              {{ ch }}
            </button>
          }
        </div>

        <div class="bestiary-summary">
          <span class="muted">
            @if (!entries().length) {
              Caricamento del bestiario in corso…
            } @else {
              {{ filtered().length }} {{ filtered().length === 1 ? 'scheda' : 'schede' }}
              @if (filtered().length !== entries().length) { su {{ entries().length }} }
            }
          </span>
          @if (hasFilters()) {
            <button type="button" class="ghost" (click)="resetFilters()">Azzera filtri</button>
          }
        </div>
      </section>

      <ul class="list bestiary-list">
        @for (e of visible(); track e.docId) {
          <li class="bestiary-row">
            <div class="bestiary-main">
              <a [routerLink]="['/doc', e.docId]">
                <app-icon [name]="'dragon'" />
                <strong>{{ e.name }}</strong>
              </a>
              <span class="entry-meta muted">
                {{ e.category }}@if (e.subcategory) { › {{ e.subcategory }} }
                @if (e.sizes.length) { · {{ e.sizes.join('/') }} }
                @if (e.envs.length) { · {{ formatEnvs(e.envs) }} }
              </span>
            </div>
            @if (e.crLabel) {
              <span class="cr-badge">{{ e.crLabel }}</span>
            }
          </li>
        } @empty {
          <li class="muted">Nessuna creatura corrisponde ai filtri selezionati.</li>
        }
      </ul>

      @if (filtered().length > limit()) {
        <p class="bestiary-more">
          <button type="button" class="ghost" (click)="showMore()">
            Mostra altre schede ({{ filtered().length - limit() }} rimanenti)
          </button>
        </p>
      }
    } @else {
      @if (folders().length) {
        <div class="cards">
          @for (c of folders(); track c.id) {
            <a class="card" [routerLink]="['/cartella', c.id]">
              <strong class="card-title"><app-icon [name]="icon(c.name)" />{{ c.name }}</strong>
              <span class="muted">{{ lookup.countFiles(c) }} documenti</span>
            </a>
          }
        </div>
      }
      @if (rootFiles().length) {
        <h2>Introduzione e template</h2>
        <ul class="list">
          @for (d of rootFiles(); track d.id) {
            <li><a [routerLink]="['/doc', d.id]"><app-icon [name]="icon(d.name, false)" />{{ d.name }}</a></li>
          }
        </ul>
      }
    }
  `,
})
export class BestiaryComponent {
  readonly library = inject(LibraryService);
  readonly lookup = inject(LookupService);
  private destroyRef = inject(DestroyRef);
  readonly icon = iconFor;

  readonly envGroups = BESTIARY_ENV_GROUPS;
  readonly sizes = BESTIARY_SIZES;
  readonly crOptions = CR_OPTIONS;
  readonly crMaxIndex = CR_OPTIONS.length - 1;
  readonly letters = LETTERS;

  readonly mode = signal<ViewMode>('catalog');
  readonly rawQuery = signal('');
  readonly query = signal('');
  readonly category = signal('');
  readonly subcategory = signal('');
  readonly crMinIdx = signal(0);
  readonly crMaxIdx = signal(CR_OPTIONS.length - 1);
  readonly env = signal('');
  readonly size = signal('');
  readonly letter = signal('');
  readonly sort = signal<SortMode>('name-asc');
  readonly limit = signal(PAGE_SIZE);

  readonly crActive = computed(() => this.crMinIdx() > 0 || this.crMaxIdx() < this.crMaxIndex);
  readonly crMinPct = computed(() => (this.crMinIdx() / this.crMaxIndex) * 100);
  readonly crMaxPct = computed(() => (this.crMaxIdx() / this.crMaxIndex) * 100);
  readonly crRangeLabel = computed(() => {
    const lo = this.crMinIdx();
    const hi = this.crMaxIdx();
    if (lo === 0 && hi === this.crMaxIndex) return 'Tutti';
    const a = this.crOptions[lo].label;
    const b = this.crOptions[hi].label;
    return lo === hi ? `CR ${a}` : `CR ${a} – ${b}`;
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private envLabels = new Map(BESTIARY_ENV_GROUPS.map(g => [g.key, g.label.split(' / ')[0]]));

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    });
  }

  /** Cartella radice Bestiary nell'albero del Drive. */
  readonly bestiaryFolder = computed(() => findBestiaryFolder(this.library.tree()));
  readonly folders = computed(() => (this.bestiaryFolder()?.children ?? []).filter(c => c.kind === 'folder'));
  readonly rootFiles = computed(() => (this.bestiaryFolder()?.children ?? []).filter(c => isDocNode(c)));

  /** Tutte le schede del Bestiario indicizzate con CR, tipo, ambiente e taglia. */
  readonly entries = computed<BestiaryEntry[]>(() => {
    this.library.version();
    this.library.tree();
    const out: BestiaryEntry[] = [];
    for (const m of this.library.allMetas()) {
      if (!this.library.isBestiary(m.id)) continue;
      out.push(extractBestiaryEntry(m, this.library.pathOf(m.id)));
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
  });

  readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.entries()) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  });

  readonly subcategories = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    const counts = new Map<string, number>();
    for (const e of this.entries()) {
      if (e.category === cat && e.subcategory) {
        counts.set(e.subcategory, (counts.get(e.subcategory) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  });

  /** Lettere disponibili considerando gli altri filtri (esclusa la lettera stessa). */
  readonly availableLetters = computed(() => {
    const set = new Set<string>();
    for (const e of this.entries()) set.add(e.letter);
    return set;
  });

  readonly hasFilters = computed(
    () =>
      !!this.query().trim() ||
      !!this.category() ||
      !!this.subcategory() ||
      this.crActive() ||
      !!this.env() ||
      !!this.size() ||
      !!this.letter()
  );

  readonly filtered = computed<BestiaryEntry[]>(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const sub = this.subcategory();
    const minIdx = this.crMinIdx();
    const maxIdx = this.crMaxIdx();
    const filterCr = minIdx > 0 || maxIdx < this.crMaxIndex;
    const minCr = this.crOptions[minIdx].value;
    const maxCr = maxIdx === this.crMaxIndex ? Infinity : this.crOptions[maxIdx].value;
    const env = this.env();
    const sz = this.size();
    const ch = this.letter();
    const sort = this.sort();

    // Se c'è una query testuale, uniamo match diretto su nome/titoli + risultati full-text MiniSearch
    let fullTextIds: Set<string> | null = null;
    if (q) {
      fullTextIds = new Set(this.library.search(q, 250, 'bestiary').map(h => h.docId));
    }

    const list = this.entries().filter(e => {
      if (cat && e.category !== cat) return false;
      if (sub && e.subcategory !== sub) return false;
      if (ch && e.letter !== ch) return false;
      if (env && !e.envs.includes(env)) return false;
      if (sz && !e.sizes.includes(sz)) return false;
      if (filterCr) {
        if (!e.crs.length) return false;
        if (!e.crs.some(c => c >= minCr - 0.001 && c <= maxCr + 0.001)) return false;
      }
      if (q && !e.searchBlob.includes(q) && !fullTextIds?.has(e.docId)) return false;
      return true;
    });

    const cmpName = (a: BestiaryEntry, b: BestiaryEntry) =>
      a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

    if (sort === 'name-desc') return [...list].sort((a, b) => cmpName(b, a));
    if (sort === 'cr-asc') {
      return [...list].sort((a, b) => {
        const ca = a.crMin ?? 999;
        const cb = b.crMin ?? 999;
        return ca !== cb ? ca - cb : cmpName(a, b);
      });
    }
    if (sort === 'cr-desc') {
      return [...list].sort((a, b) => {
        const ca = a.crMax ?? -1;
        const cb = b.crMax ?? -1;
        return ca !== cb ? cb - ca : cmpName(a, b);
      });
    }
    return list;
  });

  readonly visible = computed(() => this.filtered().slice(0, this.limit()));

  onSearch(value: string): void {
    this.rawQuery.set(value);
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    if (!value.trim()) {
      this.searchTimer = null;
      this.query.set('');
      this.limit.set(PAGE_SIZE);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.query.set(value);
      this.limit.set(PAGE_SIZE);
    }, 150);
  }

  setCategory(v: string): void {
    this.category.set(v);
    this.subcategory.set('');
    this.limit.set(PAGE_SIZE);
  }

  setSubcategory(v: string): void {
    this.subcategory.set(v);
    this.limit.set(PAGE_SIZE);
  }

  setCrMinIdx(el: HTMLInputElement): void {
    const clamped = Math.max(0, Math.min(Number(el.value), this.crMaxIdx()));
    el.value = String(clamped);
    this.crMinIdx.set(clamped);
    this.limit.set(PAGE_SIZE);
  }

  setCrMaxIdx(el: HTMLInputElement): void {
    const clamped = Math.min(this.crMaxIndex, Math.max(Number(el.value), this.crMinIdx()));
    el.value = String(clamped);
    this.crMaxIdx.set(clamped);
    this.limit.set(PAGE_SIZE);
  }

  setEnv(v: string): void {
    this.env.set(v);
    this.limit.set(PAGE_SIZE);
  }

  setSize(v: string): void {
    this.size.set(v);
    this.limit.set(PAGE_SIZE);
  }

  setLetter(v: string): void {
    this.letter.set(v);
    this.limit.set(PAGE_SIZE);
  }

  resetFilters(): void {
    this.rawQuery.set('');
    this.query.set('');
    this.category.set('');
    this.subcategory.set('');
    this.crMinIdx.set(0);
    this.crMaxIdx.set(this.crMaxIndex);
    this.env.set('');
    this.size.set('');
    this.letter.set('');
    this.limit.set(PAGE_SIZE);
  }

  showMore(): void {
    this.limit.update(n => n + PAGE_SIZE);
  }

  formatEnvs(keys: string[]): string {
    return keys
      .filter(k => k !== 'Any' || keys.length === 1)
      .slice(0, 3)
      .map(k => this.envLabels.get(k) ?? k)
      .join(', ');
  }
}
