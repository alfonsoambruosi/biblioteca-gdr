import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LibraryService } from './library.service';

/** Ricerca che guarda solo nelle schede del bestiario. */
@Component({
  selector: 'app-bestiary-search',
  imports: [RouterLink],
  template: `
    <div class="bestiary-search">
      <input
        type="search"
        class="filter"
        placeholder="Cerca solo nel bestiario…"
        aria-label="Cerca nel bestiario"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    </div>

    @if (query().trim()) {
      <p class="muted">{{ hits().length }} risultati nel bestiario per "{{ query().trim() }}"</p>
      @for (h of hits(); track $index) {
        <a class="hit" [routerLink]="['/doc', h.docId]" [fragment]="h.anchor">
          <small class="path">{{ h.path ? h.path + ' › ' : '' }}{{ h.docName }}</small>
          <strong>{{ h.heading }}</strong>
          <span [innerHTML]="h.snippet"></span>
        </a>
      } @empty {
        <p>Nessun risultato nel bestiario.</p>
      }
    }
  `,
})
export class BestiarySearchComponent {
  private library = inject(LibraryService);
  readonly query = signal('');

  readonly hits = computed(() => {
    this.library.version();
    const q = this.query().trim();
    return q ? this.library.search(q, 150, 'bestiary') : [];
  });
}
