import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { DashboardDataService, ClientSummary } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    @if (loading) {
      <div style="display:flex;justify-content:center;padding:4rem">
        <mat-spinner diameter="44"/>
      </div>
    } @else if (summary) {
      <div class="flex flex-col gap-6 anim-fade-up">

        <!-- KPI tiles -->
        <div class="kpi-grid stagger">
          <div class="kpi-card blue">
            <div class="kpi-icon"><mat-icon>description</mat-icon></div>
            <div class="kpi-value">{{ summary.totalDevis }}</div>
            <div class="kpi-label">Devis reçus</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
            <div class="kpi-value">{{ summary.acceptedDevis }}</div>
            <div class="kpi-label">Devis acceptés</div>
          </div>
          <div class="kpi-card amber">
            <div class="kpi-icon"><mat-icon>hourglass_empty</mat-icon></div>
            <div class="kpi-value">{{ summary.pendingRequests }}</div>
            <div class="kpi-label">Demandes en cours</div>
          </div>
        </div>

        <!-- Finances + actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div class="erp-card">
            <div class="erp-card-header">
              <mat-icon>account_balance_wallet</mat-icon> Mes finances
            </div>
            <div class="erp-card-body flex flex-col gap-3">
              <div style="display:flex;justify-content:space-between;font-size:.875rem">
                <span style="color:var(--clr-text-2)">Total facturé</span>
                <span style="font-weight:600">{{ summary.totalInvoiced | number:'1.2-2' }} TND</span>
              </div>
              <mat-divider/>
              <div style="display:flex;justify-content:space-between;font-size:.875rem">
                <span style="color:var(--clr-text-2)">Total payé</span>
                <span style="font-weight:600;color:var(--clr-success)">{{ summary.totalPaid | number:'1.2-2' }} TND</span>
              </div>
              <mat-divider/>
              <div style="display:flex;justify-content:space-between;font-size:.875rem">
                <span style="color:var(--clr-text-2)">Solde restant</span>
                <span style="font-weight:700"
                      [style.color]="(summary.totalInvoiced - summary.totalPaid) > 0 ? 'var(--clr-danger)' : 'var(--clr-success)'">
                  {{ (summary.totalInvoiced - summary.totalPaid) | number:'1.2-2' }} TND
                </span>
              </div>

              @if (summary.totalDevis > 0) {
                <div style="margin-top:.5rem">
                  <div style="font-size:.75rem;color:var(--clr-muted);margin-bottom:.375rem;display:flex;justify-content:space-between">
                    <span>Taux d'acceptation</span>
                    <span style="font-weight:600">{{ acceptanceRate | number:'1.0-0' }}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="fill" style="background:var(--clr-success)" [style.width.%]="acceptanceRate"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="erp-card">
            <div class="erp-card-header">
              <mat-icon>bolt</mat-icon> Actions rapides
            </div>
            <div class="erp-card-body flex flex-col gap-3">
              <a mat-raised-button color="primary" routerLink="/portal/dashboard">
                <mat-icon>person</mat-icon> Mon espace client
              </a>
              <a mat-stroked-button color="primary" routerLink="/portal/quote-request">
                <mat-icon>add_circle_outline</mat-icon> Nouvelle demande de devis
              </a>
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class ClientDashboardComponent implements OnInit {
  private readonly dashSvc = inject(DashboardDataService);

  summary: ClientSummary | null = null;
  loading = true;

  get acceptanceRate(): number {
    if (!this.summary || this.summary.totalDevis === 0) return 0;
    return (this.summary.acceptedDevis / this.summary.totalDevis) * 100;
  }

  ngOnInit() {
    this.dashSvc.client().subscribe({
      next:  s => { this.summary = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
