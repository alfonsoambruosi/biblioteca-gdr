/**
 * Riconoscimento dei nomi (feat, talenti, spell, voci) dentro i testi.
 * Confronta le parole intere: "Power Attack" trova "Power Attack" ma non "Power Attacks".
 * Ogni nome porta con sé il riferimento alla sezione da aprire al clic.
 * Prova prima la frase più lunga, così "Power Attack Plus" vince su "Power Attack".
 */

export interface TermTarget {
  docId: string;
  docName: string;
  anchor: string;
  heading: string;
  level: number;
}

export interface TermMap {
  map: Map<string, TermTarget>;
  maxWords: number;
  /** Lunghezza massima (in parole) dei termini che iniziano con ciascuna prima parola. */
  firstWordMax: Map<string, number>;
}

export interface TextPart {
  text: string;
  ref?: TermTarget;
}

/** Parole: lettere e cifre, anche unite da apostrofo o trattino. */
const TOKEN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const MAX_WORDS = 10;

/** Forma di confronto di un nome: minuscole e spazi singoli. */
export function termKey(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Costruisce la mappa nome → sezione. Vince il primo inserito per ogni nome. */
export function buildTermMap(entries: Array<[string, TermTarget]>): TermMap {
  const map = new Map<string, TermTarget>();
  const firstWordMax = new Map<string, number>();
  let maxWords = 1;
  for (const [name, ref] of entries) {
    const k = termKey(name);
    if (!k || map.has(k)) continue;
    const words = k.match(TOKEN);
    if (!words || !words.length) continue;
    const count = Math.min(words.length, MAX_WORDS);
    map.set(k, ref);
    if (count > maxWords) maxWords = count;
    const first = words[0];
    if (count > (firstWordMax.get(first) ?? 0)) firstWordMax.set(first, count);
  }
  return { map, maxWords, firstWordMax };
}

/** Divide il testo in parti normali e parti che corrispondono a un nome. */
export function splitTerms(text: string, terms: TermMap): TextPart[] {
  if (!terms.map.size) return [{ text }];
  const toks: { s: number; e: number; low: string }[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const s = m.index ?? 0;
    toks.push({ s, e: s + m[0].length, low: m[0].toLowerCase() });
  }
  const out: TextPart[] = [];
  let last = 0;
  let i = 0;
  while (i < toks.length) {
    const maxForFirst = terms.firstWordMax.get(toks[i].low);
    if (!maxForFirst) {
      i++;
      continue;
    }
    let len = 0;
    let ref: TermTarget | undefined;
    for (let k = Math.min(maxForFirst, toks.length - i); k >= 1; k--) {
      const key = k === 1 ? toks[i].low : termKey(text.slice(toks[i].s, toks[i + k - 1].e));
      const hit = terms.map.get(key);
      if (hit) {
        len = k;
        ref = hit;
        break;
      }
    }
    if (len && ref) {
      const s = toks[i].s;
      const e = toks[i + len - 1].e;
      if (s > last) out.push({ text: text.slice(last, s) });
      out.push({ text: text.slice(s, e), ref });
      last = e;
      i += len;
    } else {
      i++;
    }
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/**
 * Nomi con cui una voce può comparire nei testi:
 * - il titolo così com'è, senza etichette tra parentesi quadre e senza sigle della fonte
 *   (es. "Alertness [Skill]" → "Alertness", "Power Attack, Furious FocusAPG" → "Power Attack, Furious Focus");
 * - il titolo senza parentesi tonde (es. "Ability Focus (Spells)" → "Ability Focus");
 * - la prima parte prima della virgola (es. "Overrun, Improved" → "Overrun").
 * I nomi "pieni" hanno la precedenza su quelli derivati.
 */
export function namesOf(heading: string): { full: string[]; derived: string[] } {
  const clean = heading.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
  const base = clean.replace(/(?<=[a-z])[A-Z]{2,}[A-Z0-9,]*\s*$/, '').trim();
  const full = [heading.trim(), base];
  const noParen = base.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (noParen) full.push(noParen);
  const derived: string[] = [];
  const parts = base.split(',').map(x => x.trim());
  // "Grapple, Improved" si legge "Improved Grapple"
  if (parts.length === 2 && /^improved$/i.test(parts[1]) && parts[0]) full.push(`Improved ${parts[0]}`);
  const first = parts[0];
  if (first && first !== base) derived.push(first);
  return { full, derived };
}
