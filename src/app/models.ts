export type NodeKind = 'folder' | 'docx' | 'gdoc' | 'text' | 'other';

export interface TreeNode {
  id: string;
  name: string;
  kind: NodeKind;
  modifiedTime?: string;
  size?: string;
  children?: TreeNode[];
  /** Documento unito: i file originali, letti uno dopo l'altro. */
  parts?: TreeNode[];
}

/** Una sezione = un titolo (o una voce di spell) con tutto il testo che lo segue. */
export interface Section {
  id: string;        // id dell'elemento nel documento, es. "s-12"
  heading: string;
  level: number;     // 1..6
  text: string;      // testo integrale, usato per la ricerca
}

export interface DocMeta {
  id: string;
  name: string;
  modifiedTime: string;
  size: string;
  /** Versione del lettore con cui è stato letto: se cambia, il documento viene riletto. */
  parser?: number;
  sections: Section[];
}

export interface SearchHit {
  docId: string;
  docName: string;
  path: string;
  anchor: string;
  heading: string;
  snippet: string;   // HTML già escapato, con <mark>
}

/** Copia precompilata dei documenti (assets/snapshot-N.jsonl), caricata al primo accesso. */
export interface Snapshot {
  generatedAt: string;
  tree: TreeNode;
  docs: Record<string, { meta: DocMeta; html: string }>;
}
