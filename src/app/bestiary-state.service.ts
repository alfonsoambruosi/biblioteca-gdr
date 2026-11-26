import { Injectable, signal } from '@angular/core';
import { CR_OPTIONS } from './bestiary-index';
import { EncounterSlot, EncounterStyle } from './encounter-gen';

export type BestiaryViewMode = 'catalog' | 'encounter' | 'folders';
export type BestiarySortMode = 'name-asc' | 'name-desc' | 'cr-asc' | 'cr-desc';

export const BESTIARY_PAGE_SIZE = 100;

/**
 * Conserva lo stato del Bestiario e dell'ultimo incontro generato durante la sessione,
 * così tornando indietro da una scheda creatura si ritrova esattamente la stessa scheda,
 * gli stessi filtri e lo stesso incontro.
 */
@Injectable({ providedIn: 'root' })
export class BestiaryStateService {
  readonly mode = signal<BestiaryViewMode>('catalog');

  // Filtri del catalogo
  readonly rawQuery = signal('');
  readonly query = signal('');
  readonly category = signal('');
  readonly subcategory = signal('');
  readonly crMinIdx = signal(0);
  readonly crMaxIdx = signal(CR_OPTIONS.length - 1);
  readonly env = signal('');
  readonly size = signal('');
  readonly letter = signal('');
  readonly sort = signal<BestiarySortMode>('name-asc');
  readonly limit = signal(BESTIARY_PAGE_SIZE);

  // Stato del generatore di incontri
  readonly players = signal(4);
  readonly partyLevel = signal(5);
  readonly diffOffset = signal(1);
  readonly encStyle = signal<EncounterStyle>('random');
  readonly encCategory = signal('');
  readonly encSubcategory = signal('');
  readonly encEnv = signal('');
  readonly encSize = signal('');
  readonly encSlots = signal<EncounterSlot[]>([]);
  readonly encTried = signal(false);
}
