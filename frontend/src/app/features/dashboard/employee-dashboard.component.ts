import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardDataService, EmployeeSummary } from '../../core/services/dashboard.service';

interface ActionTile {
  label: string; value: number; icon: string;
  color: string; route: string; urgent: boolean;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    @if (loading) {
      <div style="display:flex;justify-content:center;padding:4rem">
        <mat-spinner diameter="44"/>
      </div>
    } @else if (summary) {
      <div class="flex flex-col gap-6 anim-fade-up">

        <p style="font-size:.9375rem;color:var(--clr-text-2)">
          Bonjour — voici votre tableau de bord du jour.
        </p>

        <!-- KPI tiles -->
        <div class="kpi-grid stagger">
          @for (tile of tiles; track tile.label) {
            <div class="kpi-card"
                 [class]="tile.urgent && tile.value > 0 ? 'amber' : 'blue'"
                 [routerLink]="tile.route"
                 style="cursor:pointer">
              <div class="kpi-icon">
                <mat-icon [style.color]="tile.color">{{ tile.icon }}</mat-icon>
              </div>
              <div style="display:flex;align-items:flex-start;justify-content:space-between">
                <div class="kpi-value">{{ tile.value }}</div>
                @if (tile.urgent && tile.value > 0) {
                  <span class="chip-orange">urgent</span>
                }
              </div>
              <div class="kpi-label">{{ tile.label }}</div>
            </div>
          }
        </div>

        <!-- Quick actions -->
        <div class="erp-card">
          <div class="erp-card-header">
            <mat-icon>bolt</mat-icon> Actions rapides
          </div>
          <div class="erp-card-body" style="display:flex;flex-wrap:wrap;gap:.75rem">
            <a mat-stroked-button color="primary" routerLink="/inventory">
              <mat-icon>inventory_2</mat-icon> Mouvements stock
            </a>
            <a mat-stroked-button color="primary" routerLink="/sales/devis">
              <mat-icon>receipt_long</mat-icon> Consulter les devis
            </a>
            <a mat-stroked-button color="primary" routerLink="/crm">
              <mat-icon>contacts</mat-icon> CRM prospects
            </a>
            <a mat-stroked-button color="primary" routerLink="/sales/livraisons">
              <mat-icon>local_shipping</mat-icon> Livraisons
            </a>
          </div>
        </div>

      </div>
    }
  `,
})
export class EmployeeDashboardComponent implements OnInit {
  private readonly dashSvc = inject(DashboardDataService);

  summary: EmployeeSummary | null = null;
  tiles:   ActionTile[]           = [];
  loading = true;

  ngOnInit() {
    this.dashSvc.employee().subscribe({
      next: s => {
        this.summary = s;
        this.tiles = [
          { label: 'Livraisons planifiées', value: s.livraisonsEnPreparation, icon: 'local_shipping', color: '#2563eb', route: '/sales/livraisons', urgent: true },
          { label: 'Livraisons en cours',   value: s.livraisonsPretes,        icon: 'directions_run', color: '#7c3aed', route: '/sales/livraisons', urgent: false },
          { label: 'Nouvelles demandes',    value: s.requestsNouveaux,        icon: 'inbox',          color: '#d97706', route: '/sales/devis',      urgent: true },
          { label: 'Commandes ouvertes',    value: s.openCommandes,           icon: 'shopping_cart',  color: '#059669', route: '/sales/commandes',  urgent: false },
        ];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
