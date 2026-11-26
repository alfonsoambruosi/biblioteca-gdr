import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { ShellComponent } from './shell.component';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  {
    path: 'accesso',
    loadComponent: () => import('./login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
    title: 'Accesso · Biblioteca GDR',
  },
  {
    // Tutte le pagine della biblioteca passano dal login.
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent, title: 'Biblioteca GDR' },
      { path: 'cartella/:id', loadComponent: () => import('./folder.component').then(m => m.FolderComponent), title: 'Cartella · Biblioteca GDR' },
      { path: 'doc/:id', loadComponent: () => import('./doc.component').then(m => m.DocComponent), title: 'Documento · Biblioteca GDR' },
      { path: 'scheda/:id', loadComponent: () => import('./sheet.component').then(m => m.SheetComponent), title: 'Scheda personaggio · Biblioteca GDR' },
      { path: 'cerca', loadComponent: () => import('./search.component').then(m => m.SearchComponent), title: 'Ricerca · Biblioteca GDR' },
      { path: 'incantesimi', loadComponent: () => import('./spellbook.component').then(m => m.SpellbookComponent), title: 'Incantesimi · Biblioteca GDR' },
      { path: 'bestiario', loadComponent: () => import('./bestiary.component').then(m => m.BestiaryComponent), title: 'Bestiario · Biblioteca GDR' },
      { path: 'oggetti', loadComponent: () => import('./item-calc.component').then(m => m.ItemCalcComponent), title: 'Oggetti magici · Biblioteca GDR' },
    ],
  },
  { path: '**', redirectTo: '' },
];
