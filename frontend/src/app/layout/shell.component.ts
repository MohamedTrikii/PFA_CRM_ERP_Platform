import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgFor, NgIf }    from '@angular/common';
import { MatIconModule }             from '@angular/material/icon';
import { MatButtonModule }           from '@angular/material/button';
import { MatTooltipModule }          from '@angular/material/tooltip';
import { OidcSecurityService }       from 'angular-auth-oidc-client';
import { Observable, map }           from 'rxjs';
import { CmsService }                from '../core/services/cms.service';
import { AuthContextService }        from '../core/services/auth-context.service';
import { applyBrandingCssVars }      from '../features/cms/branding-settings/branding-settings.component';
import { NoticeBannerComponent }     from '../core/components/notice-banner/notice-banner.component';

interface NavItem    { label: string; icon: string; route: string; roles: string[]; }
interface NavSection { label: string; items: NavItem[]; }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'GÉNÉRAL',
    items: [
      { label: 'Tableau de bord', icon: 'dashboard',    route: '/dashboard',        roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT'] },
      { label: 'Mon espace',      icon: 'person',        route: '/portal/dashboard', roles: ['CLIENT'] },
    ],
  },
  {
    label: 'VENTES',
    items: [
      { label: 'CRM & Prospects',  icon: 'contacts',        route: '/crm',                roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Catalogue',        icon: 'category',        route: '/sales/products',     roles: ['SUPER_ADMIN','EMPLOYER'] },
      { label: 'Devis',            icon: 'receipt_long',    route: '/sales/devis',        roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Commandes',        icon: 'shopping_bag',    route: '/sales/commandes',    roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Factures',         icon: 'description',     route: '/sales/factures',     roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Livraisons',       icon: 'local_shipping',  route: '/sales/livraisons',   roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { label: 'Stock',           icon: 'warehouse',       route: '/inventory/stock',      roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Mouvements',     icon: 'inventory_2',     route: '/inventory/movements',  roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Fournisseurs',   icon: 'store',           route: '/achats/fournisseurs',  roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Bons commande',  icon: 'shopping_cart',   route: '/achats/bons-commande', roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
      { label: 'Créances',       icon: 'account_balance', route: '/achats/aging',         roles: ['SUPER_ADMIN','EMPLOYER'] },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Utilisateurs',    icon: 'people',               route: '/admin/users',     roles: ['SUPER_ADMIN','EMPLOYER'] },
      { label: 'Tenants',         icon: 'business',             route: '/admin/tenants',   roles: ['SUPER_ADMIN'] },
      { label: "Journal d'audit", icon: 'history',              route: '/admin/audit',     roles: ['SUPER_ADMIN','EMPLOYER'] },
      { label: 'Personnalisation',icon: 'palette',              route: '/admin/branding',  roles: ['SUPER_ADMIN','EMPLOYER'] },
      { label: 'Plateforme',      icon: 'admin_panel_settings', route: '/admin/platform',  roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Assistant IA', icon: 'smart_toy', route: '/ai-assistant', roles: ['SUPER_ADMIN','EMPLOYER','EMPLOYEE'] },
    ],
  },
];

@Component({
  selector: 'erp-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    AsyncPipe, NgFor, NgIf,
    MatIconModule, MatButtonModule, MatTooltipModule,
    NoticeBannerComponent,
  ],
  styles: [`
    :host {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 2px 0 16px rgba(0,0,0,.28);
      z-index: 10;
    }

    .sidebar-logo {
      padding: 1.25rem 1.125rem 1rem;
      display: flex;
      align-items: center;
      gap: .75rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }

    .logo-icon {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-text  { font-size: .9375rem; font-weight: 700; color: #f1f5f9; letter-spacing: -.01em; line-height: 1.2; }
    .logo-sub   { font-size: .625rem; color: var(--sidebar-text-dim); letter-spacing: .08em; text-transform: uppercase; }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: .625rem 0 .5rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.08) transparent;
      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 4px; }
    }

    .nav-section-label {
      padding: .875rem 1.25rem .3rem;
      font-size: .625rem;
      font-weight: 700;
      letter-spacing: .1em;
      color: var(--sidebar-text-dim);
      text-transform: uppercase;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: .625rem;
      padding: .5625rem 1.25rem;
      margin: 1px .5rem;
      border-radius: 8px;
      color: var(--sidebar-text);
      font-size: .875rem;
      font-weight: 500;
      text-decoration: none;
      transition: background 160ms ease, color 160ms ease;
      cursor: pointer;
      user-select: none;
      position: relative;

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        opacity: .6;
        flex-shrink: 0;
        transition: opacity 160ms;
      }

      &:hover {
        background: var(--sidebar-hover);
        color: #e2e8f0;
        mat-icon { opacity: .9; }
      }

      &.active {
        background: rgba(37,99,235,.22);
        color: #93c5fd;

        mat-icon { opacity: 1; color: #93c5fd; }

        &::before {
          content: '';
          position: absolute;
          left: -.5rem;
          top: 25%;
          bottom: 25%;
          width: 3px;
          background: #3b82f6;
          border-radius: 0 3px 3px 0;
        }
      }
    }

    /* ── Sidebar footer ── */
    .sidebar-footer {
      border-top: 1px solid rgba(255,255,255,.06);
      padding: .875rem 1rem;
      display: flex;
      align-items: center;
      gap: .625rem;
      flex-shrink: 0;
    }

    .user-avatar {
      width: 2.125rem;
      height: 2.125rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .8125rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      letter-spacing: .02em;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: .8125rem;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .user-email {
      font-size: .6875rem;
      color: var(--sidebar-text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .logout-btn {
      color: var(--sidebar-text-dim) !important;
      transition: color 160ms !important;
      flex-shrink: 0;
      &:hover { color: #f87171 !important; }
    }

    /* ── Main area ── */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .topbar {
      background: var(--clr-surface);
      border-bottom: 1px solid var(--clr-border);
      padding: 0 1.75rem;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }

    .topbar-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--clr-text);
      letter-spacing: -.01em;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .8125rem;
      color: var(--clr-text-2);
      font-weight: 500;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }

    .content-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--clr-bg);
    }
  `],
  template: `
    <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
    <aside class="sidebar">

      <div class="sidebar-logo">
        <div class="logo-icon">
          <mat-icon style="color:#fff;font-size:1.25rem;width:1.25rem;height:1.25rem">hub</mat-icon>
        </div>
        <div>
          <div class="logo-text">{{ companyName }}</div>
          <div class="logo-sub">ERP Platform</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <ng-container *ngFor="let section of visibleSections$ | async">
          <div class="nav-section-label">{{ section.label }}</div>
          <a *ngFor="let item of section.items"
             class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        </ng-container>
      </nav>

      <div class="sidebar-footer">
        <div class="user-avatar">{{ initials$ | async }}</div>
        <div class="user-info">
          <div class="user-name">{{ fullName$ | async }}</div>
          <div class="user-email">{{ email$ | async }}</div>
        </div>
        <button mat-icon-button class="logout-btn"
                (click)="logout()"
                matTooltip="Déconnexion"
                matTooltipPosition="above">
          <mat-icon>logout</mat-icon>
        </button>
      </div>

    </aside>

    <!-- ── Main ──────────────────────────────────────────────────────────── -->
    <div class="main">

      <header class="topbar">
        <span class="topbar-title">{{ companyName }}</span>
        <div class="topbar-right">
          <div class="status-dot"></div>
          <span>{{ roleLabel$ | async }}</span>
        </div>
      </header>

      <app-notice-banner />

      <div class="content-scroll">
        <router-outlet />
      </div>

    </div>
  `,
})
export class ShellComponent implements OnInit {
  private readonly oidc        = inject(OidcSecurityService);
  private readonly cmsService  = inject(CmsService);
  private readonly authCtx     = inject(AuthContextService);

  companyName = 'ERP Platform';

  email$ = this.oidc.userData$.pipe(
    map(({ userData }) => userData?.email ?? ''),
  );

  fullName$ = this.oidc.userData$.pipe(
    map(({ userData }) =>
      [userData?.given_name, userData?.family_name].filter(Boolean).join(' ')
      || userData?.preferred_username
      || '',
    ),
  );

  initials$: Observable<string> = this.fullName$.pipe(
    map((n: string) =>
      n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?',
    ),
  );

  roleLabel$: Observable<string> = this.oidc.getPayloadFromAccessToken().pipe(
    map((payload: any) => {
      const roles: string[] = payload?.realm_access?.roles ?? [];
      if (roles.includes('SUPER_ADMIN')) return 'Super Admin';
      if (roles.includes('EMPLOYER'))    return 'Employer';
      if (roles.includes('EMPLOYEE'))    return 'Employee';
      if (roles.includes('CLIENT'))      return 'Client';
      return '';
    }),
  );

  visibleSections$: Observable<NavSection[]> = this.oidc.getPayloadFromAccessToken().pipe(
    map((payload: any) => {
      const roles: string[] = payload?.realm_access?.roles ?? [];
      return NAV_SECTIONS
        .map(section => ({
          ...section,
          items: section.items.filter(item => item.roles.some(r => roles.includes(r))),
        }))
        .filter(section => section.items.length > 0);
    }),
  );

  ngOnInit() {
    this.authCtx.init();
    this.cmsService.getBranding().subscribe({
      next: b => {
        applyBrandingCssVars(b);
        if (b.companyName) this.companyName = b.companyName;
      },
      error: () => {},
    });
  }

  logout() { this.oidc.logoff().subscribe(); }
}
