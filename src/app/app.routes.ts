import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { LoginComponent } from './login.component';
import { ShellComponent } from './shell.component';
import { HomeComponent } from './home.component';
import { FolderComponent } from './folder.component';
import { DocComponent } from './doc.component';
import { SearchComponent } from './search.component';
import { SpellbookComponent } from './spellbook.component';
import { ItemCalcComponent } from './item-calc.component';

export const routes: Routes = [
  {
    path: 'accesso',
    component: LoginComponent,
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
      { path: 'cartella/:id', component: FolderComponent },
      { path: 'doc/:id', component: DocComponent },
      { path: 'cerca', component: SearchComponent },
      { path: 'incantesimi', component: SpellbookComponent },
      { path: 'oggetti', component: ItemCalcComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
