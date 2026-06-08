import { Routes } from '@angular/router';

export const routes: Routes = [
  // Auth callbacks (no shell wrapper)
  {
    path: 'auth',
    loadChildren: () =>
      import('./core/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./core/auth/forbidden.component').then(m => m.ForbiddenComponent),
  },
  // Public portal routes (no auth required — no shell wrapper)
  {
    path: 'portal/quote-request',
    loadComponent: () =>
      import('./features/portal/quote-request/quote-request.component').then(m => m.QuoteRequestComponent),
  },
  // All authenticated routes live inside the Shell (sidenav + toolbar)
  {
    path: '',
    loadChildren: () =>
      import('./layout/shell.routes').then(m => m.SHELL_ROUTES),
  },
  // Catch-all: any unknown route goes home (prevents NG04002 crash)
  { path: '**', redirectTo: '' },
];
