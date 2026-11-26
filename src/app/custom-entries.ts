import { DocMeta, TreeNode } from './models';

/**
 * Voci editoriali aggiunte direttamente dal sito (non presenti come sezione dedicata nel Drive).
 * Restano separate dagli snapshot e dalla sincronizzazione Drive così da non essere mai sovrascritte.
 */
export const CUSTOM_DOC_ID = 'site:custom-metamagic';
export const CUSTOM_DOC_NAME = 'Metamagic Feats (aggiunte del sito)';

export interface CustomEntry {
  id: string;
  heading: string;
  level: number;
  kind: 'metamagia';
  adj: number | null;
  text: string;
  html: string;
}

export const CUSTOM_ENTRIES: CustomEntry[] = [
  {
    id: 'custom-effect-specific-spell',
    heading: 'Effect-Specific Spell [Metamagic]',
    level: 3,
    kind: 'metamagia',
    adj: -2,
    text:
      'Prerequisite: Game designer (only)—not for PCs.\n' +
      'Benefit: An effect-specific spell restricts a broad base spell to a single narrow application or effect, preventing it from being used for any of its other normal functions. For example, applying this feat to Figment so it can only create a wall (as in Illusory Wall), to Enhancement so it applies only to weapon attacks and damage (as in Divine Favor), or to Compel so it only prevents lying (as in Zone of Truth).\n' +
      'Metamagic Cost: -1 to -2 levels, depending on how narrowly the spell’s versatility is restricted (-2 levels for a single very specific effect; -1 level for a broader but still limited subset of effects).\n' +
      'Special: Like Creature-Specific Spell, this “feat” is used in spell construction formulas to show why specialized spells are lower level than their flexible base seeds. It is not intended as a standard feat selectable by PCs.\n' +
      'Editor’s Note: This description was added by the site for clarity and is not original Kirthfinder text.',
    html:
      '<h3 id="custom-effect-specific-spell">Effect-Specific Spell [Metamagic]</h3>' +
      '<p><strong>Prerequisite:</strong> Game designer (only)—not for PCs.</p>' +
      '<p><strong>Benefit:</strong> An effect-specific spell restricts a broad base spell to a single narrow application or effect, preventing it from being used for any of its other normal functions. For example, applying this feat to <em>Figment</em> so it can only create a wall (as in <em>Illusory Wall</em>), to <em>Enhancement</em> so it applies only to weapon attacks and damage (as in <em>Divine Favor</em>), or to <em>Compel</em> so it only prevents lying (as in <em>Zone of Truth</em>).</p>' +
      '<p><strong>Metamagic Cost:</strong> -1 to -2 levels, depending on how narrowly the spell’s versatility is restricted (-2 levels for a single very specific effect; -1 level for a broader but still limited subset of effects).</p>' +
      '<p><strong>Special:</strong> Like <em>Creature-Specific Spell</em>, this “feat” is used in spell construction formulas to show why specialized spells are lower level than their flexible base seeds. It is not intended as a standard feat selectable by PCs.</p>' +
      '<p class="muted"><em>Editor’s Note: This description was added by the site for clarity and is not original Kirthfinder text.</em></p>',
  },
];

export const CUSTOM_TREE_NODE: TreeNode = {
  id: CUSTOM_DOC_ID,
  name: CUSTOM_DOC_NAME,
  kind: 'text',
  modifiedTime: 'site',
};

export const CUSTOM_DOC_META: DocMeta = {
  id: CUSTOM_DOC_ID,
  name: CUSTOM_DOC_NAME,
  modifiedTime: 'site',
  size: '0',
  sections: CUSTOM_ENTRIES.map(e => ({
    id: e.id,
    heading: e.heading,
    level: e.level,
    text: e.text,
  })),
};

export function customEntryHtml(anchor: string): string {
  const entry = CUSTOM_ENTRIES.find(e => e.id === anchor);
  return entry ? entry.html.replace(/\s+id="[^"]*"/, '') : '';
}

export function customDocHtml(): string {
  return CUSTOM_ENTRIES.map(e => e.html).join('\n<hr>\n');
}
