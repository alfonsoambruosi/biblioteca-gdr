import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LibraryService } from './library.service';

@Component({
  selector: 'app-search',
  imports: [RouterLink],
  template: `
    <h1>Ricerca</h1>

    @if (!q()) {
      <p class="muted">Scrivi una o più parole nella barra in alto.</p>
    } @else {
      <p class="muted">{{ hits().length }} risultati per "{{ q() }}"</p>

      @for (h of hits(); track $index) {
        <a class="hit" [routerLink]="['/doc', h.docId]" [fragment]="h.anchor">
          <small class="path">{{ h.path ? h.path + ' › ' : '' }}{{ h.docName }}</small>
          <strong>{{ h.heading }}</strong>
          <span [innerHTML]="h.snippet"></span>
        </a>
      } @empty {
        <p>Nessun risultato.</p>
      }
    }
  `,
})
export class SearchComponent {
  private library = inject(LibraryService);
  private route = inject(ActivatedRoute);

  readonly q = toSignal(this.route.queryParamMap.pipe(map(p => (p.get('q') ?? '').trim())), {
    initialValue: '',
  });

  readonly hits = computed(() => {
    this.library.version();
    return this.library.search(this.q());
  });
}
