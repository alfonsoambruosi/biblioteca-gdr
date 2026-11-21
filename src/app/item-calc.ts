/**
 * Calcolo del costo degli oggetti magici in numen.
 * Livello dell'oggetto = livello della spell base + variazioni (metamagia, talenti, abilità);
 * costo = livello × livello dell'incantatore × prezzo base × moltiplicatore.
 */

export type ModKind = 'metamagia' | 'talento' | 'abilita' | 'manuale';

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

export interface ItemInput {
  baseLevel: number;
  cl: number;
  price: number;
  multiplier: number;
  mods: Modifier[];
}

export interface ItemResult {
  level: number;
  total: number;
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
  const total = level * input.cl * input.price * input.multiplier;
  const parts = [`${input.baseLevel}`];
  for (const m of active) {
    parts.push(m.adj >= 0 ? `+ ${m.name} (+${m.adj})` : `- ${m.name} (${m.adj})`);
  }
  const formula =
    `${parts.join(' ')} = ${level}° livello × CL ${input.cl} × ${input.price}` +
    (input.multiplier !== 1 ? ` × ${input.multiplier}` : '') +
    ` = ${total.toLocaleString('it-IT')} numen`;
  return { level, total, formula };
}
