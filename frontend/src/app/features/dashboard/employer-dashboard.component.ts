import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { DashboardDataService, EmployerSummary, FunnelStep } from '../../core/services/dashboard.service';
import { AiService, StockForecastItem } from '../../core/services/ai.service';
import { InventoryService } from '../../core/services/inventory.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    @if (loading) {
      <div style="display:flex;justify-content:center;padding:4rem">
        <mat-spinner diameter="44"/>
      </div>
    } @else if (summary) {
      <div class="flex flex-col gap-6 anim-fade-up">

        <!-- KPI row -->
        <div class="kpi-grid stagger">
          <div class="kpi-card blue">
            <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
            <div class="kpi-value">{{ summary.openDevisCount }}</div>
            <div class="kpi-label">Devis ouverts</div>
          </div>
          <div class="kpi-card amber">
            <div class="kpi-icon"><mat-icon>inbox</mat-icon></div>
            <div class="kpi-value">{{ summary.pendingRequestsCount }}</div>
            <div class="kpi-label">Demandes en attente</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
            <div class="kpi-value" style="font-size:1.5rem">{{ summary.revenueMtd | number:'1.0-0' }}</div>
            <div class="kpi-label">CA du mois (TND)</div>
          </div>
          <div class="kpi-card" [class]="summary.overdueFacturesCount > 0 ? 'red' : 'kpi-neutral'">
            <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
            <div class="kpi-value">{{ summary.overdueFacturesCount }}</div>
            <div class="kpi-label">Factures en retard</div>
          </div>
        </div>

        <!-- Revenue YTD + sales funnel -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div class="erp-card">
            <div class="erp-card-header">
              <mat-icon>trending_up</mat-icon> CA annuel
            </div>
            <div class="erp-card-body">
              <div style="font-size:2.25rem;font-weight:700;letter-spacing:-.04em;color:var(--clr-text)">
                {{ summary.revenueYtd | number:'1.0-0' }}
                <span style="font-size:1rem;font-weight:400;color:var(--clr-muted)">TND</span>
              </div>
              <div style="font-size:.8125rem;color:var(--clr-muted);margin-top:.25rem">Facturé cette année (payé)</div>
              <mat-divider style="margin:1rem 0"/>
              <div style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--clr-text-2)">
                <span>Mois en cours</span>
                <span style="font-weight:600;color:var(--clr-text)">{{ summary.revenueMtd | number:'1.0-0' }} TND</span>
              </div>
            </div>
          </div>

          <div class="erp-card">
            <div class="erp-card-header">
              <mat-icon>filter_alt</mat-icon> Entonnoir de vente
            </div>
            <div class="erp-card-body flex flex-col gap-3">
              @for (step of summary.salesFunnel; track step.stage; let i = $index) {
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:.8125rem;margin-bottom:.375rem">
                    <span style="color:var(--clr-text-2)">{{ step.stage }}</span>
                    <span style="font-weight:700;color:var(--clr-text)">{{ step.count }}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="fill"
                         [style.width.%]="funnelPct(step, summary.salesFunnel)"
                         [style.background-color]="funnelColor(i)">
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- AI stock risk -->
        @if (stockRisks.length > 0) {
          <div class="erp-card">
            <div class="erp-card-header">
              <mat-icon>psychology</mat-icon> IA – Risque de rupture de stock
              <span style="margin-left:auto;font-size:.75rem;font-weight:400;color:var(--clr-muted)">Top 5 SKUs à risque</span>
            </div>
            <div class="erp-card-body flex flex-col gap-3">
              @for (item of stockRisks.slice(0, 5); track item.product_id) {
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="width:7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8125rem;font-family:ui-monospace,monospace;color:var(--clr-text-2)">
                    {{ item.product_reference }}
                  </span>
                  <div class="progress-bar" style="flex:1">
                    <div class="fill"
                         [style.width.%]="item.risk_score * 100"
                         [class]="riskBarColor(item.risk_level)">
                    </div>
                  </div>
                  <span style="font-size:.75rem;font-weight:700;width:4rem;text-align:right"
                        [style.color]="riskTextColor(item.risk_level)">
                    {{ item.risk_level }}
                  </span>
                  <span style="font-size:.75rem;color:var(--clr-muted);width:5rem;text-align:right">
                    @if (item.estimated_days_to_stockout !== null) {
                      {{ item.estimated_days_to_stockout }}j restants
                    } @else { stock OK }
                  </span>
                </div>
              }
            </div>
          </div>
        }

      </div>
    }
  `,
})
export class EmployerDashboardComponent implements OnInit {
  private readonly dashSvc  = inject(DashboardDataService);
  private readonly aiSvc    = inject(AiService);
  private readonly invSvc   = inject(InventoryService);

  summary: EmployerSummary | null = null;
  stockRisks: StockForecastItem[]  = [];
  loading = true;

  ngOnInit() {
    forkJoin({
      summary: this.dashSvc.employer(),
      page:    this.invSvc.getItems(0, 50),
    }).subscribe({
      next: ({ summary, page }) => {
        this.summary = summary;
        const items = page.content;
        if (items.length > 0) {
          const payload = items.map(it => ({
            product_id:         it.productId,
            product_reference:  it.productReference,
            current_quantity:   it.quantity,
            reorder_point:      0,
            daily_consumptions: [],
          }));
          this.aiSvc.stockForecast('current', payload).subscribe({
            next: r => { this.stockRisks = r.forecasts.filter(f => f.risk_level !== 'LOW'); },
            error: () => {},
          });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  funnelPct(step: FunnelStep, funnel: FunnelStep[]): number {
    const max = Math.max(...funnel.map(s => s.count), 1);
    return Math.round((step.count / max) * 100);
  }

  funnelColor(i: number): string {
    return ['#2563eb', '#7c3aed', '#059669', '#d97706'][i % 4];
  }

  riskBarColor(level: string): string {
    return { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-400', MEDIUM: 'bg-yellow-400', LOW: 'bg-green-400' }[level] ?? 'bg-gray-400';
  }

  riskTextColor(level: string): string {
    return { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34a' }[level] ?? '#9ca3af';
  }
}
