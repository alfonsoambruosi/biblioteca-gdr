import { Injectable, inject, signal } from '@angular/core';
import { get, set, del } from 'idb-keyval';
import MiniSearch from 'minisearch';
import * as mammoth from 'mammoth/mammoth.browser';
import { environment } from '../environments/environment';
import { DriveService, displayName } from './drive.service';
import { PARSER_VERSION, enrichHtml, esc, normTerm } from './doc-parser';
import { DocMeta, SearchHit, Section, TreeNode } from './models';

const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
];

interface IndexDoc {
  id: string; // `${docId}#${sectionId}`
  docId: string;
  anchor: string;
  heading: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private drive = inject(DriveService);

  readonly tree = signal<TreeNode | null>(null);
  readonly status = signal<'idle' | 'checking' | 'syncing' | 'error'>('idle');
  readonly statusText = signal('');
  readonly total = signal(0);
  readonly done = signal(0);
  readonly fatalError = signal('');
  readonly docErrors = signal<Record<string, string>>({});
  /** Aumenta ogni volta che l'indice cambia: serve a ricalcolare glossario e ricerche. */
  readonly version = signal(0);
  readonly lastCheck = signal<Date | null>(null);

  readonly configured = this.drive.configured;

  private metas = new Map<string, DocMeta>();
  private nodes = new Map<string, TreeNode>();
  private parents = new Map<string, string>();
  private indexedIds = new Map<string, string[]>();
  private inflight = new Map<string, Promise<void>>();
  private ms = this.newIndex();
  private cacheLoaded = false;
  private running: Promise<void> | null = null;

  private newIndex(): MiniSearch<IndexDoc> {
    return new MiniSearch<IndexDoc>({
      fields: ['heading', 'text'],
      storeFields: ['docId', 'anchor', 'heading'],
      searchOptions: { boost: { heading: 3 }, prefix: true },
      tokenize: s => s.split(/[^\p{L}\p{N}’']+/u).filter(Boolean),
      processTerm: t => t.toLowerCase().replace(/[’']/g, ''),
    });
  }

  // ---------------------------------------------------------------- avvio e verifica

  /**
   * All'apertura dell'app mostra la copia salvata. Il Drive NON viene controllato qui:
   * si controlla solo a login e logout (vedi verify). Il primo accesso su un dispositivo
   * senza copia salvata fa comunque la lettura.
   */
  async start(): Promise<void> {
    await this.loadCache();
    if (!this.tree()) await this.verify();
  }

  /**
   * Confronta il Drive con la copia salvata e aggiorna solo ciò che è cambiato:
   * file nuovi, modificati o rimossi. Viene chiamata a login e logout.
   * Se è già in corso, restituisce la stessa verifica.
   */
  verify(): Promise<void> {
    this.running ??= this.runVerify().finally(() => (this.running = null));
    return this.running;
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;
    this.cacheLoaded = true;
    const cached = await get<TreeNode>('tree');
    if (cached) this.setTree(cached);
    for (const f of this.files()) {
      const m = await get<DocMeta>(`meta:${f.id}`);
      if (m) this.addToIndex(m);
    }
    const last = await get<string>('lastCheck');
    if (last) this.lastCheck.set(new Date(last));
    this.version.update(v => v + 1);
  }

  private async runVerify(): Promise<void> {
    await this.loadCache();
    if (!this.configured) {
      this.status.set('error');
      this.fatalError.set(
        'Manca la chiave API Google: apri src/environments/environment.ts e inseriscila (vedi README, passo 2).'
      );
      return;
    }
    try {
      this.status.set('checking');
      this.statusText.set('Controllo il Drive…');
      const tree = await this.drive.buildTree(environment.driveRootId);
      this.setTree(tree);
      await set('tree', tree);

      // rimuove ciò che non esiste più nel Drive
      const files = this.files();
      const present = new Set(files.map(f => f.id));
      for (const id of Array.from(this.metas.keys())) if (!present.has(id)) this.removeFromIndex(id);

      // scarica solo i file nuovi o cambiati
      const stale = files.filter(f => this.isStale(f));
      this.total.set(stale.length);
      this.done.set(0);
      if (stale.length) {
        this.status.set('syncing');
        this.statusText.set('Aggiorno i documenti modificati…');
        await this.pool(stale, 3, async f => {
          await this.sync(f);
          this.done.update(d => d + 1);
          await new Promise(r => setTimeout(r)); // lascia respirare l'interfaccia
        });
      }

      const now = new Date();
      this.lastCheck.set(now);
      await set('lastCheck', now.toISOString());
      this.fatalError.set('');
      this.status.set('idle');
      this.statusText.set('');
      this.version.update(v => v + 1);
    } catch (e: any) {
      // senza rete o con errore dell'API resta la copia salvata
      this.status.set('error');
      this.fatalError.set(e?.message ?? String(e));
    }
  }

  private setTree(t: TreeNode): void {
    this.tree.set(t);
    this.nodes.clear();
    this.parents.clear();
    const walk = (n: TreeNode, parent?: string) => {
      n.name = displayName(n.name); // senza estensione, anche per le copie salvate prima
      this.nodes.set(n.id, n);
      if (parent) this.parents.set(n.id, parent);
      n.children?.forEach(c => walk(c, n.id));
    };
    walk(t);
  }

  node(id: string): TreeNode | undefined {
    return this.nodes.get(id);
  }

  /** Catena di cartelle dalla radice al nodo (radice esclusa, nodo incluso). */
  pathOf(id: string): TreeNode[] {
    const out: TreeNode[] = [];
    let cur: string | undefined = id;
    while (cur && this.parents.has(cur)) {
      const n = this.nodes.get(cur);
      if (n) out.unshift(n);
      cur = this.parents.get(cur);
    }
    return out;
  }

  pathText(id: string): string {
    return this.pathOf(id).slice(0, -1).map(n => n.name).join(' › ');
  }

  allMetas(): DocMeta[] {
    return Array.from(this.metas.values());
  }

  meta(id: string): DocMeta | undefined {
    return this.metas.get(id);
  }

  private isReadable(n: TreeNode): boolean {
    return n.kind === 'docx' || n.kind === 'gdoc' || n.kind === 'text';
  }

  private files(): TreeNode[] {
    const out: TreeNode[] = [];
    const walk = (n: TreeNode) => {
      if (n.kind === 'folder') n.children?.forEach(walk);
      else if (this.isReadable(n)) out.push(n);
    };
    const t = this.tree();
    if (t) walk(t);
    return out;
  }

  // ---------------------------------------------------------------- cache

  private addToIndex(m: DocMeta): void {
    const old = this.indexedIds.get(m.id);
    if (old) {
      for (const id of old) {
        try {
          this.ms.discard(id);
        } catch {
          /* non presente */
        }
      }
    }
    const docs: IndexDoc[] = m.sections.map(s => ({
      id: `${m.id}#${s.id}`,
      docId: m.id,
      anchor: s.id,
      heading: s.heading,
      text: s.text,
    }));
    this.ms.addAll(docs);
    this.indexedIds.set(m.id, docs.map(d => d.id));
    this.metas.set(m.id, m);
  }

  private removeFromIndex(docId: string): void {
    const old = this.indexedIds.get(docId);
    old?.forEach(id => {
      try {
        this.ms.discard(id);
      } catch {
        /* ignore */
      }
    });
    this.indexedIds.delete(docId);
    this.metas.delete(docId);
    void del(`meta:${docId}`);
    void del(`html:${docId}`);
  }

  // ---------------------------------------------------------------- sincronizzazione

  /** Un file va riscaricato se è nuovo, cambiato, rinominato o letto con una versione vecchia del lettore. */
  private isStale(f: TreeNode): boolean {
    const m = this.metas.get(f.id);
    return !m || m.modifiedTime !== (f.modifiedTime ?? '') || m.name !== f.name || m.parser !== PARSER_VERSION;
  }

  private async pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
    let i = 0;
    const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item);
      }
    });
    await Promise.all(workers);
  }

  /** Scarica, converte e indicizza un singolo file (evita doppi download). */
  sync(node: TreeNode): Promise<void> {
    const running = this.inflight.get(node.id);
    if (running) return running;
    const p = this.doSync(node).finally(() => this.inflight.delete(node.id));
    this.inflight.set(node.id, p);
    return p;
  }

  private async doSync(node: TreeNode): Promise<void> {
    try {
      // un documento unito è la somma dei suoi file, letti uno dopo l'altro
      const parts = node.parts ?? [node];
      const htmls: string[] = [];
      const sections: Section[] = [];
      for (const [i, part] of parts.entries()) {
        const prefix = node.parts ? `p${i}` : 's';
        const raw = await this.fetchHtml(part);
        const title = node.parts ? `<h1>${esc(part.name)}</h1>` : '';
        const parsed =
          part.kind === 'text'
            ? this.plainParse(raw, part, prefix)
            : enrichHtml(title + raw, part.name, prefix);
        htmls.push(parsed.html);
        sections.push(...parsed.sections);
      }
      const meta: DocMeta = {
        id: node.id,
        name: node.name,
        modifiedTime: node.modifiedTime ?? '',
        size: node.size ?? '',
        parser: PARSER_VERSION,
        sections,
      };
      await set(`html:${node.id}`, htmls.join('\n'));
      await set(`meta:${node.id}`, meta);
      this.addToIndex(meta);
      this.docErrors.update(e => {
        const { [node.id]: _, ...rest } = e;
        return rest;
      });
      this.version.update(v => v + 1);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      this.docErrors.update(er => ({ ...er, [node.id]: msg }));
      throw e;
    }
  }

  /** Scarica un file e lo converte in HTML grezzo. */
  private async fetchHtml(part: TreeNode): Promise<string> {
    if (part.kind === 'text') return `<pre class="plain">${esc(await this.drive.downloadText(part))}</pre>`;
    const buf = await this.drive.downloadBinary(part);
    return (await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap: STYLE_MAP })).value;
  }

  private plainParse(html: string, node: TreeNode, prefix: string) {
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
    return { html, sections: [{ id: `${prefix}-0`, heading: node.name, level: 1, text }] };
  }

  /** HTML di un documento: dalla copia salvata; se manca lo scarica subito. */
  async getHtml(id: string): Promise<string> {
    const node = this.nodes.get(id);
    if (!node) throw new Error('Documento non trovato nel Drive.');
    if (this.isStale(node)) await this.sync(node);
    let html = await get<string>(`html:${id}`);
    if (html == null) {
      await this.sync(node);
      html = await get<string>(`html:${id}`);
    }
    return html ?? '';
  }

  // ---------------------------------------------------------------- ricerca

  /**
   * Ordine dei risultati:
   * 1) voci con il titolo uguale alla ricerca (es. "Fireball"), prima le voci vere e poi le righe-formula;
   * 2) titoli che iniziano con la ricerca;
   * 3) tutto il resto che contiene le parole, dal più pertinente.
   */
  search(query: string, limit = 150): SearchHit[] {
    const q = query.trim();
    if (!q) return [];
    const phrase = /^"(.+)"$/.exec(q)?.[1];
    const text = phrase ?? q;
    const terms = text.split(/\s+/).filter(Boolean);
    const key = normTerm(text);
    const seen = new Set<string>();
    const first = (docId: string, anchor: string): boolean => {
      const k = `${docId}#${anchor}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    };
    const make = (m: DocMeta, s: Section): SearchHit => ({
      docId: m.id,
      docName: m.name,
      path: this.pathText(m.id),
      anchor: s.id,
      heading: s.heading,
      snippet: this.snippet(s.text || s.heading, terms),
    });

    const exact: { hit: SearchHit; level: number }[] = [];
    const starts: SearchHit[] = [];
    if (key) {
      for (const m of this.metas.values()) {
        for (const s of m.sections) {
          const h = normTerm(s.heading);
          if (!h || (h !== key && !h.startsWith(key))) continue;
          if (!first(m.id, s.id)) continue;
          if (h === key) exact.push({ hit: make(m, s), level: s.level });
          else starts.push(make(m, s));
        }
      }
    }

    let res = this.ms.search(text, { combineWith: 'AND' });
    if (!res.length && !phrase) res = this.ms.search(text, { combineWith: 'OR' });
    const rest: SearchHit[] = [];
    for (const r of res) {
      const m = this.metas.get(r['docId']);
      const sec = m?.sections.find(s => s.id === r['anchor']);
      if (!m || !sec || !first(m.id, sec.id)) continue;
      if (phrase && !(sec.heading + ' ' + sec.text).toLowerCase().includes(phrase.toLowerCase())) continue;
      rest.push(make(m, sec));
    }

    exact.sort((a, b) => a.level - b.level);
    return [...exact.map(e => e.hit), ...starts, ...rest].slice(0, limit);
  }

  private snippet(text: string, terms: string[]): string {
    const low = text.toLowerCase();
    let pos = -1;
    for (const t of terms) {
      const i = low.indexOf(t.toLowerCase());
      if (i >= 0 && (pos < 0 || i < pos)) pos = i;
    }
    const start = Math.max(0, (pos < 0 ? 0 : pos) - 90);
    const part = text.slice(start, start + 320);
    let html = esc(part);
    for (const t of terms) {
      if (t.length < 2) continue;
      const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      html = html.replace(re, m => `<mark>${m}</mark>`);
    }
    return (start > 0 ? '… ' : '') + html + (start + 320 < text.length ? ' …' : '');
  }
}
