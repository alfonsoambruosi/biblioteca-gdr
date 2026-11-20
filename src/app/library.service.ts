import { Injectable, inject, signal } from '@angular/core';
import { get, set, setMany, del } from 'idb-keyval';
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

/** Titoli troppo comuni per essere collegati automaticamente nei testi. */
const GENERIC_HEADINGS = new Set([
  'benefit', 'special', 'prerequisite', 'prerequisites', 'normal', 'table', 'notes', 'note', 'example',
  'examples', 'contents', 'overview', 'introduction', 'chapter', 'summary', 'description', 'requirements',
]);

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
    this.running ??= this.checkTree().finally(() => (this.running = null));
    return this.running;
  }

  private downloading: Promise<void> | null = null;

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

  /**
   * Fase 1 (veloce, aspettata da login e logout): legge l'elenco di cartelle e file
   * e lo confronta con la copia salvata.
   * Fase 2 (in background): scarica solo i file nuovi o cambiati. Se un file fallisce
   * non blocca gli altri e verrà ritentato alla verifica successiva.
   */
  private async checkTree(): Promise<void> {
    await this.loadCache();
    await this.importSnapshot();
    if (!this.configured) {
      this.status.set('error');
      this.fatalError.set(
        'Manca la chiave API Google: apri src/environments/environment.ts e inseriscila (vedi README, passo 2).'
      );
      return;
    }
    this.status.set('checking');
    this.statusText.set('Controllo il Drive…');
    let tree: TreeNode;
    try {
      tree = await this.drive.buildTree(environment.driveRootId);
    } catch (e: any) {
      // senza rete o con errore dell'API resta la copia salvata, l'app si apre comunque
      this.status.set('error');
      this.fatalError.set(e?.message ?? String(e));
      this.statusText.set('');
      return;
    }
    this.fatalError.set('');
    this.setTree(tree);
    await set('tree', tree);

    // rimuove ciò che non esiste più nel Drive
    const files = this.files();
    const present = new Set(files.map(f => f.id));
    for (const id of Array.from(this.metas.keys())) if (!present.has(id)) this.removeFromIndex(id);

    const stale = files.filter(f => this.isStale(f));
    this.version.update(v => v + 1);
    if (stale.length) {
      void this.downloadStale(stale);
    } else {
      await this.finishCheck();
    }
  }

  /**
   * Carica la copia precompilata (assets/snapshot.jsonll) a pezzi: una riga per documento,
   * così il file non viene mai letto come un unico testo gigante.
   * Importa solo i documenti che il dispositivo non ha ancora: quelli cambiati
   * vengono poi confrontati con il Drive e riscaricati solo se necessario.
   */
  private async importSnapshot(): Promise<void> {
    let res: Response;
    try {
      res = await fetch('assets/snapshot.jsonll', { cache: 'no-cache' });
    } catch {
      return;
    }
    if (!res.ok || !res.body) return; // nessuna copia precompilata: si legge dal Drive

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    let header: { generatedAt: string; tree: TreeNode } | null = null;
    let pending: [string, unknown][] = [];
    let skip = false;

    const flush = async () => {
      if (pending.length) await setMany(pending);
      pending = [];
    };
    const handle = async (line: string) => {
      if (!line.trim() || skip) return;
      const obj = JSON.parse(line);
      if (!header) {
        header = obj as { generatedAt: string; tree: TreeNode };
        if (!header.tree) return;
        if ((await get<string>('snapshotAt')) === header.generatedAt) {
          skip = true;
          return;
        }
        if (!this.tree()) {
          this.setTree(header.tree);
          await set('tree', header.tree);
        }
        return;
      }
      const d = obj as { id: string; meta: DocMeta; html: string };
      if (this.metas.has(d.id)) return;
      pending.push([`html:${d.id}`, d.html], [`meta:${d.id}`, d.meta]);
      this.addToIndex(d.meta);
      if (pending.length >= 200) await flush();
    };

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl = buf.indexOf('\n');
        while (nl >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          await handle(line);
          if (skip) return;
          nl = buf.indexOf('\n');
        }
      }
      if (buf.trim()) await handle(buf);
    } finally {
      // salva quanto letto, anche se il file si interrompe a metà
      await flush();
    }
    if (header && !skip) {
      await set('snapshotAt', (header as { generatedAt: string }).generatedAt);
      this.version.update(v => v + 1);
    }
  }

  /** Stato dell'esportazione, mostrato nella Home. */
  readonly exporting = signal<'idle' | 'working' | 'done' | 'error'>('idle');
  readonly exportInfo = signal('');

  /**
   * Crea il file snapshot.jsonl con i documenti salvati su questo dispositivo.
   * Va copiato in src/assets/snapshot.jsonl e pubblicato di nuovo.
   */
  async exportSnapshot(): Promise<void> {
    this.exporting.set('working');
    this.exportInfo.set('Preparo il file…');
    try {
      const tree = this.tree();
      if (!tree) throw new Error('la biblioteca non è ancora caricata.');
      const files = this.files();
      // un documento per riga, senza mai creare un unico testo gigante
      const parts: BlobPart[] = [JSON.stringify({ generatedAt: new Date().toISOString(), tree }) + '\n'];
      let exported = 0;
      for (const f of files) {
        const meta = this.metas.get(f.id);
        const html = await get<string>(`html:${f.id}`);
        if (meta && html != null) {
          parts.push(JSON.stringify({ id: f.id, meta, html }) + '\n');
          exported++;
        }
      }
      const missing = files.length - exported;
      const blob = new Blob(parts, { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'snapshot.jsonll';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.exporting.set('done');
      this.exportInfo.set(
        `File creato con ${exported} documenti (${(blob.size / 1e6).toFixed(1)} MB). ` +
          (missing ? `${missing} documenti non sono ancora salvati e mancano nel file. ` : '') +
          'Controlla la cartella Download del browser.'
      );
    } catch (e: any) {
      this.exporting.set('error');
      this.exportInfo.set('Esportazione non riuscita: ' + (e?.message ?? String(e)));
    }
  }

  private linkCache: { v: number; re: RegExp | null } | null = null;

  /**
   * Espressione che riconosce, dentro i testi, i nomi già presenti nel Drive come
   * titoli di feat, talenti, spell o altre voci. Serve a rendere cliccabili i nomi.
   */
  linkPattern(): RegExp | null {
    const v = this.version();
    const cached = this.linkCache;
    if (cached && cached.v === v) return cached.re;
    const names = new Set<string>();
    for (const m of this.metas.values()) {
      for (const s of m.sections) {
        const h = s.heading.trim();
        if (s.level < 3 || h.length < 5 || h.length > 60 || GENERIC_HEADINGS.has(h.toLowerCase())) continue;
        names.add(h);
      }
    }
    const list = [...names].sort((a, b) => b.length - a.length).slice(0, 4000);
    const re = list.length
      ? new RegExp(
          `(?<![\\p{L}\\p{N}])(${list.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`,
          'gu'
        )
      : null;
    this.linkCache = { v, re };
    return re;
  }

  private downloadStale(stale: TreeNode[]): Promise<void> {
    this.downloading ??= this.runDownloads(stale).finally(() => (this.downloading = null));
    return this.downloading;
  }

  private async runDownloads(stale: TreeNode[]): Promise<void> {
    this.total.set(stale.length);
    this.done.set(0);
    this.status.set('syncing');
    this.statusText.set('Aggiorno i documenti modificati…');
    await this.pool(stale, 2, async f => {
      try {
        await this.sync(f);
      } catch {
        // l'errore resta in docErrors: il documento viene ritentato alla prossima verifica
      }
      this.done.update(d => d + 1);
      await new Promise(r => setTimeout(r)); // lascia respirare l'interfaccia
    });
    await this.finishCheck();
  }

  private async finishCheck(): Promise<void> {
    const now = new Date();
    this.lastCheck.set(now);
    await set('lastCheck', now.toISOString());
    // documenti non letti: li segnala syncText ("N documenti non letti"), senza bloccare nulla
    this.status.set('idle');
    this.statusText.set('');
    this.version.update(v => v + 1);
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
