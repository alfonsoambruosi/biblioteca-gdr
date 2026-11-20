import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, iconFor } from './icon.component';
import { LibraryService } from './library.service';
import { LookupService, isDocNode } from './lookup.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent],
  template: `
    <h1>Biblioteca</h1>
    <p class="muted">Scegli una categoria.</p>

    @if (!library.tree()) {
      <p class="muted">Caricamento…</p>
    }

    <div class="cards">
      @for (c of categories(); track c.id) {
        <a class="card" [routerLink]="['/cartella', c.id]">
          <strong class="card-title"><app-icon [name]="icon(c.name)" />{{ c.name }}</strong>
          <span class="muted">{{ lookup.countFiles(c) }} documenti</span>
        </a>
      }
      <a class="card" routerLink="/incantesimi">
        <strong class="card-title"><app-icon [name]="'spell'" />Incantesimi per classe</strong>
        <span class="muted">Liste e livelli</span>
      </a>
    </div>

    <details class="admin-box">
      <summary>Copia per il caricamento rapido</summary>
      <p class="muted">
        Scarica un file con tutti i documenti salvati su questo dispositivo. Copialo in
        <code>src/assets/</code> (sono più file, da 15 MB ciascuno) e pubblica di nuovo il sito: i nuovi dispositivi
        apriranno la biblioteca in pochi secondi, senza scaricare tutto dal Drive.
      </p>
      <button
        type="button"
        class="ghost"
        (click)="library.exportSnapshot()"
        [disabled]="!library.tree() || library.exporting() === 'working'"
      >
        {{ library.exporting() === 'working' ? 'Preparo il file…' : 'Scarica la copia' }}
      </button>
      @if (library.exportInfo()) {
        <p role="status" [class.error]="library.exporting() === 'error'">{{ library.exportInfo() }}</p>
      }
    </details>

    @if (looseFiles().length) {
      <h2>Altri file</h2>
      <ul class="list">
        @for (f of looseFiles(); track f.id) {
          <li><a [routerLink]="['/doc', f.id]"><app-icon [name]="icon(f.name, false)" />{{ f.name }}</a></li>
        }
      </ul>
    }
  `,
})
export class HomeComponent {
  readonly library = inject(LibraryService);
  readonly lookup = inject(LookupService);
  readonly icon = iconFor;

  readonly categories = computed(() =>
    (this.library.tree()?.children ?? []).filter(c => c.kind === 'folder')
  );

  readonly looseFiles = computed(() =>
    (this.library.tree()?.children ?? []).filter(c => isDocNode(c))
  );
}
