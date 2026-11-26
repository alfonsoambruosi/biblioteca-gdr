import { Injectable, inject, signal } from '@angular/core';
import { get, getMany, set, setMany, del } from 'idb-keyval';
import MiniSearch, { AsPlainObject, Options } from 'minisearch';
import { environment } from '../environments/environment';
import { DriveService, displayName } from './drive.service';
import { PARSER_VERSION, enrichHtml, esc, normTerm } from './doc-parser';
import { DocMeta, SearchHit, Section, TreeNode } from './models';
import { TermMap, TermTarget, buildTermMap, namesOf } from './term-links';
import { compressImageToDataUri } from './image-compress';

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

const SEARCH_INDEX_KEY = 'searchIndex';
const SEARCH_INDEX_VERSION = 1;

interface SavedSearchIndex {
  v: number;
  sig: string;
  data: AsPlainObject;
}

const MINISEARCH_OPTIONS: Options<IndexDoc> = {
  fields: ['heading', 'text'],
  storeFields: ['docId', 'anchor', 'heading'],
  searchOptions: { boost: { heading: 3 }, prefix: true },
  tokenize: s => s.split(/[^\p{L}\p{N}’']+/u).filter(Boolean),
  processTerm: t => t.toLowerCase().replace(/[’']/g, ''),
};

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private drive = inject(DriveService);

  readonly tree = signal<TreeNode | null>(null);
  readonly status = signal<'idle' | 'checking' | 'syncing' | 'error'>('idle');
  readonly statusText = signal('');
  readonly bestiaryStatus = signal('');
  readonly total = signal(0);
  readonly done = signal(0);
  readonly fatalError = signal('');
  readonly docErrors = signal<Record<string, string>>({});
  /** Aumenta ogni volta che l'indice cambia: serve a ricalcolare glossario e ricerche. */
  readonly version = signal(0);
  readonly lastCheck = signal<Date | null>(null);

  readonly configured = this.drive.configured;

  private metas = new Map<string, DocMeta>();
  private sectionMaps = new Map<string, Map<string, Section>>();
  private nodes = new Map<string, TreeNode>();
  private parents = new Map<string, string>();
  private indexedIds = new Map<string, string[]>();
  private inflight = new Map<string, Promise<void>>();
  private headingCache: {
    v: number;
    entries: Array<{ m: DocMeta; s: Section; norm: string; bestiary: boolean }>;
  } | null = null;
  private ms = this.newIndex();
  private cachePromise: Promise<void> | null = null;
  private running: Promise<void> | null = null;
  private indexDirty = false;
  private saveIndexTimer: ReturnType<typeof setTimeout> | null = null;

  private newIndex(): MiniSearch<IndexDoc> {
    return new MiniSearch<IndexDoc>(MINISEARCH_OPTIONS);
  }

  private indexSignature(metas: Iterable<DocMeta>): string {
    return Array.from(metas, m => `${m.id}\t${m.modifiedTime}\t${m.parser ?? 0}\t${m.sections.length}`)
      .sort()
      .join('\n');
  }

  private scheduleSaveIndex(delayMs = 1000): void {
    this.indexDirty = true;
    if (this.saveIndexTimer !== null) clearTimeout(this.saveIndexTimer);
    this.saveIndexTimer = setTimeout(() => {
      this.saveIndexTimer = null;
      void this.flushSearchIndex();
    }, delayMs);
  }

  private async flushSearchIndex(): Promise<void> {
    if (!this.indexDirty) return;
    if (this.saveIndexTimer !== null) {
      clearTimeout(this.saveIndexTimer);
      this.saveIndexTimer = null;
    }
    this.indexDirty = false;
    try {
      const payload: SavedSearchIndex = {
        v: SEARCH_INDEX_VERSION,
        sig: this.indexSignature(this.metas.values()),
        data: this.ms.toJSON(),
      };
      await set(SEARCH_INDEX_KEY, payload);
    } catch {
      /* IndexedDB pieno o non disponibile: l'indice resta comunque in RAM */
    }
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
  private bestiaryImporting: Promise<void> | null = null;

  private loadCache(): Promise<void> {
    this.cachePromise ??= this.doLoadCache();
    return this.cachePromise;
  }

  private async doLoadCache(): Promise<void> {
    const [cached, last, savedIndex] = (await getMany(['tree', 'lastCheck', SEARCH_INDEX_KEY])) as [
      TreeNode | undefined,
      string | undefined,
      SavedSearchIndex | undefined,
    ];
    if (last) this.lastCheck.set(new Date(last));
    if (cached) {
      this.setTree(cached);
      const files = this.files();
      const loaded = files.length
        ? await getMany<DocMeta | undefined>(files.map(f => `meta:${f.id}`))
        : [];
      const metas = loaded.filter((m): m is DocMeta => !!m);
      const sig = this.indexSignature(metas);
      let restored = false;
      if (savedIndex && savedIndex.v === SEARCH_INDEX_VERSION && savedIndex.sig === sig) {
        try {
          this.ms = await MiniSearch.loadJSAsync<IndexDoc>(savedIndex.data, MINISEARCH_OPTIONS);
          for (const m of metas) {
            this.storeMeta(m);
            this.indexedIds.set(
              m.id,
              m.sections.map(s => `${m.id}#${s.id}`)
            );
          }
          restored = true;
        } catch {
          this.ms = this.newIndex();
        }
      }
      if (!restored && metas.length) {
        const allDocs: IndexDoc[] = [];
        for (const m of metas) {
          const ids: string[] = [];
          for (const s of m.sections) {
            const id = `${m.id}#${s.id}`;
            ids.push(id);
            allDocs.push({ id, docId: m.id, anchor: s.id, heading: s.heading, text: s.text });
          }
          this.storeMeta(m);
          this.indexedIds.set(m.id, ids);
        }
        this.ms.addAll(allDocs);
        this.scheduleSaveIndex(200);
      }
    }
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

    this.version.update(v => v + 1);
    const pendingBestiary = this.bestiaryImporting;
    if (pendingBestiary) {
      // Prima aggiorna subito le regole core (se stale); poi, terminato l'import locale del Bestiario,
      // scarica dal Drive solo le schede Bestiario eventualmente cambiate dopo lo snapshot.
      const coreStale = files.filter(f => !this.isBestiary(f.id) && this.isStale(f));
      void (async () => {
        if (coreStale.length) await this.downloadStale(coreStale);
        await pendingBestiary;
        const bestiaryStale = this.files().filter(f => this.isBestiary(f.id) && this.isStale(f));
        if (bestiaryStale.length) await this.downloadStale(bestiaryStale);
        else await this.finishCheck();
      })();
      return;
    }

    const stale = files.filter(f => this.isStale(f));
    if (stale.length) {
      void this.downloadStale(stale);
    } else {
      await this.finishCheck();
    }
  }

  /**
   * Carica la copia precompilata in due fasi:
   * 1) `assets/snapshot-core-1..N.jsonl` (regole, classi, talenti, incantesimi): atteso al login (~1 file);
   * 2) `assets/snapshot-bestiary-1..N.jsonl` (schede mostri): avviato in background senza bloccare l'ingresso.
   * Se non esistono file `snapshot-core-*`, ripiega sul formato legacy `assets/snapshot-1..N.jsonl`.
   */
  private async importSnapshot(): Promise<void> {
    const hasCore = await this.importSeries('snapshot-core', 'snapshotCoreAt');
    if (hasCore) {
      void this.startBestiaryImport();
      return;
    }
    await this.importSeries('snapshot', 'snapshotAt');
  }

  private startBestiaryImport(): Promise<void> {
    if (!this.bestiaryImporting) {
      this.bestiaryImporting = this.importSeries(
        'snapshot-bestiary',
        'snapshotBestiaryAt',
        part => this.bestiaryStatus.set(`Carico il Bestiario in background (parte ${part})…`)
      )
        .then(() => undefined)
        .finally(() => {
          this.bestiaryStatus.set('');
          this.bestiaryImporting = null;
        });
    }
    return this.bestiaryImporting;
  }

  private async importSeries(
    prefix: string,
    storageKey: string,
    onPart?: (part: number) => void
  ): Promise<boolean> {
    const st = { generatedAt: '', skip: false, stop: false, found: false };
    const pending: [string, unknown][] = [];
    const flush = async () => {
      if (pending.length) await setMany(pending.splice(0));
    };

    for (let part = 1; part <= 50 && !st.skip && !st.stop; part++) {
      let res: Response;
      try {
        res = await fetch(`assets/${prefix}-${part}.jsonl`, { cache: 'no-cache' });
      } catch {
        break;
      }
      const ct = res.headers.get('content-type') ?? '';
      // Dev server e hosting SPA possono rispondere 200 text/html (index.html) per file inesistenti.
      if (!res.ok || !res.body || /\btext\/html\b/i.test(ct)) break;

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = '';
      let first = true;
      const handle = async (line: string) => {
        if (!line.trim() || st.skip || st.stop) return;
        let obj: any;
        try {
          obj = JSON.parse(line);
        } catch {
          // Risposta non-JSON (es. fallback HTML senza header text/html): fine serie.
          if (first) st.stop = true;
          return;
        }
        if (first) {
          first = false;
          if (!obj || typeof obj !== 'object' || typeof obj.generatedAt !== 'string') {
            st.stop = true;
            return;
          }
          st.found = true;
          const h = obj as { generatedAt: string; tree?: TreeNode };
          st.generatedAt = h.generatedAt;
          if (part === 1) {
            if ((await get<string>(storageKey)) === h.generatedAt) {
              st.skip = true; // questa copia è già stata caricata
              return;
            }
            if (!this.tree() && h.tree) {
              this.setTree(h.tree);
              await set('tree', h.tree);
            }
          }
          onPart?.(part);
          return;
        }
        const d = obj as { id: string; meta: DocMeta; html: string };
        if (this.metas.has(d.id)) return;
        pending.push([`html:${d.id}`, d.html], [`meta:${d.id}`, d.meta]);
        this.addToIndex(d.meta, false);
        this.indexDirty = true;
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
            if (st.skip || st.stop) break;
            nl = buf.indexOf('\n');
          }
          if (st.skip || st.stop) {
            await reader.cancel();
            break;
          }
        }
        if (!st.skip && !st.stop && buf.trim()) await handle(buf);
      } finally {
        await flush(); // salva quanto letto, anche se il file si interrompe
      }
    }

    if (st.generatedAt && !st.skip) {
      await set(storageKey, st.generatedAt);
      await this.flushSearchIndex();
      this.version.update(v => v + 1);
    }
    return st.found;
  }

  /** Stato dell'esportazione, mostrato nella Home. */
  readonly exporting = signal<'idle' | 'working' | 'done' | 'error'>('idle');
  readonly exportInfo = signal('');

  /**
   * Crea i file divisi per priorità (`snapshot-core-N.jsonl` per le regole e
   * `snapshot-bestiary-N.jsonl` per il Bestiario) con i documenti salvati su questo dispositivo.
   * Vanno copiati tutti in src/assets/ e pubblicati di nuovo.
   */
  async exportSnapshot(): Promise<void> {
    this.exporting.set('working');
    this.exportInfo.set('Preparo i file…');
    try {
      const tree = this.tree();
      if (!tree) throw new Error('la biblioteca non è ancora caricata.');
      const files = this.files();
      const LIMIT = 15_000_000; // caratteri: sotto i 25 MB che GitHub accetta dal browser
      const generatedAt = new Date().toISOString();
      const coreFiles = files.filter(f => !this.isBestiary(f.id));
      const bestiaryFiles = files.filter(f => this.isBestiary(f.id));
      const downloads: { name: string; blob: Blob }[] = [];
      let exported = 0;

      const pack = async (list: TreeNode[], prefix: string, includeTree: boolean) => {
        if (!list.length && !includeTree) return;
        let part = 1;
        const header = (n: number) =>
          JSON.stringify(includeTree && n === 1 ? { generatedAt, tree } : { generatedAt }) + '\n';
        let current: string[] = [header(1)];
        let size = current[0].length;
        let countInSeries = 0;
        for (const f of list) {
          const meta = this.metas.get(f.id);
          const html = await get<string>(`html:${f.id}`);
          if (!meta || html == null) continue;
          const line = JSON.stringify({ id: f.id, meta, html }) + '\n';
          if (size + line.length > LIMIT && current.length > 1) {
            downloads.push({ name: `${prefix}-${part}.jsonl`, blob: new Blob(current, { type: 'application/x-ndjson' }) });
            part++;
            current = [header(part)];
            size = current[0].length;
          }
          current.push(line);
          size += line.length;
          exported++;
          countInSeries++;
        }
        if (countInSeries > 0 || includeTree) {
          downloads.push({ name: `${prefix}-${part}.jsonl`, blob: new Blob(current, { type: 'application/x-ndjson' }) });
        }
      };

      await pack(coreFiles, 'snapshot-core', true);
      await pack(bestiaryFiles, 'snapshot-bestiary', false);

      const missing = files.length - exported;
      for (const item of downloads) {
        const url = URL.createObjectURL(item.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        await new Promise(r => setTimeout(r, 700)); // lascia al browser il tempo di salvare ogni file
      }
      const total = downloads.reduce((t, d) => t + d.blob.size, 0);
      this.exporting.set('done');
      this.exportInfo.set(
        `Creati ${downloads.length} file con ${exported} documenti (${(total / 1e6).toFixed(1)} MB in totale). ` +
          (missing ? `${missing} documenti non sono ancora salvati e mancano nel file. ` : '') +
          'Carica tutti i file in src/assets/. Controlla la cartella Download del browser.'
      );
    } catch (e: any) {
      this.exporting.set('error');
      this.exportInfo.set('Esportazione non riuscita: ' + (e?.message ?? String(e)));
    }
  }

  private linkCache: { v: number; terms: TermMap } | null = null;

  /**
   * Nomi che nei testi diventano cliccabili (feat, talenti, spell, altre voci del Drive),
   * ciascuno con il riferimento alla sezione da mostrare. Nessun limite di quantità.
   * Le voci dei documenti del bestiario vengono dopo quelle del resto della biblioteca.
   */
  linkTerms(): TermMap {
    const v = this.version();
    const cached = this.linkCache;
    if (cached && cached.v === v) return cached.terms;
    const full: Array<[string, TermTarget]> = [];
    const derived: Array<[string, TermTarget]> = [];
    const metas = [...this.metas.values()].sort((x, y) => Number(this.isBestiary(x.id)) - Number(this.isBestiary(y.id)));
    for (const m of metas) {
      for (const s of m.sections) {
        if (s.level < 3 || s.heading.trim().length < 5) continue;
        const ref: TermTarget = { docId: m.id, docName: m.name, anchor: s.id, heading: s.heading, level: s.level };
        const names = namesOf(s.heading);
        for (const n of names.full) {
          if (n.length >= 5 && n.length <= 80 && !GENERIC_HEADINGS.has(n.toLowerCase())) full.push([n, ref]);
        }
        for (const n of names.derived) {
          if (n.length >= 5 && n.length <= 80 && !GENERIC_HEADINGS.has(n.toLowerCase())) derived.push([n, ref]);
        }
      }
    }
    const terms = buildTermMap([...full, ...derived]);
    this.linkCache = { v, terms };
    return terms;
  }

  /** Vero per i documenti che stanno nella cartella Bestiary (o dentro di essa). */
  isBestiary(id: string): boolean {
    return this.pathOf(id).some(n => /bestiar|bestiary/i.test(n.name));
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
    void this.flushSearchIndex();
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

  private storeMeta(m: DocMeta): void {
    this.metas.set(m.id, m);
    const byId = new Map<string, Section>();
    for (const s of m.sections) byId.set(s.id, s);
    this.sectionMaps.set(m.id, byId);
  }

  private addToIndex(m: DocMeta, persist = true): void {
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
    this.storeMeta(m);
    if (persist) this.scheduleSaveIndex();
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
    this.sectionMaps.delete(docId);
    void del(`meta:${docId}`);
    void del(`html:${docId}`);
    this.scheduleSaveIndex();
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

  /** Scarica un file e lo converte in HTML grezzo (comprimendo le immagini in WebP). */
  private async fetchHtml(part: TreeNode): Promise<string> {
    if (part.kind === 'text') return `<pre class="plain">${esc(await this.drive.downloadText(part))}</pre>`;
    const [buf, mammoth] = await Promise.all([
      this.drive.downloadBinary(part),
      import('mammoth/mammoth.browser'),
    ]);
    const convertImage = mammoth.images.imgElement(async img => ({
      src: await compressImageToDataUri(await img.readAsBase64String(), img.contentType),
    }));
    return (await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap: STYLE_MAP, convertImage })).value;
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

  private headingEntries() {
    const v = this.version();
    if (this.headingCache && this.headingCache.v === v) return this.headingCache.entries;
    const entries: Array<{ m: DocMeta; s: Section; norm: string; bestiary: boolean }> = [];
    for (const m of this.metas.values()) {
      const bestiary = this.isBestiary(m.id);
      for (const s of m.sections) {
        const norm = normTerm(s.heading);
        if (norm) entries.push({ m, s, norm, bestiary });
      }
    }
    this.headingCache = { v, entries };
    return entries;
  }

  /**
   * Ordine dei risultati:
   * 1) voci con il titolo uguale alla ricerca (es. "Fireball"), prima le voci vere e poi le righe-formula;
   * 2) titoli che iniziano con la ricerca;
   * 3) tutto il resto che contiene le parole, dal più pertinente.
   */
  search(query: string, limit = 150, scope: 'all' | 'bestiary' = 'all'): SearchHit[] {
    const q = query.trim();
    if (!q) return [];
    const phrase = /^"(.+)"$/.exec(q)?.[1];
    const phraseLow = phrase?.toLowerCase();
    const text = phrase ?? q;
    const terms = text.split(/\s+/).filter(Boolean);
    const termsLow = terms.map(t => t.toLowerCase());
    const termRes = terms
      .filter(t => t.length >= 2)
      .map(t => new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
    const key = normTerm(text);
    const wantBestiary = scope === 'bestiary';
    const seen = new Set<string>();
    const first = (docId: string, anchor: string): boolean => {
      const k = `${docId}#${anchor}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    };
    // "all" esclude sempre il bestiario; "bestiary" cerca solo lì
    const scopeCache = new Map<string, boolean>();
    const inScope = (id: string): boolean => {
      let ok = scopeCache.get(id);
      if (ok === undefined) {
        ok = this.isBestiary(id) === wantBestiary;
        scopeCache.set(id, ok);
      }
      return ok;
    };
    const make = (m: DocMeta, s: Section): SearchHit => ({
      docId: m.id,
      docName: m.name,
      path: this.pathText(m.id),
      anchor: s.id,
      heading: s.heading,
      snippet: this.snippet(s.text || s.heading, termsLow, termRes),
    });

    const exact: { hit: SearchHit; level: number }[] = [];
    const starts: SearchHit[] = [];
    if (key) {
      for (const e of this.headingEntries()) {
        if (e.bestiary !== wantBestiary) continue;
        if (e.norm !== key && !e.norm.startsWith(key)) continue;
        if (!first(e.m.id, e.s.id)) continue;
        if (e.norm === key) exact.push({ hit: make(e.m, e.s), level: e.s.level });
        else starts.push(make(e.m, e.s));
      }
    }

    const rest: SearchHit[] = [];
    const remaining = limit - exact.length - starts.length;
    if (remaining > 0) {
      let res = this.ms.search(text, { combineWith: 'AND' });
      if (!res.length && !phrase) res = this.ms.search(text, { combineWith: 'OR' });
      for (const r of res) {
        const docId = r['docId'] as string;
        const m = this.metas.get(docId);
        const sec = this.sectionMaps.get(docId)?.get(r['anchor'] as string);
        if (!m || !sec || !inScope(docId) || !first(docId, sec.id)) continue;
        if (phraseLow && !(sec.heading + ' ' + sec.text).toLowerCase().includes(phraseLow)) continue;
        rest.push(make(m, sec));
        if (rest.length >= remaining) break;
      }
    }

    exact.sort((a, b) => a.level - b.level);
    return [...exact.map(e => e.hit), ...starts, ...rest].slice(0, limit);
  }

  private snippet(text: string, termsLow: string[], termRes: RegExp[]): string {
    const low = text.toLowerCase();
    let pos = -1;
    for (const t of termsLow) {
      const i = low.indexOf(t);
      if (i >= 0 && (pos < 0 || i < pos)) pos = i;
    }
    const start = Math.max(0, (pos < 0 ? 0 : pos) - 90);
    const part = text.slice(start, start + 320);
    let html = esc(part);
    for (const re of termRes) {
      re.lastIndex = 0;
      html = html.replace(re, m => `<mark>${m}</mark>`);
    }
    return (start > 0 ? '… ' : '') + html + (start + 320 < text.length ? ' …' : '');
  }
}
