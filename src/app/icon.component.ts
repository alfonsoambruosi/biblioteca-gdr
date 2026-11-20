import { Component, input } from '@angular/core';

export type IconKey = 'dragon' | 'shield' | 'scroll' | 'spell' | 'gem' | 'lantern' | 'people' | 'book' | 'folder';

/** Sceglie l'icona in base alle parole del nome, es. "Bestiary" -> testa di drago. */
export function iconFor(name: string, isFolder = true): IconKey {
  const n = name.toLowerCase();
  if (/bestiar|mostri|creature|monster/.test(n)) return 'dragon';
  if (/class/.test(n)) return 'shield';
  if (/skill|feat|talent|abilit/.test(n)) return 'scroll';
  if (/spell|incantesim|magia|grimoire|\bch\s?8/.test(n)) return 'spell';
  if (/magic item|oggett|tesor|item/.test(n)) return 'gem';
  if (/lumen/.test(n)) return 'lantern';
  if (/razz|race|specie|people/.test(n)) return 'people';
  return isFolder ? 'folder' : 'book';
}

@Component({
  selector: 'app-icon',
  template: `
    @switch (name()) {
      @case ('dragon') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 15.5c2.2-.6 3.3-2.6 4.2-4.8L10 9.6l1-3.9 2 2.2 3.1.9-1 2.1c2.2 1.1 3.9 3.1 4.8 5.9-2.1 1.8-5.1 1.9-7.2.9l-1.9 2.8-1.8-2.9c-2.4-.1-4.6-.9-5.7-1.2z"/><path d="M11 9.6 9.2 5.6M13.4 10.5l1.2-2.7"/><circle cx="14.6" cy="11.3" r=".9"/></svg>
      }
      @case ('shield') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M12 7.5v8M9 10.5h6"/></svg>
      }
      @case ('scroll') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h11v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
      }
      @case ('spell') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 14 10"/><path d="M14.5 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M19 12.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/></svg>
      }
      @case ('gem') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/></svg>
      }
      @case ('lantern') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5v2.5M8.5 7.5h7l-.8 9.5H9.3z"/><path d="M9.5 21h5M10.2 17h3.6"/><path d="M10.5 10.5h3v3h-3z"/></svg>
      }
      @case ('people') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20.5c1-4 3.8-6 7-6s6 2 7 6"/></svg>
      }
      @case ('book') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M9 8h6"/></svg>
      }
      @default {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      }
    }
  `,
  styles: [
    `:host { display: inline-flex; flex: none; width: 1.35em; height: 1.35em; color: var(--wax); }
     svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
     circle { fill: currentColor; stroke: none; }`,
  ],
})
export class IconComponent {
  readonly name = input.required<IconKey>();
}
