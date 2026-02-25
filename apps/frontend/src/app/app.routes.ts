import { Routes } from '@angular/router';

import { authGuard, adminGuard, userGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/user-list.component').then((m) => m.UserListComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'shoes',
        loadComponent: () =>
          import('./features/shoes/shoes-overview.component').then((m) => m.ShoesOverviewComponent),
        canActivate: [userGuard],
      },
      {
        path: 'shoes/new',
        loadComponent: () =>
          import('./features/shoes/shoe-form.component').then((m) => m.ShoeFormComponent),
        canActivate: [userGuard],
      },
      {
        path: 'shoes/:id/edit',
        loadComponent: () =>
          import('./features/shoes/shoe-form.component').then((m) => m.ShoeFormComponent),
        canActivate: [userGuard],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
