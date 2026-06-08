import { Routes } from '@angular/router';
import { ShellComponent } from './shell.component';
import { authGuard }      from '../core/guards/auth.guard';
import { roleGuard }      from '../core/guards/role.guard';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      // ── Admin ──────────────────────────────────────────────────────────────
      {
        path: 'admin/users',
        loadComponent: () =>
          import('../features/admin/users/user-management.component').then(m => m.UserManagementComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER'])],
      },
      {
        path: 'admin/tenants',
        loadComponent: () =>
          import('../features/admin/tenants/tenant-management.component').then(m => m.TenantManagementComponent),
        canActivate: [roleGuard(['SUPER_ADMIN'])],
      },
      {
        path: 'admin/audit',
        loadComponent: () =>
          import('../features/admin/audit/audit-log.component').then(m => m.AuditLogComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER'])],
      },
      // ── CRM ───────────────────────────────────────────────────────────────
      {
        path: 'crm/prospects',
        loadComponent: () =>
          import('../features/crm/prospects/prospect-list.component').then(m => m.ProspectListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      { path: 'crm', redirectTo: 'crm/prospects', pathMatch: 'full' },
      // ── Sales ─────────────────────────────────────────────────────────────
      {
        path: 'sales/products',
        loadComponent: () =>
          import('../features/sales/products/product-catalog.component').then(m => m.ProductCatalogComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER'])],
      },
      {
        path: 'sales/devis',
        loadComponent: () =>
          import('../features/sales/devis/devis-list.component').then(m => m.DevisListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'sales/factures',
        loadComponent: () =>
          import('../features/sales/factures/facture-list.component').then(m => m.FactureListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'sales/commandes',
        loadComponent: () =>
          import('../features/sales/commandes/commande-list.component').then(m => m.CommandeListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'sales/livraisons',
        loadComponent: () =>
          import('../features/sales/livraisons/livraison-list.component').then(m => m.LivraisonListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      { path: 'sales', redirectTo: 'sales/devis', pathMatch: 'full' },
      // ── Inventory ─────────────────────────────────────────────────────────
      {
        path: 'inventory/stock',
        loadComponent: () =>
          import('../features/inventory/stock/stock-management.component').then(m => m.StockManagementComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'inventory/movements',
        loadComponent: () =>
          import('../features/inventory/movements/movement-history.component').then(m => m.MovementHistoryComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      { path: 'inventory', redirectTo: 'inventory/stock', pathMatch: 'full' },
      // ── Achats ────────────────────────────────────────────────────────────
      {
        path: 'achats/fournisseurs',
        loadComponent: () =>
          import('../features/achats/fournisseur-list/fournisseur-list.component').then(m => m.FournisseurListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'achats/bons-commande',
        loadComponent: () =>
          import('../features/achats/bon-commande-list/bon-commande-list.component').then(m => m.BonCommandeListComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      {
        path: 'achats/aging',
        loadComponent: () =>
          import('../features/achats/facture-aging/facture-aging.component').then(m => m.FactureAgingComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER'])],
      },
      { path: 'achats', redirectTo: 'achats/bons-commande', pathMatch: 'full' },
      // ── CMS / Branding ────────────────────────────────────────────────────
      {
        path: 'admin/branding',
        loadComponent: () =>
          import('../features/cms/branding-settings/branding-settings.component').then(m => m.BrandingSettingsComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER'])],
      },
      {
        path: 'admin/platform',
        loadComponent: () =>
          import('../features/cms/super-admin-dashboard/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent),
        canActivate: [roleGuard(['SUPER_ADMIN'])],
      },
      // ── AI Assistant ──────────────────────────────────────────────────────
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('../features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
        canActivate: [roleGuard(['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE'])],
      },
      // ── Portal (authenticated clients) ────────────────────────────────────
      {
        path: 'portal/dashboard',
        loadComponent: () =>
          import('../features/portal/customer-portal/customer-portal.component').then(m => m.CustomerPortalComponent),
        canActivate: [roleGuard(['CLIENT'])],
      },
      { path: 'portal', redirectTo: 'portal/dashboard', pathMatch: 'full' },
    ],
  },
];
