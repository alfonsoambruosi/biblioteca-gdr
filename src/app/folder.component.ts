import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { IconComponent, iconFor } from './icon.component';
import { LibraryService } from './library.service';
import { LookupService, isDocNode } from './lookup.service';
import { BestiarySearchComponent } from './bestiary-search.component';

@Component({
  selector: 'app-folder',
  imports: [RouterLink, IconComponent, BestiarySearchComponent],
  template: `
    <nav class="crumbs" aria-label="Percorso">
      <a routerLink="/">Home</a>
      @for (n of crumbs(); track n.id) {
        <span>›</span>
        <a [routerLink]="['/cartella', n.id]">{{ n.name }}</a>
      }
    </nav>

    @if (folder(); as f) {
      <h1 class="card-title"><app-icon [name]="icon(f.name)" />{{ f.name }}</h1>

      @if (inBestiary()) {
        <app-bestiary-search />
      }

      @if (folders().length) {
        <div class="cards">
          @for (c of folders(); track c.id) {
            <a class="card" [routerLink]="['/cartella', c.id]">
              <strong class="card-title"><app-icon [name]="icon(c.name)" />{{ c.name }}</strong>
              <span class="muted">{{ lookup.countFiles(c) }} documenti</span>
            </a>
          }
        </div>
      }

      @if (files().length) {
        <ul class="list">
          @for (d of files(); track d.id) {
            <li><a [routerLink]="['/doc', d.id]"><app-icon [name]="icon(d.name, false)" />{{ d.name }}</a></li>
          }
        </ul>
      } @else if (!folders().length) {
        <p class="muted">Cartella vuota.</p>
      }
    } @else {
      <p class="muted">{{ library.tree() ? 'Cartella non trovata.' : 'Caricamento…' }}</p>
    }
  `,
})
export class FolderComponent {
  readonly library = inject(LibraryService);
  readonly lookup = inject(LookupService);
  readonly icon = iconFor;
  private route = inject(ActivatedRoute);

  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), {
    initialValue: '',
  });

  readonly folder = computed(() => {
    this.library.tree();
    const n = this.library.node(this.id());
    return n?.kind === 'folder' ? n : undefined;
  });

  readonly crumbs = computed(() => {
    this.library.tree();
    return this.library.pathOf(this.id());
  });

  readonly inBestiary = computed(() => {
    this.library.tree();
    return this.library.isBestiary(this.id());
  });

  readonly folders = computed(() =>
    (this.folder()?.children ?? []).filter(c => c.kind === 'folder')
  );

  readonly files = computed(() => (this.folder()?.children ?? []).filter(c => isDocNode(c)));
}
