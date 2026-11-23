import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LibraryService } from './library.service';
import { LookupService } from './lookup.service';
import { TermTarget } from './term-links';
import { ModKind, Modifier, calcItem, levelAdjFromText } from './item-calc';
import { ITEM_PRESETS, ItemPreset } from './item-presets';
import { COMPOSITE_ITEMS, CompositeItem, CompositePart } from './item-composite';

interface SpellOption {
  key: string;
  name: string;
  level: number;
}

interface EntryOption {
  name: string;
  ref: TermTarget | null;
  adj: number | null;
  note: string;
}

const KINDS: { value: ModKind; label: string }[] = [
  { value: 'metamagia', label: 'Metamagia' },
  { value: 'talento', label: 'Talento' },
  { value: 'abilita', label: 'Potenziamento abilità' },
  { value: 'proprieta', label: 'Proprietà (armi e materiali)' },
];

const CATEGORIES = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'magico', label: 'Oggetti magici e armi (numen)' },
  { value: 'alchimia', label: 'Alchimia e veleni (gp a dose)' },
  { value: 'munizione', label: 'Frecce e dardi (numen a pezzo)' },
];

/** Pulisce il titolo di una voci della biblioteca: via i tag [..] e il codice fonte in fondo. */
function cleanName(heading: string): string {
  return heading
    .replace(/\[[^\]]*\]/g, '')
    .replace(/(?<=[a-z])[A-Z][A-Za-z0-9,&\-]*\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chiave di confronto: parole di almeno 3 lettere, in ordine alfabetico ("Lingering Evocation" = "Evocation, Lingering"). */
function tokenKey(name: string): string {
  return (name.toLowerCase().match(/[a-zà-ú]{3,}/g) ?? []).sort().join(' ');
}

@Component({
  selector: 'app-item-calc',
  imports: [RouterLink],
  template: `
    <nav class="crumbs"><a routerLink="/">Home</a> <span>›</span> <span>Creazione oggetti magici</span></nav>
    <h1>Creazione oggetti magici</h1>
    <p class="muted">
      Parti da una spell base, aggiungi metamagie, talenti, potenziamenti o proprietà e calcola il costo.
      Oggetti magici e armi costano in numen; alchimia e veleni costano in gp per dose, con la scorta privata in numen.
      Ogni variazione si può includere o escludere, e il valore si può modificare.
    </p>

    <section class="calc-block">
      <h2>0. Oggetto del Compendio (facoltativo)</h2>
      <p class="muted small">Precarica spell base, variazioni, CL, prezzo e unità di un oggetto del Compendio. Poi puoi modificare tutto.</p>
      <div class="pick-row">
        <select aria-label="Categoria" (change)="presetCat.set($any($event.target).value)">
          @for (c of categories; track c.value) {
            <option [value]="c.value" [selected]="presetCat() === c.value">{{ c.label }}</option>
          }
        </select>
        <input class="filter" type="search" placeholder="Cerca oggetto…" aria-label="Cerca oggetto del compendio"
          [value]="presetQ()" (input)="presetQ.set($any($event.target).value)" />
      </div>
      <select class="picker" size="8" aria-label="Oggetto del compendio" (change)="loadPreset($any($event.target).value)">
        @for (o of presetOptions(); track o.i) {
          <option [value]="o.i">{{ o.p.name }} · {{ o.p.unit === 'gp' ? 'gp a dose' : 'numen' }}</option>
        }
      </select>
      @if (presetTotal() !== null) {
        <p class="muted small">
          Totale stampato nel Compendio: {{ fmt(presetTotal()) }} {{ presetUnit() === 'gp' ? 'gp a dose' : 'numen' }}
          @if (presetStock() !== null) { · scorta privata: {{ fmt(presetStock()) }} numen }
        </p>
      }
    </section>

    <section class="calc-block">
      <h2>1. Spell base</h2>
      <input class="filter" type="search" placeholder="Cerca una spell…" aria-label="Cerca spell"
        [value]="spellQ()" (input)="spellQ.set($any($event.target).value)" />
      <select class="picker" size="8" aria-label="Spell base" (change)="pickBase($any($event.target).value)">
        @for (s of spellOptions(); track s.key) {
          <option [value]="s.key" [selected]="base()?.key === s.key">{{ s.name }} · livello {{ s.level }}</option>
        }
      </select>
      @if (base(); as b) {
        <p>Spell base: <strong>{{ b.name }}</strong>, livello <strong>{{ b.level }}</strong></p>
      } @else {
        <p class="muted">Scegli una spell dalla lista.</p>
      }
    </section>

    <section class="calc-block">
      <h2>2. Variazioni</h2>
      <div class="pick-row">
        <select aria-label="Tipo di variazione" (change)="kind.set($any($event.target).value)">
          @for (k of kinds; track k.value) {
            <option [value]="k.value" [selected]="kind() === k.value">{{ k.label }}</option>
          }
        </select>
        <input class="filter" type="search" placeholder="Cerca…" aria-label="Cerca variazione"
          [value]="modQ()" (input)="modQ.set($any($event.target).value)" />
      </div>
      <select class="picker" size="8" aria-label="Scegli variazione" (change)="addMod($any($event.target).value)">
        @for (o of modOptions(); track $index) {
          <option [value]="$index">{{ o.name }}{{ o.adj !== null ? ' · ' + (o.adj >= 0 ? '+' : '') + o.adj + ' livelli' : '' }}</option>
        }
      </select>
      @if (kind() === 'metamagia') {
        <p class="muted small">Il valore dal testo della biblioteca è solo un suggerimento: verifica con l'oggetto che stai creando.</p>
      }

      <h3>Variazioni scelte</h3>
      @if (mods().length) {
        <ul class="mods">
          @for (m of mods(); track $index) {
            <li>
              <label><input type="checkbox" [checked]="m.on" (change)="toggle($index)" /> conta</label>
              <strong>{{ m.name }}</strong>
              <small class="muted">{{ kindLabel(m.kind) }}</small>
              <label>livelli
                <input class="num" type="number" [value]="m.adj" (input)="setAdj($index, $any($event.target).value)" />
              </label>
              <small class="muted">{{ m.source === 'biblioteca' ? 'dal testo' : 'manuale' }}</small>
              <button type="button" class="ghost" (click)="remove($index)">Rimuovi</button>
            </li>
          }
        </ul>
      } @else {
        <p class="muted">Nessuna variazione.</p>
      }

      <div class="pick-row">
        <input type="text" placeholder="Nome (es. Ray Splitting)" aria-label="Nome variazione manuale"
          [value]="manualName()" (input)="manualName.set($any($event.target).value)" />
        <label>livelli
          <input class="num" type="number" [value]="manualAdj()" (input)="manualAdj.set(+$any($event.target).value)" />
        </label>
        <button type="button" class="ghost" (click)="addManual()">Aggiungi</button>
      </div>
    </section>

    <section class="calc-block">
      <h2>3. Parametri</h2>
      <div class="pick-row">
        <label>Prezzo in
          <select aria-label="Unità del prezzo" (change)="setUnit($any($event.target).value)">
            <option value="numen" [selected]="unit() === 'numen'">numen (oggetti, armi, munizioni)</option>
            <option value="gp" [selected]="unit() === 'gp'">gp a dose (alchimia e veleni)</option>
          </select>
        </label>
        <label>Livello incantatore (CL)
          <input class="num" type="number" min="1" [value]="cl()" (input)="cl.set(+$any($event.target).value || 1)" />
        </label>
        <label>Prezzo base ({{ unit() === 'gp' ? 'gp' : 'numen' }})
          <input class="num" type="number" min="0" [value]="price()" (input)="price.set(+$any($event.target).value || 0)" />
        </label>
        <label>Moltiplicatore durata/uso (×)
          <input class="num" type="number" min="0" step="any" [value]="multiplier()"
            (input)="multiplier.set(+$any($event.target).value || 0)" />
        </label>
      </div>
      <p class="muted small">
        Numen: 500 per uso attivato. Alchimia: 50 gp per livello × CL. La scorta privata costa 18 volte i gp in numen.
      </p>
    </section>

    <section class="calc-block result" aria-live="polite">
      <h2>Risultato</h2>
      @if (base()) {
        <p>Livello finale: <strong>{{ result().level }}</strong></p>
        <p class="formula">{{ result().formula }}</p>
        @if (unit() === 'gp') {
          <p class="total">{{ fmt(result().total) }} gp a dose</p>
          <p class="total">Scorta privata: {{ fmt(result().stockNumen) }} numen</p>
        } @else {
          <p class="total">{{ fmt(result().total) }} numen</p>
        }
        @if (presetTotal() !== null) {
          <p class="muted small">
            {{ matchesPreset() ? 'Coincide con il totale del Compendio.' : 'Non coincide con il Compendio: hai modificato livelli, CL, prezzo o variazioni.' }}
          </p>
        }
      } @else {
        <p class="muted">Scegli una spell base per calcolare il costo.</p>
      }
    </section>

    <section class="calc-block">
      <h2>4. Oggetti composti (più parti)</h2>
      <p class="muted small">
        Oggetti costruiti con più parti, ognuna con il suo costo. Il totale è la somma delle parti incluse.
        Dove il libro stampa un totale diverso dalla somma, lo segnalo: non correggo il libro.
      </p>
      <select class="picker" size="8" aria-label="Oggetto composto" (change)="pickComposite($any($event.target).value)">
        @for (c of composites; track $index) {
          <option [value]="$index">{{ c.name }} · {{ c.unit === 'gp' ? 'gp' : 'numen' }}</option>
        }
      </select>
      @if (composite(); as c) {
        <ul class="mods">
          @for (p of c.parts; track $index) {
            <li>
              <label><input type="checkbox" [checked]="partOn()[$index]" (change)="togglePart($index)" /> conta</label>
              <strong>{{ p.label }}</strong>
              <small class="muted">{{ p.kind === 'fixed' ? 'valore del libro' : 'formula' }}</small>
              <span>{{ fmt(partValue(p)) }} {{ unitLabel(c.unit) }}</span>
            </li>
          }
        </ul>
        <p class="total">Somma delle parti incluse: {{ fmt(compositeSum()) }} {{ unitLabel(c.unit) }}</p>
        <p class="muted small">Totale stampato nel libro: {{ fmt(c.stated) }} {{ unitLabel(c.unit) }}</p>
        @if (compositeMatches()) {
          <p class="muted small">Coincide con il libro.</p>
        } @else {
          <p class="small">Non coincide: il libro stampa {{ fmt(c.stated) }}, le parti incluse danno {{ fmt(compositeSum()) }}.</p>
        }
        @if (c.note) { <p class="muted small">{{ c.note }}</p> }
      } @else {
        <p class="muted">Scegli un oggetto composto dalla lista.</p>
      }
    </section>
  `,
})
export class ItemCalcComponent {
  private library = inject(LibraryService);
  private lookup = inject(LookupService);

  readonly kinds = KINDS;
  readonly categories = CATEGORIES;

  readonly presetCat = signal('tutti');
  readonly presetQ = signal('');
  readonly presetTotal = signal<number | null>(null);
  readonly presetUnit = signal<'numen' | 'gp'>('numen');
  readonly presetStock = signal<number | null>(null);

  readonly spellQ = signal('');
  readonly base = signal<SpellOption | null>(null);
  readonly kind = signal<ModKind>('metamagia');
  readonly modQ = signal('');
  readonly mods = signal<Modifier[]>([]);
  readonly manualName = signal('');
  readonly manualAdj = signal(1);
  readonly unit = signal<'numen' | 'gp'>('numen');
  readonly cl = signal(1);
  readonly price = signal(500);
  readonly multiplier = signal(1);

  /** Oggetti del Compendio filtrati per categoria e testo; value = indice in ITEM_PRESETS. */
  readonly presetOptions = computed(() => {
    const cat = this.presetCat();
    const q = this.presetQ().trim().toLowerCase();
    return ITEM_PRESETS.map((p, i) => ({ p, i }))
      .filter(o => (cat === 'tutti' || o.p.category === cat) && (!q || o.p.name.toLowerCase().includes(q)))
      .slice(0, 500);
  });

  /** Spell arcane (Mago): tutte, con il livello più basso in cui compaiono. */
  readonly spells = computed<SpellOption[]>(() => {
    this.library.version();
    const book = this.lookup.spellBook().get('arcane');
    if (!book) return [];
    const seen = new Map<string, SpellOption>();
    for (const [level, refs] of book) {
      for (const r of refs) {
        const cur = seen.get(r.name);
        if (!cur || level < cur.level) seen.set(r.name, { key: r.name, name: r.name, level });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  });

  readonly spellOptions = computed(() => {
    const q = this.spellQ().trim().toLowerCase();
    return this.spells().filter(s => !q || s.name.toLowerCase().includes(q)).slice(0, 400);
  });

  /**
   * Variazioni disponibili per tipo: dalla biblioteca (metamagie con qualsiasi tag [..Metamagic..],
   * talenti, potenziamenti) e dai componenti del Compendio che la biblioteca non ha come voce.
   */
  private readonly allOptions = computed<Record<ModKind, EntryOption[]>>(() => {
    this.library.version();
    const out: Record<ModKind, EntryOption[]> = { metamagia: [], talento: [], abilita: [], proprieta: [], manuale: [] };
    for (const m of this.library.allMetas()) {
      for (const s of m.sections) {
        if (s.level < 3 || !s.heading) continue;
        const ref: TermTarget = { docId: m.id, docName: m.name, anchor: s.id, heading: s.heading, level: s.level };
        const adj = levelAdjFromText(s.text);
        const note = adj !== null ? 'suggerito dal testo' : '';
        if (/Ch 8/i.test(m.name) && /\[[^\]]*\bMetamagic\b[^\]]*\]/i.test(s.heading)) {
          out.metamagia.push({ name: cleanName(s.heading), ref, adj, note });
        } else if (/Feat/i.test(m.name)) {
          out.talento.push({ name: cleanName(s.heading), ref, adj, note });
        } else if (/Skill/i.test(m.name)) {
          out.abilita.push({ name: cleanName(s.heading), ref, adj, note });
        }
      }
    }
    // componenti del Compendio assenti dalla biblioteca
    const known = new Set(out.metamagia.map(o => tokenKey(o.name)));
    for (const p of ITEM_PRESETS) {
      for (const m of p.mods) {
        const k = tokenKey(m.name);
        if (!k || known.has(k)) continue;
        known.add(k);
        const target: ModKind = /\bSpell\b|Evocation/i.test(m.name) ? 'metamagia' : 'proprieta';
        out[target].push({ name: m.name, ref: null, adj: null, note: 'dal Compendio' });
      }
    }
    for (const k of ['metamagia', 'talento', 'abilita', 'proprieta'] as const) {
      out[k].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    }
    return out;
  });

  readonly modOptions = computed(() => {
    const q = this.modQ().trim().toLowerCase();
    return this.allOptions()[this.kind()].filter(o => !q || o.name.toLowerCase().includes(q)).slice(0, 400);
  });

  readonly result = computed(() => {
    const b = this.base();
    return calcItem({
      baseLevel: b?.level ?? 0,
      cl: this.cl(),
      price: this.price(),
      multiplier: this.multiplier(),
      mods: this.mods(),
      unit: this.unit(),
    });
  });

  readonly composites = COMPOSITE_ITEMS;
  readonly composite = signal<CompositeItem | null>(null);
  readonly partOn = signal<boolean[]>([]);

  readonly compositeSum = computed(() => {
    const c = this.composite();
    if (!c) return 0;
    const on = this.partOn();
    return c.parts.reduce((t, p, i) => t + (on[i] ? this.partValue(p) : 0), 0);
  });

  readonly compositeMatches = computed(() => {
    const c = this.composite();
    return !!c && Math.abs(this.compositeSum() - c.stated) < 0.5;
  });

  readonly matchesPreset = computed(() => {
    const p = this.presetTotal();
    return p !== null && Math.abs(this.result().total - p) < 0.5;
  });

  fmt(n: number | null): string {
    return n === null ? '' : Math.round(n).toLocaleString('it-IT');
  }

  kindLabel(k: ModKind): string {
    return KINDS.find(x => x.value === k)?.label ?? 'Manuale';
  }

  unitLabel(u: 'numen' | 'gp'): string {
    return u === 'gp' ? 'gp' : 'numen';
  }

  partValue(p: CompositePart): number {
    return p.kind === 'fixed' ? p.total : p.level * p.cl * p.price * p.mult;
  }

  pickComposite(index: string): void {
    const c = COMPOSITE_ITEMS[Number(index)] ?? null;
    this.composite.set(c);
    this.partOn.set(c ? c.parts.map(() => true) : []);
  }

  togglePart(i: number): void {
    this.partOn.update(list => list.map((v, j) => (j === i ? !v : v)));
  }

  pickBase(key: string): void {
    this.base.set(this.spells().find(s => s.key === key) ?? null);
  }

  setUnit(value: string): void {
    const u = value === 'gp' ? 'gp' : 'numen';
    this.unit.set(u);
    this.price.set(u === 'gp' ? 50 : 500);
  }

  loadPreset(index: string): void {
    const p: ItemPreset | undefined = ITEM_PRESETS[Number(index)];
    if (!p) return;
    const found = this.spells().find(s => s.name.toLowerCase() === p.base.name.toLowerCase());
    this.base.set(found ?? { key: p.base.name, name: p.base.name, level: p.base.level });
    this.mods.set(
      p.mods.map(m => ({
        kind: 'manuale' as const,
        name: m.name,
        adj: m.adj,
        on: !p.excluded.includes(m.name),
        source: 'biblioteca' as const,
      })),
    );
    this.unit.set(p.unit);
    this.cl.set(p.cl);
    this.price.set(p.price);
    this.multiplier.set(p.multiplier);
    this.presetTotal.set(p.total);
    this.presetUnit.set(p.unit);
    this.presetStock.set(p.stock);
  }

  addMod(index: string): void {
    const o = this.modOptions()[Number(index)];
    if (!o) return;
    this.mods.update(list => [
      ...list,
      {
        kind: this.kind(),
        name: o.name,
        adj: o.adj ?? 0,
        on: true,
        source: o.adj !== null ? 'biblioteca' : 'manuale',
      },
    ]);
  }

  addManual(): void {
    const name = this.manualName().trim() || 'Variazione manuale';
    this.mods.update(list => [...list, { kind: 'manuale', name, adj: this.manualAdj(), on: true, source: 'manuale' }]);
  }

  toggle(i: number): void {
    this.mods.update(list => list.map((m, j) => (j === i ? { ...m, on: !m.on } : m)));
  }

  setAdj(i: number, value: string): void {
    const adj = Number(value) || 0;
    this.mods.update(list => list.map((m, j) => (j === i ? { ...m, adj, source: 'manuale' } : m)));
  }

  remove(i: number): void {
    this.mods.update(list => list.filter((_, j) => j !== i));
  }
}
