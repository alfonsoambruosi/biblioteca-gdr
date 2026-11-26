import { Section } from './models';

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Componenti di una formula di spell, es.:
 *   "Jet of flame (0 level) + Reach Spell (close to medium; +1 level) + ..."
 * name = "Reach Spell", note = "close to medium; +1 level"
 */
const COMPONENT_RE =
  /([A-Z][\p{L}’'\- ]*?)\s*\(([^()]*?\blevels?\b[^()]*)\)/gu;

/**
 * Livello di una spell "base" (seme), da 0 a 9, senza segno: "(0 level)", "(to Abyss; 6th level)".
 * I componenti di metamagia hanno invece un segno: "(+1 level)", "(-2 levels)".
 */
const BASE_LEVEL_RE = /(?:^|[;(]\s*)([0-9])(?:st|nd|rd|th)?\s+levels?\s*$/;

export function baseLevel(note: string): number | null {
  const m = BASE_LEVEL_RE.exec(note.trim());
  return m ? Number(m[1]) : null;
}

export function isFormula(text: string): boolean {
  const n = Array.from(text.matchAll(COMPONENT_RE)).length;
  if (n >= 2 && text.includes('+')) return true;
  return n >= 1 && text.includes('=') && /\blevels?\b/.test(text);
}

/** Un componente della formula: `base` è il livello 0-9 se è una spell, altrimenti null (metamagia). */
export interface FormulaTerm {
  name: string;
  base: number | null;
}

/**
 * Riscrive il paragrafo di una formula rendendo cliccabile ogni componente.
 * Il TESTO resta identico carattere per carattere: vengono solo aggiunti degli <span>.
 */
export function buildFormulaHtml(text: string): { html: string; terms: FormulaTerm[] } {
  const terms: FormulaTerm[] = [];
  let out = '';
  let last = 0;
  for (const m of text.matchAll(COMPONENT_RE)) {
    const full = m[0];
    const rawName = m[1];
    const start = m.index ?? 0;
    // il nome vero è la parte dopo eventuali segni iniziali (+, =, :, ecc.)
    const lead = rawName.match(/^[+=,.\s]+/)?.[0] ?? '';
    const name = rawName.slice(lead.length).replace(/\s+$/, '');
    const trailing = rawName.slice(lead.length + name.length);
    // le metamagie finiscono per "Spell": anche con un refuso nel segno non sono spell base
    const base = /\bSpell$/.test(name) ? null : baseLevel(m[2]);
    out += esc(text.slice(last, start)) + esc(lead);
    out +=
      `<span role="button" tabindex="0" class="seed${base !== null ? ' base' : ''}" ` +
      `data-term="${esc(name)}"${base !== null ? ` data-base="${base}"` : ''}>${esc(name)}</span>`;
    out += esc(trailing) + esc(full.slice(rawName.length));
    terms.push({ name, base });
    last = start + full.length;
  }
  out += esc(text.slice(last));
  // nome della spell prima dei due punti in grassetto
  out = out.replace(/^([^:<]{2,70}):/, '<strong class="spell-name">$1</strong>:');
  return { html: out, terms };
}

/** Aumenta quando cambia il modo di leggere i documenti: le copie in cache vengono rifatte. */
export const PARSER_VERSION = 2;

export interface ParseResult {
  html: string;
  sections: Section[];
}

/** Prende l'HTML grezzo di mammoth e lo arricchisce (ancore, sezioni, formule). */
export function enrichHtml(rawHtml: string, docName: string, prefix = 's'): ParseResult {
  const dom = new DOMParser().parseFromString(`<body>${rawHtml}</body>`, 'text/html');
  const body = dom.body;

  // 1) Voci di spell: un paragrafo breve seguito da "School ..." diventa un titolo (h5)
  const kids0 = Array.from(body.children) as HTMLElement[];
  for (let i = 0; i < kids0.length - 1; i++) {
    const el = kids0[i];
    const nx = kids0[i + 1];
    const t = (el.textContent ?? '').trim();
    if (
      el.tagName === 'P' &&
      t.length > 0 &&
      t.length < 90 &&
      /^School\s/.test((nx.textContent ?? '').trim())
    ) {
      const h = dom.createElement('h5');
      h.className = 'spell-entry';
      h.innerHTML = el.innerHTML;
      el.replaceWith(h);
    }
  }

  // 2) Tabelle in un contenitore scorrevole (utile su smartphone) e immagini lazy
  body.querySelectorAll(':scope > table').forEach(tb => {
    const w = dom.createElement('div');
    w.className = 'tbl';
    tb.replaceWith(w);
    w.appendChild(tb);
  });
  body.querySelectorAll('img').forEach(img => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });

  // 3) Formule delle spell (paragrafi e voci di elenco)
  body.querySelectorAll('p, li').forEach(el => {
    const text = el.textContent ?? '';
    if (text.length > 4000 || !isFormula(text)) return;
    const { html, terms } = buildFormulaHtml(text);
    el.innerHTML = html;
    el.classList.add('formula');
    if (!el.closest('table')) {
      const btn = dom.createElement('button');
      btn.type = 'button';
      btn.className = 'expand-formula';
      // spell base (livello 0-9): "*livello*nome", per esempio "*0*Jet of flame"
      btn.setAttribute('data-terms', terms.map(t => (t.base !== null ? `*${t.base}*` : '') + t.name).join('|'));
      btn.textContent = 'Mostra la descrizione di ogni componente';
      const box = dom.createElement('div');
      box.className = 'formula-detail';
      box.hidden = true;
      el.after(btn, box);
    }
  });

  // 4) Sezioni, id dei titoli e testo per la ricerca
  const sections: Section[] = [];
  let n = 0;
  let cur: { s: Section; buf: string[] } = {
    s: { id: `${prefix}-0`, heading: docName, level: 1, text: '' },
    buf: [],
  };
  const flush = () => {
    cur.s.text = cur.buf.join('\n').trim();
    if (cur.s.text || cur.s.id !== `${prefix}-0`) sections.push(cur.s);
  };
  let lines = 0;
  for (const el of Array.from(body.children) as HTMLElement[]) {
    if (el.classList.contains('formula-detail') || el.classList.contains('expand-formula')) continue;
    // ogni voce "Nome: formula = livello; effetto" è un risultato di ricerca a sé (es. Fireball)
    const spell = el.tagName === 'P' ? el.querySelector(':scope > strong.spell-name') : null;
    if (spell) {
      const id = `${prefix}-f${++lines}`;
      el.id = id;
      sections.push({ id, heading: (spell.textContent ?? '').trim(), level: 6, text: (el.textContent ?? '').trim() });
      continue;
    }
    const m = /^H([1-6])$/.exec(el.tagName);
    if (m) {
      flush();
      n++;
      const id = `${prefix}-${n}`;
      el.id = id;
      const heading = (el.textContent ?? '').trim();
      cur = { s: { id, heading, level: +m[1], text: '' }, buf: [] };
    } else {
      cur.buf.push(blockText(el));
    }
  }
  flush();
  return { html: body.innerHTML, sections };
}

function blockText(el: HTMLElement): string {
  if (el.querySelector('table')) {
    return Array.from(el.querySelectorAll('tr'))
      .map(tr => Array.from(tr.children).map(c => (c.textContent ?? '').trim()).join(' | '))
      .join('\n');
  }
  return (el.textContent ?? '').trim();
}

/** Estrae da un Document già parsato il blocco che inizia con l'elemento `anchor`. */
export function sliceSectionFromDoc(dom: Document, anchor: string): string {
  const start = dom.getElementById(anchor);
  if (!start) return '';
  const level = +(/^H([1-6])$/.exec(start.tagName)?.[1] ?? 0);
  const wrap = dom.createElement('div');
  wrap.appendChild(start.cloneNode(true));
  // una voce-formula è un solo paragrafo; un titolo arriva fino al titolo successivo
  let el = level ? (start.nextElementSibling as HTMLElement | null) : null;
  while (el) {
    const m = /^H([1-6])$/.exec(el.tagName);
    if (m && +m[1] <= level) break;
    wrap.appendChild(el.cloneNode(true));
    el = el.nextElementSibling as HTMLElement | null;
  }
  wrap.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  wrap.querySelectorAll('.expand-formula, .formula-detail').forEach(e => e.remove());
  return wrap.innerHTML;
}

/** Estrae da un documento il blocco che inizia con l'elemento `anchor`. */
export function sliceSection(html: string, anchor: string): string {
  const dom = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return sliceSectionFromDoc(dom, anchor);
}

/** Normalizza il titolo di una voce per il confronto (rimuove [tag], codici fonte, ecc.). */
export function normTerm(s: string): string {
  return s
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(?<=[a-z])[A-Z]{2,}[A-Z0-9,]*\s*$/, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenKey(s: string): string {
  return normTerm(s)
    .replace(/[,.:;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}
