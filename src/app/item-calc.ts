/**
 * Calcolo del costo degli oggetti magici in numen.
 * Livello dell'oggetto = livello della spell base + variazioni (metamagia, talenti, abilità);
 * se il livello finale è 0 (trucchetto), nel calcolo del costo vale 0,5.
 * costo = livello effettivo × livello dell'incantatore × prezzo base × moltiplicatore.
 */

export type ModKind = 'metamagia' | 'talento' | 'abilita' | 'proprieta' | 'manuale';

export interface Modifier {
  kind: ModKind;
  name: string;
  /** variazione di livello (anche negativa) */
  adj: number;
  /** la variazione viene conteggiata nel totale */
  on: boolean;
  /** origine del valore: 'biblioteca' se letto dal testo, 'manuale' se inserito o modificato */
  source: 'biblioteca' | 'manuale';
}

/** Scorta privata (alchimia e veleni): 18 volte il prezzo in gp, in numen. */
export const STOCK_RATIO = 18;

export interface ItemInput {
  baseLevel: number;
  cl: number;
  price: number;
  multiplier: number;
  mods: Modifier[];
  /** 'numen' per oggetti magici, armi e munizioni; 'gp' per alchimia e veleni (gp per dose) */
  unit?: 'numen' | 'gp';
}

export interface ItemResult {
  level: number;
  /** livello effettivo usato nel calcolo (0,5 quando level === 0) */
  effectiveLevel: number;
  /** totale nell'unità del prezzo (numen, oppure gp per dose) */
  total: number;
  /** solo per unit 'gp': costo della scorta privata in numen */
  stockNumen: number | null;
  formula: string;
}

/** Legge la variazione di livello da un testo, es. "Metamagic Cost: +3 levels" → 3. */
export function levelAdjFromText(text: string): number | null {
  const m =
    /Metamagic Cost:\s*\+\s*(\d+)\s+levels?/i.exec(text) ?? /\+\s*(\d+)\s+levels?\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

export function calcItem(input: ItemInput): ItemResult {
  const active = input.mods.filter(m => m.on);
  const delta = active.reduce((t, m) => t + m.adj, 0);
  const level = Math.max(0, input.baseLevel + delta);
  // I trucchetti (livello finale 0) valgono 0,5 nel calcolo del costo
  const effectiveLevel = level === 0 ? 0.5 : level;
  const unit = input.unit ?? 'numen';
  const total = effectiveLevel * input.cl * input.price * input.multiplier;
  const parts = [`${input.baseLevel}`];
  for (const m of active) {
    parts.push(m.adj >= 0 ? `+ ${m.name} (+${m.adj})` : `- ${m.name} (${m.adj})`);
  }
  const levelText = level === 0 ? '0° livello (vale 0,5)' : `${level}° livello`;
  const head =
    `${parts.join(' ')} = ${levelText} × CL ${input.cl} × ${input.price}` +
    (input.multiplier !== 1 ? ` × ${input.multiplier}` : '');
  if (unit === 'gp') {
    const stock = total * STOCK_RATIO;
    return {
      level,
      effectiveLevel,
      total,
      stockNumen: stock,
      formula: `${head} = ${total.toLocaleString('it-IT')} gp a dose; scorta privata: ${stock.toLocaleString('it-IT')} numen (× ${STOCK_RATIO})`,
    };
  }
  return {
    level,
    effectiveLevel,
    total,
    stockNumen: null,
    formula: `${head} = ${total.toLocaleString('it-IT')} numen`,
  };
}
