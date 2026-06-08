import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CmsService, PlatformStats, TenantUserCount } from '../../../core/services/cms.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>Tableau de bord Super-Admin</h2>
    </div>

    @if (stats) {
      <div class="kpi-row">
        <div class="kpi-card kpi-blue">
          <span class="kpi-label">Tenants total</span>
          <span class="kpi-value">{{ stats.totalTenants }}</span>
        </div>
        <div class="kpi-card kpi-green">
          <span class="kpi-label">Tenants actifs</span>
          <span class="kpi-value">{{ stats.activeTenants }}</span>
        </div>
        <div class="kpi-card kpi-purple">
          <span class="kpi-label">Utilisateurs total</span>
          <span class="kpi-value">{{ stats.totalUsers }}</span>
        </div>
        <div class="kpi-card kpi-neutral">
          <span class="kpi-label">Tenants inactifs</span>
          <span class="kpi-value">{{ stats.totalTenants - stats.activeTenants }}</span>
        </div>
      </div>
    }

    <h3 class="section-title">Tenants</h3>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Slug</th>
            <th>Statut</th>
            <th class="text-right">Utilisateurs</th>
          </tr>
        </thead>
        <tbody>
          @for (t of tenants; track t.id) {
            <tr>
              <td>{{ t.name }}</td>
              <td><code>{{ t.slug }}</code></td>
              <td>
                <span [class]="t.active ? 'chip-green' : 'chip-gray'">
                  {{ t.active ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="text-right">
                <span class="user-count">{{ t.userCount }}</span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="chart-row">
      <div class="bar-chart-card">
        <h4>Répartition des utilisateurs par tenant</h4>
        @for (t of tenants; track t.id) {
          <div class="bar-row">
            <span class="bar-label">{{ t.name }}</span>
            <div class="bar-track">
              <div class="bar-fill"
                   [style.width.%]="maxUsers > 0 ? (t.userCount / maxUsers) * 100 : 0"
                   [class]="t.active ? 'bar-active' : 'bar-inactive'">
              </div>
            </div>
            <span class="bar-value">{{ t.userCount }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .section-title { margin: 2rem 0 1rem; font-size: 1.1rem; font-weight: 600; }
    code           { font-family: monospace; font-size: .85rem; background: var(--surface); padding: 2px 6px; border-radius: 4px; }
    .user-count    { font-weight: 600; }
    .chart-row     { margin-top: 2rem; }
    .bar-chart-card { background: var(--surface); border-radius: 10px; padding: 1.5rem; }
    .bar-chart-card h4 { margin: 0 0 1rem; font-size: 1rem; }
    .bar-row       { display: flex; align-items: center; gap: 1rem; margin-bottom: .75rem; }
    .bar-label     { width: 180px; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track     { flex: 1; height: 20px; background: var(--border); border-radius: 10px; overflow: hidden; }
    .bar-fill      { height: 100%; border-radius: 10px; transition: width .4s; }
    .bar-active    { background: var(--brand-primary, #1976D2); }
    .bar-inactive  { background: #9ca3af; }
    .bar-value     { width: 32px; text-align: right; font-size: .9rem; font-weight: 600; }
  `],
})
export class SuperAdminDashboardComponent implements OnInit {
  private cmsService = inject(CmsService);

  stats: PlatformStats | null = null;
  tenants: TenantUserCount[] = [];
  maxUsers = 0;

  ngOnInit() {
    forkJoin({
      stats:   this.cmsService.getPlatformStats(),
      tenants: this.cmsService.getTenantsWithUserCounts(),
    }).subscribe(({ stats, tenants }) => {
      this.stats   = stats;
      this.tenants = tenants.sort((a, b) => b.userCount - a.userCount);
      this.maxUsers = Math.max(...tenants.map(t => t.userCount), 1);
    });
  }
}
