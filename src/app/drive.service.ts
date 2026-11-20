import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { NodeKind, TreeNode } from './models';

const API = 'https://www.googleapis.com/drive/v3';
const MIME_FOLDER = 'application/vnd.google-apps.folder';
const MIME_GDOC = 'application/vnd.google-apps.document';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

/** Unisce in un solo documento i file che corrispondono a una regola di `mergeGroups`. */
export function mergeGroups(nodes: TreeNode[]): TreeNode[] {
  let out = nodes;
  for (const g of environment.mergeGroups) {
    const parts = out
      .filter(n => n.kind !== 'folder' && g.pattern.test(n.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    if (parts.length < 2) continue;
    const merged: TreeNode = {
      id: `merge:${parts.map(p => p.id).join('+')}`,
      name: g.name,
      kind: 'docx',
      modifiedTime: parts.map(p => p.modifiedTime ?? '').join('+'),
      size: String(parts.reduce((a, p) => a + Number(p.size ?? 0), 0)),
      parts,
    };
    out = [...out.filter(n => !parts.includes(n)), merged];
  }
  return out;
}

/** Nome da mostrare: senza estensione del file (.docx, .pdf, .md, ...). */
export function displayName(name: string): string {
  return name.replace(/\.(docx?|dotx?|odt|rtf|pdf|md|txt|xlsx?|pptx?|gdoc)$/i, '').trim();
}

/** Richieste a Drive contemporanee: evita di saturare la rete e i limiti di Google. */
const MAX_CONCURRENT = 2;
/** Pause tra un tentativo e il successivo, in millisecondi (errori temporanei). */
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];
let active = 0;
const waiting: Array<() => void> = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>(r => waiting.push(r));
  else active++;
  try {
    return await fn();
  } finally {
    // passa il posto al prossimo in coda, oppure lo libera
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

@Injectable({ providedIn: 'root' })
export class DriveService {
  private key = environment.apiKey;

  get configured(): boolean {
    return !!this.key && !this.key.startsWith('INSERISCI');
  }

  /**
   * Chiamata a Drive con limite di contemporaneità e nuovi tentativi
   * per errori di rete, 429 (troppe richieste) e 5xx.
   */
  private async request(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await slot(() => fetch(url));
      } catch {
        // rete assente o interrotta: "failed to fetch"
        if (attempt >= RETRY_DELAYS.length) {
          throw new Error(
            'Connessione a Google Drive non riuscita dopo più tentativi. Controlla la rete: resta disponibile la copia salvata.'
          );
        }
        await pause(RETRY_DELAYS[attempt]);
        continue;
      }
      if (res.ok) return res;
      let limited = false;
      if (res.status === 403) {
        // Google usa 403 anche per i limiti di richieste
        limited = /rateLimit|quota/i.test(await res.clone().text().catch(() => ''));
      }
      if ((retryable(res.status) || limited) && attempt < RETRY_DELAYS.length) {
        await pause(RETRY_DELAYS[attempt]);
        continue;
      }
      return res;
    }
  }

  private async getJson(url: string): Promise<any> {
    const res = await this.request(url);
    if (!res.ok) throw new Error(await this.explain(res));
    return res.json();
  }

  private async explain(res: Response): Promise<string> {
    let detail = '';
    try {
      const j = await res.clone().json();
      detail = j?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    if (res.status === 403 || res.status === 404) {
      return `Drive ha risposto ${res.status}. ${detail} Controlla che la cartella/file sia condiviso come "Chiunque abbia il link" e che la chiave API sia corretta.`;
    }
    return `Drive ha risposto ${res.status}. ${detail}`;
  }

  private async listChildren(folderId: string): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken = '';
    do {
      const p = new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
        pageSize: '1000',
        orderBy: 'name',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        key: this.key,
      });
      if (pageToken) p.set('pageToken', pageToken);
      const j = await this.getJson(`${API}/files?${p}`);
      files.push(...(j.files ?? []));
      pageToken = j.nextPageToken ?? '';
    } while (pageToken);
    return files;
  }

  private kindOf(f: DriveFile): NodeKind {
    if (f.mimeType === MIME_FOLDER) return 'folder';
    if (f.mimeType === MIME_GDOC) return 'gdoc';
    if (f.mimeType === MIME_DOCX || /\.docx$/i.test(f.name)) return 'docx';
    if (f.mimeType.startsWith('text/') || /\.(md|txt)$/i.test(f.name)) return 'text';
    return 'other';
  }

  /** Legge tutta la struttura di cartelle e file, in modo ricorsivo. */
  async buildTree(rootId: string, name = 'Biblioteca'): Promise<TreeNode> {
    const root: TreeNode = { id: rootId, name, kind: 'folder', children: [] };
    const kids = await this.listChildren(rootId);
    const nodes = await Promise.all(
      kids.map(async f => {
        const kind = this.kindOf(f);
        if (kind === 'folder') return this.buildTree(f.id, f.name);
        const n: TreeNode = { id: f.id, name: displayName(f.name), kind, modifiedTime: f.modifiedTime, size: f.size };
        return n;
      })
    );
    root.children = mergeGroups(nodes).sort((a, b) => {
      if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
    });
    return root;
  }

  async downloadBinary(node: TreeNode): Promise<ArrayBuffer> {
    let url: string;
    if (node.kind === 'gdoc') {
      const p = new URLSearchParams({ mimeType: MIME_DOCX, key: this.key });
      url = `${API}/files/${node.id}/export?${p}`;
    } else {
      const p = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true', key: this.key });
      url = `${API}/files/${node.id}?${p}`;
    }
    const res = await this.request(url);
    if (!res.ok) throw new Error(await this.explain(res));
    return res.arrayBuffer();
  }

  async downloadText(node: TreeNode): Promise<string> {
    const p = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true', key: this.key });
    const res = await this.request(`${API}/files/${node.id}?${p}`);
    if (!res.ok) throw new Error(await this.explain(res));
    return res.text();
  }
}
