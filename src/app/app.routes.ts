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
      { path: '', component: HomeComponent },
      { path: 'cartella/:id', loadComponent: () => import('./folder.component').then(m => m.FolderComponent) },
      { path: 'doc/:id', loadComponent: () => import('./doc.component').then(m => m.DocComponent) },
      { path: 'cerca', loadComponent: () => import('./search.component').then(m => m.SearchComponent) },
      { path: 'incantesimi', loadComponent: () => import('./spellbook.component').then(m => m.SpellbookComponent) },
      { path: 'oggetti', loadComponent: () => import('./item-calc.component').then(m => m.ItemCalcComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
