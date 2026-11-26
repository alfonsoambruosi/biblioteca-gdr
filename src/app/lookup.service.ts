import { Injectable, inject } from '@angular/core';
import { LibraryService } from './library.service';
import { esc, normTerm, sliceSectionFromDoc, tokenKey } from './doc-parser';
import { environment } from '../environments/environment';
import { CUSTOM_DOC_ID, CUSTOM_DOC_NAME, CUSTOM_ENTRIES, customEntryHtml } from './custom-entries';
import { TreeNode } from './models';

const DOM_CACHE_MAX = 6;

export interface EntryRef {
  docId: string;
  docName: string;
  anchor: string;
  heading: string;
  /** 1-5 = voce vera, 6 = riga "Nome: formula" */
  level: number;
}

/** Una spell in un elenco: porta direttamente alla sua voce. */
export interface SpellRef {
  name: string;
  docName: string;
  /** Voce nel Drive: se manca, c'è `url` (ricerca online). */
  docId?: string;
  anchor?: string;
  url?: string;
}

export function isDocNode(n: TreeNode): boolean {
  return n.kind === 'docx' || n.kind === 'gdoc' || n.kind === 'text';
}

@Injectable({ providedIn: 'root' })
export class LookupService {
  private library = inject(LibraryService);

  private entryIndexCache: {
    v: number;
    byNorm: Map<string, EntryRef[]>;
    byToken: Map<string, EntryRef[]>;
  } | null = null;
  private spellBookCache: { v: number; book: Map<string, Map<number, SpellRef[]>> } | null = null;
  private domCache = new Map<string, { stamp: string; doc: Document }>();
  private domInflight = new Map<string, Promise<Document>>();

  /** Numero di documenti leggibili contenuti in un nodo (ricorsivo). */
  countFiles(n: TreeNode): number {
    if (n.kind !== 'folder') return isDocNode(n) ? 1 : 0;
    return (n.children ?? []).reduce((a, c) => a + this.countFiles(c), 0);
  }

  /** Indice O(1) delle sezioni per titolo normalizzato e per tokenKey, ricostruito solo quando cambia l'indice. */
  private entryIndex() {
    const v = this.library.version();
    if (this.entryIndexCache && this.entryIndexCache.v === v) return this.entryIndexCache;
    const byNorm = new Map<string, EntryRef[]>();
    const byToken = new Map<string, EntryRef[]>();
    const push = (map: Map<string, EntryRef[]>, key: string, ref: EntryRef) => {
      if (!key) return;
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(ref);
    };
    for (const m of this.library.allMetas()) {
      for (const s of m.sections) {
        if (!s.heading) continue;
        const ref: EntryRef = { docId: m.id, docName: m.name, anchor: s.id, heading: s.heading, level: s.level };
        push(byNorm, normTerm(s.heading), ref);
        push(byToken, tokenKey(s.heading), ref);
      }
    }
    for (const e of CUSTOM_ENTRIES) {
      const ref: EntryRef = {
        docId: CUSTOM_DOC_ID,
        docName: CUSTOM_DOC_NAME,
        anchor: e.id,
        heading: e.heading,
        level: e.level,
      };
      push(byNorm, normTerm(e.heading), ref);
      push(byToken, tokenKey(e.heading), ref);
    }
    for (const list of byNorm.values()) list.sort((a, b) => a.level - b.level);
    for (const list of byToken.values()) list.sort((a, b) => a.level - b.level);
    this.entryIndexCache = { v, byNorm, byToken };
    return this.entryIndexCache;
  }

  /** Sezioni il cui titolo coincide con il termine, es. "Jet of flame" o "Reach Spell". */
  findEntries(term: string): EntryRef[] {
    const exact = normTerm(term);
    if (!exact) return [];
    const key = tokenKey(term);
    const { byNorm, byToken } = this.entryIndex();
    const normHits = byNorm.get(exact);
    const tokenHits = byToken.get(key);
    if (!normHits && !tokenHits) return [];
    if (!tokenHits) return [...normHits!];
    if (!normHits) return [...tokenHits];
    const seen = new Set<string>();
    const out: EntryRef[] = [];
    for (const r of normHits) {
      seen.add(`${r.docId}#${r.anchor}`);
      out.push(r);
    }
    for (const r of tokenHits) {
      const k = `${r.docId}#${r.anchor}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(r);
      }
    }
    return out.sort((a, b) => a.level - b.level); // prima le voci vere, poi le righe-formula
  }

  private async parsedDoc(docId: string): Promise<Document> {
    const m = this.library.meta(docId);
    const stamp = m ? `${m.modifiedTime}:${m.parser ?? 0}` : '';
    const cached = this.domCache.get(docId);
    if (cached && stamp && cached.stamp === stamp) {
      // LRU: sposta in fondo come usato più di recente
      this.domCache.delete(docId);
      this.domCache.set(docId, cached);
      return cached.doc;
    }
    const inflight = this.domInflight.get(docId);
    if (inflight) return inflight;
    const p = (async () => {
      const html = await this.library.getHtml(docId);
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      const latest = this.library.meta(docId);
      const latestStamp = latest ? `${latest.modifiedTime}:${latest.parser ?? 0}` : stamp;
      this.domCache.delete(docId);
      this.domCache.set(docId, { stamp: latestStamp, doc });
      while (this.domCache.size > DOM_CACHE_MAX) {
        const oldest = this.domCache.keys().next().value;
        if (oldest !== undefined) this.domCache.delete(oldest);
      }
      return doc;
    })().finally(() => this.domInflight.delete(docId));
    this.domInflight.set(docId, p);
    return p;
  }

  /** HTML integrale di una voce (titolo + tutto il testo fino alla voce successiva). */
  async entryHtml(ref: EntryRef): Promise<string> {
    if (ref.docId === CUSTOM_DOC_ID) return customEntryHtml(ref.anchor);
    const doc = await this.parsedDoc(ref.docId);
    return sliceSectionFromDoc(doc, ref.anchor);
  }

  /** Documenti degli incantesimi (Ch 8 / Ch 8a, anche uniti): il nome corrisponde alle regole di unione. */
  private spellDocIds(): Set<string> {
    const ids = new Set<string>();
    for (const m of this.library.allMetas()) {
      const n = this.library.node(m.id);
      const names = n?.parts ? n.parts.map(p => p.name) : [m.name];
      if (environment.mergeGroups.some(g => names.some(x => g.pattern.test(x)))) ids.add(m.id);
    }
    return ids;
  }

  /**
   * Descrizione di una spell di livello 0-9 usata come base di una formula (es. "Jet of flame (0 level)").
   * La cerca nei capitoli delle spell: prima come voce con quel titolo, poi come riga di una
   * tabella di varianti (es. "Fire | Jet of flame | 0" dentro la voce Acid Splash).
   * Il testo riportato è quello del documento, senza modifiche.
   */
  async explainSeed(term: string, level: number): Promise<string> {
    const head = `<p class="seed-level">Livello ${level} (come indicato nella formula)</p>`;
    const spellDocs = this.spellDocIds();
    const exact = this.findEntries(term).filter(r => spellDocs.has(r.docId));
    if (exact.length) return head + (await this.render(exact.slice(0, 3)));

    // riga di tabella: "Fire | Jet of flame | 0"
    const key = normTerm(term);
    const rows: { ref: EntryRef; row: string }[] = [];
    for (const m of this.library.allMetas()) {
      if (!spellDocs.has(m.id)) continue;
      for (const s of m.sections) {
        const row = s.text.split('\n').find(l => l.includes('|') && l.split('|').some(c => normTerm(c) === key));
        if (row) rows.push({ ref: { docId: m.id, docName: m.name, anchor: s.id, heading: s.heading, level: s.level }, row });
      }
    }
    if (rows.length) {
      const note = rows
        .map(
          r =>
            `<p class="muted">Nei capitoli delle spell "${esc(term)}" non ha una voce propria: è elencata nella voce ` +
            `<strong>${esc(r.ref.heading)}</strong>, riga della tabella: <strong>${esc(r.row)}</strong></p>`
        )
        .join('');
      return head + note + (await this.render(rows.slice(0, 2).map(r => r.ref)));
    }

    return head + (await this.explain(term));
  }

  /**
   * Testo da mostrare per un termine: la voce completa se esiste un titolo uguale,
   * altrimenti i passaggi dei documenti in cui il termine compare.
   */
  async explain(term: string): Promise<string> {
    const refs = this.findEntries(term).slice(0, 4);
    if (refs.length) return this.render(refs);
    const hits = this.library.search(`"${term}"`, 6);
    if (!hits.length) return `<p class="muted">Nessuna descrizione trovata per "${esc(term)}".</p>`;
    const intro = `<p class="muted">Nel Drive non esiste una voce con questo titolo. Passaggi in cui compare:</p>`;
    return (
      intro +
      hits
        .map(h => `<p><span class="entry-src">${esc(h.path ? h.path + ' › ' : '')}${esc(h.docName)}</span><br>${h.snippet}</p>`)
        .join('')
    );
  }

  private async render(refs: EntryRef[]): Promise<string> {
    const parts = await Promise.all(
      refs.map(async r => {
        const path = this.library.pathText(r.docId);
        return `<div class="entry-src">${esc(path ? path + ' › ' : '')}${esc(r.docName)}</div>${await this.entryHtml(r)}`;
      })
    );
    return parts.join('<hr>');
  }

  /**
   * Indice delle spell per lista (arcane, divine, bard, ...) e livello, letto dalle righe
   * "Level arcane 1, divine 1" di ogni voce di spell. Non modifica nessun testo.
   */
  spellBook(): Map<string, Map<number, SpellRef[]>> {
    const v = this.library.version();
    if (this.spellBookCache && this.spellBookCache.v === v) return this.spellBookCache.book;
    const book = new Map<string, Map<number, SpellRef[]>>();
    for (const m of this.library.allMetas()) {
      for (const s of m.sections) {
        if (s.level !== 5 || !s.heading) continue;
        const line = s.text.split('\n').find(l => /^Level\s/i.test(l.trim()));
        if (!line) continue;
        for (const part of line.trim().replace(/^Level\s+/i, '').split(',')) {
          const mm = /^\s*(.+?)\s+(\d)\s*$/.exec(part);
          if (!mm) continue;
          const key = mm[1].trim().toLowerCase();
          const lvl = Number(mm[2]);
          if (!book.has(key)) book.set(key, new Map());
          const byLevel = book.get(key)!;
          if (!byLevel.has(lvl)) byLevel.set(lvl, []);
          byLevel.get(lvl)!.push({ name: s.heading, docId: m.id, docName: m.name, anchor: s.id });
        }
      }
    }
    this.spellBookCache = { v, book };
    return book;
  }
}
