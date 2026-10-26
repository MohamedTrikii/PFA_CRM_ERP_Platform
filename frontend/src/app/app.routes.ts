import { Routes } from '@angular/router';

export const routes: Routes = [
  // ── Auth callbacks (no shell wrapper) ────────────────────────────────────
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

  // ── Public site pages (no auth — use PublicLayoutComponent as wrapper) ──
  {
    path: 'accueil',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent) },
    ],
  },
  {
    path: 'a-propos',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/about/about.component').then(m => m.AboutComponent) },
    ],
  },
  {
    path: 'galerie',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/gallery/gallery.component').then(m => m.GalleryComponent) },
    ],
  },
  {
    path: 'nos-services',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/services/services-page.component').then(m => m.ServicesPageComponent) },
    ],
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/contact/contact.component').then(m => m.ContactComponent) },
    ],
  },

  // ── Public quote request (standalone, no layout) ─────────────────────────
  {
    path: 'portal/quote-request',
    loadComponent: () =>
      import('./features/portal/quote-request/quote-request.component').then(m => m.QuoteRequestComponent),
  },

  // ── All authenticated routes inside the Shell (sidenav + toolbar) ────────
  {
    path: '',
    loadChildren: () =>
      import('./layout/shell.routes').then(m => m.SHELL_ROUTES),
  },

  // ── Catch-all → 404 page ─────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./core/auth/not-found.component').then(m => m.NotFoundComponent),
  },
];
