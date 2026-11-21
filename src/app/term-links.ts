/**
 * Riconoscimento dei nomi (feat, talenti, spell, voci) dentro i testi.
 * Confronta le parole intere: "Power Attack" trova "Power Attack" ma non "Power Attacks".
 * Prova prima la frase più lunga, così "Power Attack Plus" vince su "Power Attack".
 */

export interface TermSet {
  names: Set<string>;
  maxWords: number;
}

export interface TextPart {
  text: string;
  term?: string;
}

/** Parole: lettere e cifre, anche unite da apostrofo o trattino. */
const TOKEN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const MAX_WORDS = 10;

/** Forma di confronto di un nome: minuscole e spazi singoli. */
export function termKey(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildTermSet(names: Iterable<string>): TermSet {
  const set = new Set<string>();
  let maxWords = 1;
  for (const n of names) {
    const k = termKey(n);
    if (!k) continue;
    set.add(k);
    const words = (k.match(TOKEN) ?? []).length;
    if (words > maxWords) maxWords = words;
  }
  return { names: set, maxWords: Math.min(maxWords, MAX_WORDS) };
}

/** Divide il testo in parti normali e parti che corrispondono a un nome. */
export function splitTerms(text: string, set: TermSet): TextPart[] {
  if (!set.names.size) return [{ text }];
  const toks: { s: number; e: number }[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const s = m.index ?? 0;
    toks.push({ s, e: s + m[0].length });
  }
  const out: TextPart[] = [];
  let last = 0;
  let i = 0;
  while (i < toks.length) {
    let len = 0;
    for (let k = Math.min(set.maxWords, toks.length - i); k >= 1; k--) {
      const phrase = text.slice(toks[i].s, toks[i + k - 1].e);
      if (set.names.has(termKey(phrase))) {
        len = k;
        break;
      }
    }
    if (len) {
      const s = toks[i].s;
      const e = toks[i + len - 1].e;
      if (s > last) out.push({ text: text.slice(last, s) });
      out.push({ text: text.slice(s, e), term: text.slice(s, e) });
      last = e;
      i += len;
    } else {
      i++;
    }
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
