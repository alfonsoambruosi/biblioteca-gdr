import { DocMeta, TreeNode } from './models';

export interface BestiaryEntry {
  docId: string;
  name: string;
  letter: string;
  category: string;
  subcategory: string;
  crs: number[];
  crMin: number | null;
  crMax: number | null;
  crLabel: string;
  sizes: string[];
  envs: string[];
  searchBlob: string;
}

export const BESTIARY_SIZES = [
  'Fine',
  'Diminutive',
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
  'Gargantuan',
  'Colossal',
] as const;

export interface EnvGroup {
  key: string;
  label: string;
  re: RegExp;
}

export const BESTIARY_ENV_GROUPS: EnvGroup[] = [
  { key: 'Underground', label: 'Sotterraneo / Caverne', re: /\b(?:underground|cave|cavern|dungeon|darkland|subterranean)/i },
  { key: 'Forest', label: 'Foreste / Giungle', re: /\b(?:forest|jungle|wood|rainforest)/i },
  { key: 'Aquatic', label: 'Acquatico / Oceani', re: /\b(?:aquatic|water|ocean|sea|river|lake|coast|shore)/i },
  { key: 'Mountains', label: 'Montagne / Colline', re: /\b(?:mountain|hill|peak|cliff|crag)/i },
  { key: 'Plains', label: 'Pianure', re: /\b(?:plain|grassland|savanna|prairie|steppe)/i },
  { key: 'Swamp', label: 'Paludi / Acquitrini', re: /\b(?:swamp|marsh|bog|mire|fen|wetland)/i },
  { key: 'Desert', label: 'Deserti', re: /\b(?:desert|badland|dune)/i },
  { key: 'Cold', label: 'Freddo / Artico', re: /\b(?:cold|arctic|glacier|tundra|snow|ice)/i },
  { key: 'Urban', label: 'Urbano / Rovine', re: /\b(?:urban|city|cities|ruin|town|settlement)/i },
  {
    key: 'Planes',
    label: 'Piani / Abisso / Inferno',
    re: /\b(?:plane|abyss|hell|ethereal|astral|shadow|limbo|elysium|heaven|nirvana|abaddon|maelstrom|elemental|extraplanar)/i,
  },
  { key: 'Any', label: 'Qualsiasi (Any)', re: /\bany\b/i },
];

export const CR_OPTIONS: { value: number; label: string }[] = [
  { value: 0.125, label: '1/8' },
  { value: 0.167, label: '1/6' },
  { value: 0.25, label: '1/4' },
  { value: 0.333, label: '1/3' },
  { value: 0.5, label: '½' },
  ...Array.from({ length: 25 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  { value: 30, label: '30+' },
];

const CR_RE = /\bCR\s*(\d+(?:\/\d+)?|[½¼⅓⅛])\b/gi;
const ENV_RE = /\bEnvironment\s*:?\s*([^\n.;]{2,80})/gi;
const SIZE_RE =
  /\b(Fine|Diminutive|Tiny|Small|Medium|Large|Huge|Gargantuan|Colossal)\s+(?:Aberration|Animal|Construct|Dragon|Fey|Giant|Humanoid|Magical Beast|Monstrous Humanoid|Ooze|Outsider|Plant|Undead|Vermin)\b/gi;

export function parseCrValue(raw: string): number | null {
  const s = raw.trim();
  if (s === '½' || s === '1/2') return 0.5;
  if (s === '⅓' || s === '1/3') return 0.333;
  if (s === '¼' || s === '1/4') return 0.25;
  if (s === '⅛' || s === '1/8') return 0.125;
  if (s === '1/6') return 0.167;
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 40 ? n : null;
}

export function formatCr(n: number): string {
  if (Math.abs(n - 0.5) < 0.01) return '½';
  if (Math.abs(n - 0.333) < 0.01) return '⅓';
  if (Math.abs(n - 0.25) < 0.01) return '¼';
  if (Math.abs(n - 0.167) < 0.01) return '1/6';
  if (Math.abs(n - 0.125) < 0.01) return '⅛';
  return String(Math.round(n));
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function extractBestiaryEntry(meta: DocMeta, pathNodes: TreeNode[]): BestiaryEntry {
  // Trova la posizione della cartella Bestiary nel percorso
  const bIdx = pathNodes.findIndex(n => /bestiar|bestiary/i.test(n.name));
  const after = bIdx >= 0 ? pathNodes.slice(bIdx + 1, -1) : [];
  const category = after[0]?.name ?? 'Introduzione e template';
  const subcategory = after.slice(1).map(n => n.name).join(' › ');

  const crSet = new Set<number>();
  const sizeSet = new Set<string>();
  const envSet = new Set<string>();
  const headings: string[] = [];

  for (const s of meta.sections) {
    if (s.heading) headings.push(s.heading);
    const chunk = s.heading + '\n' + s.text;

    CR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CR_RE.exec(chunk)) !== null) {
      const val = parseCrValue(m[1]);
      if (val !== null) crSet.add(val);
    }

    SIZE_RE.lastIndex = 0;
    while ((m = SIZE_RE.exec(chunk)) !== null) {
      sizeSet.add(titleCase(m[1]));
    }

    ENV_RE.lastIndex = 0;
    while ((m = ENV_RE.exec(chunk)) !== null) {
      const envLine = m[1];
      for (const g of BESTIARY_ENV_GROUPS) {
        if (g.re.test(envLine)) envSet.add(g.key);
      }
    }
  }

  const crs = Array.from(crSet).sort((a, b) => a - b);
  const crMin = crs.length ? crs[0] : null;
  const crMax = crs.length ? crs[crs.length - 1] : null;
  const crLabel =
    crMin === null
      ? ''
      : crMin === crMax
        ? `CR ${formatCr(crMin)}`
        : `CR ${formatCr(crMin)}–${formatCr(crMax!)}`;

  const firstChar = meta.name.trim().charAt(0).toUpperCase();
  const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
  const sizes = BESTIARY_SIZES.filter(sz => sizeSet.has(sz));
  const envs = BESTIARY_ENV_GROUPS.map(g => g.key).filter(k => envSet.has(k));

  return {
    docId: meta.id,
    name: meta.name,
    letter,
    category,
    subcategory,
    crs,
    crMin,
    crMax,
    crLabel,
    sizes,
    envs,
    searchBlob: `${meta.name} ${category} ${subcategory} ${headings.join(' ')}`.toLowerCase(),
  };
}
