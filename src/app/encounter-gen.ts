import { BestiaryEntry, formatCr } from './bestiary-index';

export type EncounterStyle = 'random' | 'solo' | 'group' | 'horde' | 'boss-minions';

export interface DifficultyOption {
  id: string;
  label: string;
  offset: number;
}

export const DIFFICULTIES: DifficultyOption[] = [
  { id: 'baby', label: "I'm just a baby boy (liv. −1)", offset: -1 },
  { id: 'itytd', label: "I'm Too Young to Die (liv. +0)", offset: 0 },
  { id: 'hntr', label: 'Hey, Not Too Rough (liv. +1)', offset: 1 },
  { id: 'hmp', label: 'Hurt Me Plenty (liv. +2)', offset: 2 },
  { id: 'uv', label: 'Ultra-Violence (liv. +3)', offset: 3 },
  { id: 'nm', label: 'Nightmare! (liv. +4)', offset: 4 },
  { id: 'dmd', label: 'Dante Must Die (liv. +5)', offset: 5 },
];

export const ENCOUNTER_STYLES: { value: EncounterStyle; label: string }[] = [
  { value: 'random', label: 'Casuale (qualsiasi)' },
  { value: 'solo', label: 'Mostro singolo (Boss)' },
  { value: 'group', label: 'Piccolo gruppo (2–4)' },
  { value: 'boss-minions', label: 'Boss + gregari' },
  { value: 'horde', label: 'Orda / Sciame (4–8)' },
];

export interface EncounterSlot {
  entry: BestiaryEntry;
  cr: number;
  crLabel: string;
  xpEach: number;
  count: number;
}

export interface GeneratedEncounter {
  slots: EncounterSlot[];
  styleUsed: Exclude<EncounterStyle, 'random'>;
  budgetXp: number;
  totalXp: number;
}

const XP_TABLE: [number, number][] = [
  [0.125, 50],
  [0.167, 65],
  [0.25, 100],
  [0.333, 135],
  [0.5, 200],
  [1, 400],
  [2, 600],
  [3, 800],
  [4, 1200],
  [5, 1600],
  [6, 2400],
  [7, 3200],
  [8, 4800],
  [9, 6400],
  [10, 9600],
  [11, 12800],
  [12, 19200],
  [13, 25600],
  [14, 38400],
  [15, 51200],
  [16, 76800],
  [17, 102400],
  [18, 153600],
  [19, 204800],
  [20, 307200],
];

/** XP standard Pathfinder 1e / D&D 3.5 per un dato CR. */
export function xpForCr(cr: number): number {
  if (cr <= 0.125) return 50;
  if (cr > 20) {
    const steps = Math.round(cr) - 20;
    const base = steps % 2 === 0 ? 307200 : 409600;
    return base * Math.pow(2, Math.floor(steps / 2));
  }
  let best = XP_TABLE[0];
  let bestDiff = Math.abs(cr - best[0]);
  for (const pair of XP_TABLE) {
    const d = Math.abs(cr - pair[0]);
    if (d < bestDiff) {
      best = pair;
      bestDiff = d;
    }
  }
  return best[1];
}

/** Stima il CR complessivo corrispondente a un totale XP. */
export function estimateCrFromXp(xp: number): string {
  if (xp <= 0) return '—';
  let bestCr = 0.125;
  let bestDist = Infinity;
  for (let cr = 0.125; cr <= 30; cr = cr < 1 ? (cr < 0.25 ? 0.25 : cr < 0.5 ? 0.5 : 1) : cr + 1) {
    const dist = Math.abs(Math.log(xp / xpForCr(cr)));
    if (dist < bestDist) {
      bestDist = dist;
      bestCr = cr;
    }
  }
  return formatCr(bestCr);
}

/** Budget XP per un gruppo di `players` personaggi di livello `level` e difficoltà `offset`. */
export function encounterBudgetXp(players: number, level: number, diffOffset: number): number {
  const p = Math.max(1, Math.min(12, Math.round(players)));
  const lv = Math.max(1, Math.min(20, Math.round(level)));
  const targetCr = lv + diffOffset <= 0 ? 0.5 : lv + diffOffset;
  return Math.max(50, Math.round((xpForCr(targetCr) * p) / 4));
}

interface Candidate {
  entry: BestiaryEntry;
  cr: number;
  xp: number;
}

function buildCandidates(entries: BestiaryEntry[]): Candidate[] {
  const out: Candidate[] = [];
  for (const entry of entries) {
    for (const cr of entry.crs) {
      out.push({ entry, cr, xp: xpForCr(cr) });
    }
  }
  return out;
}

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function makeSlot(c: Candidate, count: number): EncounterSlot {
  return {
    entry: c.entry,
    cr: c.cr,
    crLabel: `CR ${formatCr(c.cr)}`,
    xpEach: c.xp,
    count,
  };
}

function trySolo(cands: Candidate[], budget: number): EncounterSlot[] | null {
  const near = cands.filter(c => c.xp >= budget * 0.65 && c.xp <= budget * 1.35);
  const pool = near.length ? near : cands.filter(c => c.xp >= budget * 0.45 && c.xp <= budget * 1.6);
  const chosen = pickRandom(pool);
  return chosen ? [makeSlot(chosen, 1)] : null;
}

function tryGroup(cands: Candidate[], budget: number): EncounterSlot[] | null {
  const mixed = Math.random() < 0.45;
  if (mixed) {
    const firstPool = cands.filter(c => c.xp >= budget * 0.25 && c.xp <= budget * 0.65);
    const first = pickRandom(firstPool);
    if (first) {
      const rem = budget - first.xp;
      const secondPool = cands.filter(
        c => c.entry.docId !== first.entry.docId && c.xp >= rem * 0.25 && c.xp <= rem * 1.25
      );
      const second = pickRandom(secondPool);
      if (second) {
        const cnt2 = Math.max(1, Math.min(3, Math.round(rem / second.xp)));
        return [makeSlot(first, 1), makeSlot(second, cnt2)];
      }
    }
  }
  const counts = [2, 3, 4].sort(() => Math.random() - 0.5);
  for (const count of counts) {
    const target = budget / count;
    const pool = cands.filter(c => c.xp >= target * 0.65 && c.xp <= target * 1.35);
    const chosen = pickRandom(pool);
    if (chosen) return [makeSlot(chosen, count)];
  }
  return null;
}

function tryHorde(cands: Candidate[], budget: number): EncounterSlot[] | null {
  const counts = [4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
  for (const count of counts) {
    const target = budget / count;
    const pool = cands.filter(c => c.xp >= target * 0.6 && c.xp <= target * 1.35);
    const chosen = pickRandom(pool);
    if (chosen) return [makeSlot(chosen, count)];
  }
  return null;
}

function tryBossMinions(cands: Candidate[], budget: number): EncounterSlot[] | null {
  const bossPool = cands.filter(c => c.xp >= budget * 0.45 && c.xp <= budget * 0.78);
  const boss = pickRandom(bossPool);
  if (!boss) return null;
  const rem = budget - boss.xp;
  const minionCounts = [2, 3, 4, 5].sort(() => Math.random() - 0.5);
  for (const count of minionCounts) {
    const target = rem / count;
    const mPool = cands.filter(
      c => c.entry.docId !== boss.entry.docId && c.xp < boss.xp && c.xp >= target * 0.55 && c.xp <= target * 1.4
    );
    const minion = pickRandom(mPool);
    if (minion) return [makeSlot(boss, 1), makeSlot(minion, count)];
  }
  return null;
}

export function generateEncounter(
  entries: BestiaryEntry[],
  players: number,
  level: number,
  diffOffset: number,
  style: EncounterStyle
): GeneratedEncounter | null {
  const cands = buildCandidates(entries);
  if (!cands.length) return null;
  const budgetXp = encounterBudgetXp(players, level, diffOffset);

  const runners: Record<Exclude<EncounterStyle, 'random'>, () => EncounterSlot[] | null> = {
    solo: () => trySolo(cands, budgetXp),
    group: () => tryGroup(cands, budgetXp),
    'boss-minions': () => tryBossMinions(cands, budgetXp),
    horde: () => tryHorde(cands, budgetXp),
  };

  const order: Exclude<EncounterStyle, 'random'>[] =
    style === 'random'
      ? (['solo', 'group', 'boss-minions', 'horde'] as const).slice().sort(() => Math.random() - 0.5)
      : [style, ...(['group', 'solo', 'boss-minions', 'horde'] as const).filter(s => s !== style)];

  for (const s of order) {
    const slots = runners[s]();
    if (slots && slots.length) {
      const totalXp = slots.reduce((sum, x) => sum + x.xpEach * x.count, 0);
      return { slots, styleUsed: s, budgetXp, totalXp };
    }
  }

  // Fallback: scegli la creatura più vicina al budget (o un multiplo)
  const sorted = [...cands].sort((a, b) => Math.abs(a.xp - budgetXp) - Math.abs(b.xp - budgetXp));
  const best = pickRandom(sorted.slice(0, Math.min(5, sorted.length)));
  if (!best) return null;
  const count = best.xp < budgetXp * 0.6 ? Math.max(1, Math.min(8, Math.round(budgetXp / best.xp))) : 1;
  const slot = makeSlot(best, count);
  return { slots: [slot], styleUsed: count === 1 ? 'solo' : 'group', budgetXp, totalXp: slot.xpEach * slot.count };
}

/** Sostituisce una singola creatura dell'incontro con un'altra alternativa di CR simile dal pool filtrato. */
export function rerollSlot(
  entries: BestiaryEntry[],
  current: EncounterSlot,
  excludeDocIds: Set<string>
): EncounterSlot | null {
  const cands = buildCandidates(entries).filter(c => !excludeDocIds.has(c.entry.docId));
  if (!cands.length) return null;
  const sameCr = cands.filter(c => Math.abs(c.cr - current.cr) < 0.01);
  const nearCr = sameCr.length
    ? sameCr
    : cands.filter(c => c.xp >= current.xpEach * 0.65 && c.xp <= current.xpEach * 1.45);
  const chosen = pickRandom(nearCr.length ? nearCr : cands);
  return chosen ? makeSlot(chosen, current.count) : null;
}
