import { DocMeta, Section, TreeNode } from './models';

export interface BestiaryEntry {
  /** Identificatore univoco della creatura (`${docId}#${anchor}`). */
  id: string;
  docId: string;
  docName: string;
  anchor: string;
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

/**
 * CR della riga di intestazione dello stat-block (a fine riga, es. "GoblinPB\tCr 1/3", "Forestkith GoblinMM3\tCr ½").
 * Ignora riferimenti inline tra parentesi o nel testo delle abilità (es. "mark of the wild (CR ½)", "if CR 15+").
 */
const CR_EOL_RE = /(?:^|\s)CR\s*(\d+(?:\/\d+)?|[½¼⅓⅛])\s*$/gim;
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

function cleanCreatureName(heading: string, docName: string, level: number): string {
  const raw = heading
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/(?<=[a-z])[A-Z]{2,}[A-Z0-9,]*\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return docName;
  // Per il titolo principale del documento, preferisce il nome del file se differisce solo per maiuscole (es. "OTYUGH" -> "Otyugh")
  if (level === 1 && raw.toLowerCase() === docName.toLowerCase()) return docName;
  if (raw === raw.toUpperCase() && raw.length > 3) {
    return raw.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase());
  }
  return raw;
}

function extractCrs(text: string): number[] {
  const set = new Set<number>();
  CR_EOL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CR_EOL_RE.exec(text)) !== null) {
    const val = parseCrValue(m[1]);
    if (val !== null) set.add(val);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function extractSizes(text: string): string[] {
  const set = new Set<string>();
  SIZE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SIZE_RE.exec(text)) !== null) {
    set.add(titleCase(m[1]));
  }
  return BESTIARY_SIZES.filter(sz => set.has(sz));
}

function extractEnvs(text: string): string[] {
  const set = new Set<string>();
  ENV_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENV_RE.exec(text)) !== null) {
    const line = m[1];
    for (const g of BESTIARY_ENV_GROUPS) {
      if (g.re.test(line)) set.add(g.key);
    }
  }
  return BESTIARY_ENV_GROUPS.map(g => g.key).filter(k => set.has(k));
}

function buildEntry(
  meta: DocMeta,
  category: string,
  subcategory: string,
  anchor: string,
  name: string,
  crs: number[],
  sizes: string[],
  envs: string[],
  extraSearch = ''
): BestiaryEntry {
  const crMin = crs.length ? crs[0] : null;
  const crMax = crs.length ? crs[crs.length - 1] : null;
  const crLabel =
    crMin === null
      ? ''
      : crMin === crMax
        ? `CR ${formatCr(crMin)}`
        : `CR ${formatCr(crMin)}–${formatCr(crMax!)}`;
  const firstChar = name.trim().charAt(0).toUpperCase();
  const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

  return {
    id: `${meta.id}#${anchor}`,
    docId: meta.id,
    docName: meta.name,
    anchor,
    name,
    letter,
    category,
    subcategory,
    crs,
    crMin,
    crMax,
    crLabel,
    sizes,
    envs,
    searchBlob: `${name} ${meta.name} ${category} ${subcategory} ${extraSearch}`.toLowerCase(),
  };
}

/**
 * Estrae tutte le singole creature (sezioni h1/h2 con stat-block `CR ...` a fine riga)
 * da un documento del Bestiario. Se un documento contiene più varianti (es. Goblin con
 * Coal Goblin, Hobgoblin, Belsamaug, ecc.), restituisce una voce per ciascuna creatura
 * con link diretto all'ancora `#s-N`.
 */
export function extractBestiaryEntries(meta: DocMeta, pathNodes: TreeNode[]): BestiaryEntry[] {
  const bIdx = pathNodes.findIndex(n => /bestiar|bestiary/i.test(n.name));
  const after = bIdx >= 0 ? pathNodes.slice(bIdx + 1, -1) : [];
  const category = after[0]?.name ?? 'Introduzione e template';
  const subcategory = after.slice(1).map(n => n.name).join(' › ');

  // Raccoglie per ogni sezione L1/L2 il testo proprio + eventuali sotto-sezioni L3..L6 che la seguono
  const groups: { sec: Section; body: string }[] = [];
  for (const s of meta.sections) {
    const chunk = s.heading + '\n' + s.text;
    if (s.level <= 2) {
      groups.push({ sec: s, body: chunk });
    } else if (groups.length) {
      groups[groups.length - 1].body += '\n' + chunk;
    }
  }

  // Fallback di documento per ambiente/taglia se una variante L2 eredita dall'introduzione L1
  const docText = groups.map(g => g.body).join('\n');
  const docEnvs = extractEnvs(docText);
  const docSizes = extractSizes(docText);

  const out: BestiaryEntry[] = [];
  for (const { sec, body } of groups) {
    const crs = extractCrs(body);
    if (!crs.length) continue;
    const name = cleanCreatureName(sec.heading, meta.name, sec.level);
    const sizes = extractSizes(body);
    const envs = extractEnvs(body);
    out.push(
      buildEntry(
        meta,
        category,
        subcategory,
        sec.id,
        name,
        crs,
        sizes.length ? sizes : docSizes,
        envs.length ? envs : docEnvs
      )
    );
  }

  if (out.length) return out;

  // Documenti introduttivi / template / regole generali senza stat-block CR a fine riga
  const firstAnchor = meta.sections[0]?.id ?? '';
  return [
    buildEntry(
      meta,
      category,
      subcategory,
      firstAnchor,
      meta.name,
      [],
      docSizes,
      docEnvs,
      meta.sections.map(s => s.heading).join(' ')
    ),
  ];
}
