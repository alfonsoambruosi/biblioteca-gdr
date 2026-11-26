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
import {
  DIFFICULTIES,
  ENCOUNTER_STYLES,
  EncounterSlot,
  EncounterStyle,
  encounterBudgetXp,
  estimateCrFromXp,
  generateEncounter,
  rerollSlot,
} from './encounter-gen';

type ViewMode = 'catalog' | 'encounter' | 'folders';
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
      <button type="button" class="chip" role="tab" [attr.aria-selected]="mode() === 'encounter'" [class.on]="mode() === 'encounter'" (click)="mode.set('encounter')">
        Generatore incontri
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
    } @else if (mode() === 'encounter') {
      <section class="calc-block bestiary-controls">
        <h2>Gruppo e difficoltà</h2>
        <div class="bestiary-filters">
          <label>
            Numero giocatori
            <input
              type="number"
              class="enc-num"
              min="1"
              max="12"
              aria-label="Numero giocatori"
              [value]="players()"
              (input)="setPlayers(+$any($event.target).value)"
            />
          </label>

          <label>
            Livello medio gruppo
            <input
              type="number"
              class="enc-num"
              min="1"
              max="20"
              aria-label="Livello medio gruppo"
              [value]="partyLevel()"
              (input)="setPartyLevel(+$any($event.target).value)"
            />
          </label>

          <label>
            Difficoltà
            <select aria-label="Difficoltà incontro" [value]="diffOffset()" (change)="diffOffset.set(+$any($event.target).value)">
              @for (d of difficulties; track d.id) {
                <option [value]="d.offset">{{ d.label }}</option>
              }
            </select>
          </label>

          <label>
            Composizione
            <select aria-label="Composizione incontro" [value]="encStyle()" (change)="encStyle.set($any($event.target).value)">
              @for (s of encounterStyles; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
        </div>

        <h3>Filtri creature (facoltativi)</h3>
        <div class="bestiary-filters">
          <label>
            Tipo
            <select aria-label="Tipo creature per incontro" [value]="encCategory()" (change)="setEncCategory($any($event.target).value)">
              <option value="">Tutti i tipi</option>
              @for (c of categories(); track c.name) {
                <option [value]="c.name">{{ c.name }} ({{ c.count }})</option>
              }
            </select>
          </label>

          @if (encSubcategories().length) {
            <label>
              Sottocategoria
              <select aria-label="Sottocategoria per incontro" [value]="encSubcategory()" (change)="encSubcategory.set($any($event.target).value)">
                <option value="">Tutte</option>
                @for (s of encSubcategories(); track s.name) {
                  <option [value]="s.name">{{ s.name }} ({{ s.count }})</option>
                }
              </select>
            </label>
          }

          <label>
            Ambiente
            <select aria-label="Ambiente per incontro" [value]="encEnv()" (change)="encEnv.set($any($event.target).value)">
              <option value="">Tutti gli ambienti</option>
              @for (g of envGroups; track g.key) {
                <option [value]="g.key">{{ g.label }}</option>
              }
            </select>
          </label>

          <label>
            Taglia
            <select aria-label="Taglia per incontro" [value]="encSize()" (change)="encSize.set($any($event.target).value)">
              <option value="">Tutte le taglie</option>
              @for (sz of sizes; track sz) {
                <option [value]="sz">{{ sz }}</option>
              }
            </select>
          </label>
        </div>

        <div class="enc-actions">
          <button type="button" class="primary-btn" (click)="rollEncounter()" [disabled]="!encPool().length">
            {{ encSlots().length ? 'Rigenera incontro casuale' : 'Genera incontro casuale' }}
          </button>
          @if (hasEncFilters()) {
            <button type="button" class="ghost" (click)="resetEncFilters()">Azzera filtri</button>
          }
          <span class="muted small">
            Budget target: <strong>{{ fmt(encBudget()) }} XP</strong> (CR ~{{ encBudgetCr() }}) ·
            {{ encPool().length }} creature compatibili nel pool
          </span>
        </div>
      </section>

      @if (encSlots().length) {
        <section class="calc-block enc-result" aria-live="polite">
          <div class="enc-result-head">
            <div>
              <h2>Incontro generato · CR stimato {{ encActualCr() }}</h2>
              <p class="muted small">
                Totale: <strong>{{ fmt(encTotalXp()) }} XP</strong> (budget {{ fmt(encBudget()) }} XP · {{ encFitLabel() }}) ·
                <strong>{{ fmt(encXpPerPlayer()) }} XP</strong> a giocatore ({{ players() }} PG)
              </p>
            </div>
            <button type="button" class="ghost" (click)="rollEncounter()">Nuovo lancio</button>
          </div>

          <ul class="list enc-list">
            @for (slot of encSlots(); track slot.entry.docId + ':' + slot.cr) {
              <li class="enc-row">
                <div class="enc-qty" role="group" [attr.aria-label]="'Quantità ' + slot.entry.name">
                  <button type="button" class="ghost qty-btn" (click)="adjustSlot($index, -1)" aria-label="Rimuovi uno">−</button>
                  <strong class="qty-val">{{ slot.count }}×</strong>
                  <button type="button" class="ghost qty-btn" (click)="adjustSlot($index, 1)" aria-label="Aggiungi uno">+</button>
                </div>

                <div class="bestiary-main">
                  <a [routerLink]="['/doc', slot.entry.docId]">
                    <app-icon [name]="'dragon'" />
                    <strong>{{ slot.entry.name }}</strong>
                  </a>
                  <span class="entry-meta muted">
                    {{ slot.entry.category }}@if (slot.entry.subcategory) { › {{ slot.entry.subcategory }} }
                    @if (slot.entry.sizes.length) { · {{ slot.entry.sizes.join('/') }} }
                    @if (slot.entry.envs.length) { · {{ formatEnvs(slot.entry.envs) }} }
                  </span>
                </div>

                <div class="enc-slot-right">
                  <span class="cr-badge">{{ slot.crLabel }}</span>
                  <small class="muted">{{ fmt(slot.xpEach * slot.count) }} XP</small>
                  <button type="button" class="ghost small" (click)="swapSlot($index)">Cambia</button>
                </div>
              </li>
            }
          </ul>
        </section>
      } @else if (encTried()) {
        <p class="muted">Nessuna creatura disponibile nel pool con questi filtri: prova ad allargare Tipo, Ambiente o Taglia.</p>
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
  readonly difficulties = DIFFICULTIES;
  readonly encounterStyles = ENCOUNTER_STYLES;

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

  // Stato del generatore di incontri
  readonly players = signal(4);
  readonly partyLevel = signal(5);
  readonly diffOffset = signal(0);
  readonly encStyle = signal<EncounterStyle>('random');
  readonly encCategory = signal('');
  readonly encSubcategory = signal('');
  readonly encEnv = signal('');
  readonly encSize = signal('');
  readonly encSlots = signal<EncounterSlot[]>([]);
  readonly encTried = signal(false);

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

  // ---------------------------------------------------------------- generatore incontri

  readonly encSubcategories = computed(() => {
    const cat = this.encCategory();
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

  readonly hasEncFilters = computed(
    () => !!this.encCategory() || !!this.encSubcategory() || !!this.encEnv() || !!this.encSize()
  );

  readonly encPool = computed(() => {
    const cat = this.encCategory();
    const sub = this.encSubcategory();
    const env = this.encEnv();
    const sz = this.encSize();
    return this.entries().filter(e => {
      if (!e.crs.length) return false;
      if (cat && e.category !== cat) return false;
      if (sub && e.subcategory !== sub) return false;
      if (env && !e.envs.includes(env)) return false;
      if (sz && !e.sizes.includes(sz)) return false;
      return true;
    });
  });

  readonly encBudget = computed(() => encounterBudgetXp(this.players(), this.partyLevel(), this.diffOffset()));
  readonly encBudgetCr = computed(() => estimateCrFromXp(this.encBudget()));
  readonly encTotalXp = computed(() => this.encSlots().reduce((t, s) => t + s.xpEach * s.count, 0));
  readonly encActualCr = computed(() => estimateCrFromXp(this.encTotalXp()));
  readonly encXpPerPlayer = computed(() => Math.round(this.encTotalXp() / Math.max(1, this.players())));
  readonly encFitLabel = computed(() => {
    const ratio = this.encTotalXp() / Math.max(1, this.encBudget());
    if (ratio < 0.75) return 'sotto budget';
    if (ratio > 1.25) return 'sopra budget';
    return 'in linea col budget';
  });

  setPlayers(n: number): void {
    if (!Number.isFinite(n)) return;
    this.players.set(Math.max(1, Math.min(12, Math.round(n))));
  }

  setPartyLevel(n: number): void {
    if (!Number.isFinite(n)) return;
    this.partyLevel.set(Math.max(1, Math.min(20, Math.round(n))));
  }

  setEncCategory(v: string): void {
    this.encCategory.set(v);
    this.encSubcategory.set('');
  }

  resetEncFilters(): void {
    this.encCategory.set('');
    this.encSubcategory.set('');
    this.encEnv.set('');
    this.encSize.set('');
  }

  rollEncounter(): void {
    this.encTried.set(true);
    const res = generateEncounter(
      this.encPool(),
      this.players(),
      this.partyLevel(),
      this.diffOffset(),
      this.encStyle()
    );
    this.encSlots.set(res ? res.slots : []);
  }

  adjustSlot(index: number, delta: number): void {
    this.encSlots.update(list =>
      list
        .map((s, i) => (i === index ? { ...s, count: s.count + delta } : s))
        .filter(s => s.count > 0)
    );
  }

  swapSlot(index: number): void {
    const list = this.encSlots();
    const cur = list[index];
    if (!cur) return;
    const exclude = new Set(list.map(s => s.entry.docId));
    const next = rerollSlot(this.encPool(), cur, exclude);
    if (!next) return;
    this.encSlots.update(items => items.map((s, i) => (i === index ? next : s)));
  }

  fmt(n: number): string {
    return Math.round(n).toLocaleString('it-IT');
  }

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
