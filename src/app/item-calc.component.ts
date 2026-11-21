import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LibraryService } from './library.service';
import { LookupService } from './lookup.service';
import { TermTarget } from './term-links';
import { ModKind, Modifier, calcItem, levelAdjFromText } from './item-calc';
import { ITEM_PRESETS, ItemPreset } from './item-presets';

interface SpellOption {
  key: string;
  name: string;
  level: number;
}

interface EntryOption {
  name: string;
  ref: TermTarget;
  adj: number | null;
  note: string;
}

const KINDS: { value: ModKind; label: string }[] = [
  { value: 'metamagia', label: 'Metamagia' },
  { value: 'talento', label: 'Talento' },
  { value: 'abilita', label: 'Potenziamento abilità' },
];

const stripTag = (h: string) => h.replace(/\s*\[[^\]]*\]\s*$/, '').trim();

@Component({
  selector: 'app-item-calc',
  imports: [RouterLink],
  template: `
    <nav class="crumbs"><a routerLink="/">Home</a> <span>›</span> <span>Creazione oggetti magici</span></nav>
    <h1>Creazione oggetti magici</h1>
    <p class="muted">
      Parti da una spell base, aggiungi metamagie, talenti o potenziamenti di abilità e calcola il costo in numen.
      Ogni variazione si può includere o escludere, e il valore si può modificare.
    </p>

    <section class="calc-block">
      <h2>0. Oggetto del Compendio (facoltativo)</h2>
      <p class="muted small">Precarica spell base, variazioni, CL, prezzo e durata di un oggetto del compendio. Poi puoi modificare tutto.</p>
      <select class="picker" size="6" aria-label="Oggetto del compendio" (change)="loadPreset($any($event.target).value)">
        @for (p of presets; track $index) {
          <option [value]="$index">{{ p.name }}</option>
        }
      </select>
      @if (presetTotal() !== null) {
        <p class="muted small">Totale indicato nel Compendio: {{ presetTotal()!.toLocaleString('it-IT') }} numen</p>
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
        <label>Livello incantatore (CL)
          <input class="num" type="number" min="1" [value]="cl()" (input)="cl.set(+$any($event.target).value || 1)" />
        </label>
        <label>Prezzo base (numen)
          <input class="num" type="number" min="0" [value]="price()" (input)="price.set(+$any($event.target).value || 0)" />
        </label>
        <label>Moltiplicatore durata/uso (×)
          <input class="num" type="number" min="0" step="any" [value]="multiplier()"
            (input)="multiplier.set(+$any($event.target).value || 0)" />
        </label>
      </div>
      <p class="muted small">500 numen è il prezzo per uso attivato; cambialo se l'oggetto usa un'altra tariffa.</p>
    </section>

    <section class="calc-block result" aria-live="polite">
      <h2>Risultato</h2>
      @if (base()) {
        <p>Livello finale: <strong>{{ result().level }}</strong></p>
        <p class="formula">{{ result().formula }}</p>
        <p class="total">{{ totalText() }} numen</p>
      } @else {
        <p class="muted">Scegli una spell base per calcolare il costo.</p>
      }
    </section>
  `,
})
export class ItemCalcComponent {
  private library = inject(LibraryService);
  private lookup = inject(LookupService);

  readonly kinds = KINDS;
  readonly presets = ITEM_PRESETS;
  readonly presetTotal = signal<number | null>(null);

  readonly spellQ = signal('');
  readonly base = signal<SpellOption | null>(null);
  readonly kind = signal<ModKind>('metamagia');
  readonly modQ = signal('');
  readonly mods = signal<Modifier[]>([]);
  readonly manualName = signal('');
  readonly manualAdj = signal(1);
  readonly cl = signal(1);
  readonly price = signal(500);
  readonly multiplier = signal(1);

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

  /** Variazioni disponibili per il tipo scelto, dalla biblioteca. */
  private readonly allOptions = computed<Record<ModKind, EntryOption[]>>(() => {
    this.library.version();
    const out: Record<ModKind, EntryOption[]> = { metamagia: [], talento: [], abilita: [], manuale: [] };
    for (const m of this.library.allMetas()) {
      for (const s of m.sections) {
        if (s.level < 3 || !s.heading) continue;
        const ref: TermTarget = { docId: m.id, docName: m.name, anchor: s.id, heading: s.heading, level: s.level };
        const adj = levelAdjFromText(s.text);
        const note = adj !== null ? 'suggerito dal testo' : '';
        if (/Ch 8/i.test(m.name) && /\[Metamagic\]/i.test(s.heading)) {
          out.metamagia.push({ name: stripTag(s.heading), ref, adj, note });
        } else if (/Feat/i.test(m.name)) {
          out.talento.push({ name: stripTag(s.heading), ref, adj, note });
        } else if (/Skill/i.test(m.name)) {
          out.abilita.push({ name: stripTag(s.heading), ref, adj, note });
        }
      }
    }
    for (const k of ['metamagia', 'talento', 'abilita'] as const) {
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
    });
  });

  readonly totalText = computed(() => this.result().total.toLocaleString('it-IT'));

  kindLabel(k: ModKind): string {
    return KINDS.find(x => x.value === k)?.label ?? 'Manuale';
  }

  pickBase(key: string): void {
    this.base.set(this.spells().find(s => s.key === key) ?? null);
  }

  loadPreset(index: string): void {
    const p: ItemPreset | undefined = this.presets[Number(index)];
    if (!p) return;
    const found = this.spells().find(s => s.name.toLowerCase() === p.base.name.toLowerCase());
    this.base.set(found ?? { key: p.base.name, name: p.base.name, level: p.base.level });
    this.mods.set(
      p.mods.map(m => ({ kind: 'manuale' as const, name: m.name, adj: m.adj, on: !p.excluded.includes(m.name), source: 'biblioteca' as const })),
    );
    this.cl.set(p.cl);
    this.price.set(p.price);
    this.multiplier.set(p.multiplier);
    this.presetTotal.set(p.total);
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
