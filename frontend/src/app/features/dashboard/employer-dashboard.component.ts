import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexAxisChartSeries, ApexNonAxisChartSeries,
  ApexChart, ApexXAxis, ApexYAxis, ApexStroke,
  ApexFill, ApexTooltip, ApexDataLabels, ApexPlotOptions,
  ApexLegend, ApexResponsive, ApexGrid,
} from 'ng-apexcharts';
import { DashboardDataService, EmployerSummary } from '../../core/services/dashboard.service';
import { AiService, DashboardInsightsResponse } from '../../core/services/ai.service';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

interface RevenueChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  colors: string[];
  grid: ApexGrid;
  legend: ApexLegend;
}

interface DonutChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  responsive: ApexResponsive[];
}

interface FunnelChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  colors: string[];
  tooltip: ApexTooltip;
}

interface ConversionChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  legend: ApexLegend;
}

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonModule, MatTooltipModule,
    NgApexchartsModule,
  ],
  styles: [`
    .dash-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; }
    .chart-row  { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
    .chart-row.solo { grid-template-columns:1fr; }
    @media(max-width:768px){ .chart-row { grid-template-columns:1fr; } }
    .kpi-card  {
      background:var(--clr-surface);
      border:1px solid var(--clr-border);
      border-radius:var(--r-lg);
      padding:1.25rem 1.5rem;
      display:flex; flex-direction:column; gap:.375rem;
      box-shadow:var(--shadow-sm);
      transition:box-shadow var(--dur);
      &:hover { box-shadow:var(--shadow-md); }
    }
    .kpi-card.blue   { border-top:3px solid #2563eb; }
    .kpi-card.amber  { border-top:3px solid #d97706; }
    .kpi-card.green  { border-top:3px solid #059669; }
    .kpi-card.red    { border-top:3px solid #dc2626; }
    .kpi-icon { color:var(--clr-muted); mat-icon { font-size:1.25rem; } }
    .kpi-value{ font-size:2rem; font-weight:800; letter-spacing:-.04em; color:var(--clr-text); line-height:1; }
    .kpi-label{ font-size:.8rem; color:var(--clr-muted); }
    .card {
      background:var(--clr-surface);
      border:1px solid var(--clr-border);
      border-radius:var(--r-lg);
      box-shadow:var(--shadow-sm);
      overflow:hidden;
    }
    .card-header {
      display:flex; align-items:center; gap:.5rem;
      padding:1rem 1.25rem .75rem;
      font-weight:600; font-size:.9375rem; color:var(--clr-text);
      border-bottom:1px solid var(--clr-border);
      mat-icon { color:var(--clr-primary); font-size:1.125rem; }
    }
    .card-header .badge {
      margin-left:auto;
      font-size:.7rem; font-weight:500;
      background:var(--clr-primary-light); color:var(--clr-primary);
      border-radius:20px; padding:.125rem .625rem;
    }
    .index-btn {
      margin-left:auto;
      font-size:.75rem;
    }
  `],
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:4rem">
        <mat-spinner diameter="44"/>
      </div>
    } @else {
      <div class="flex flex-col gap-5 anim-fade-up">

        <!-- KPI Row -->
        @if (summary()) {
          <div class="dash-grid stagger">
            <div class="kpi-card blue">
              <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
              <div class="kpi-value">{{ summary()!.openDevisCount }}</div>
              <div class="kpi-label">Devis ouverts</div>
            </div>
            <div class="kpi-card amber">
              <div class="kpi-icon"><mat-icon>inbox</mat-icon></div>
              <div class="kpi-value">{{ summary()!.pendingRequestsCount }}</div>
              <div class="kpi-label">Demandes en attente</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
              <div class="kpi-value" style="font-size:1.5rem">{{ summary()!.revenueMtd | number:'1.0-0' }}</div>
              <div class="kpi-label">CA du mois (TND)</div>
            </div>
            <div class="kpi-card" [class]="summary()!.overdueFacturesCount > 0 ? 'red' : ''">
              <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
              <div class="kpi-value">{{ summary()!.overdueFacturesCount }}</div>
              <div class="kpi-label">Factures en retard</div>
            </div>
            @if (insights()) {
              <div class="kpi-card" style="border-top:3px solid #7c3aed">
                <div class="kpi-icon"><mat-icon>psychology</mat-icon></div>
                <div class="kpi-value" style="font-size:1.5rem">{{ insights()!.docs_indexed }}</div>
                <div class="kpi-label">Docs indexés (RAG)</div>
              </div>
            }
          </div>
        }

        <!-- Revenue trend + AI forecast -->
        <div class="card">
          <div class="card-header">
            <mat-icon>trending_up</mat-icon>
            Tendance CA & Prévision IA
            <span class="badge">12 mois + 30j prévision</span>
            <button mat-icon-button class="index-btn"
                    (click)="triggerIndexing()"
                    matTooltip="Re-indexer les données maintenant">
              <mat-icon>sync</mat-icon>
            </button>
          </div>
          @if (revenueChart()) {
            <apx-chart
              [series]="revenueChart()!.series"
              [chart]="revenueChart()!.chart"
              [xaxis]="revenueChart()!.xaxis"
              [yaxis]="revenueChart()!.yaxis"
              [stroke]="revenueChart()!.stroke"
              [fill]="revenueChart()!.fill"
              [tooltip]="revenueChart()!.tooltip"
              [dataLabels]="revenueChart()!.dataLabels"
              [colors]="revenueChart()!.colors"
              [grid]="revenueChart()!.grid"
              [legend]="revenueChart()!.legend"
            ></apx-chart>
          } @else {
            <div style="padding:2rem;text-align:center;color:var(--clr-muted)">
              Aucune donnée de CA disponible
            </div>
          }
        </div>

        <!-- Funnel + Stock Risk -->
        <div class="chart-row">

          <!-- Sales Funnel -->
          <div class="card">
            <div class="card-header">
              <mat-icon>filter_alt</mat-icon>
              Entonnoir de vente
            </div>
            @if (funnelChart()) {
              <apx-chart
                [series]="funnelChart()!.series"
                [chart]="funnelChart()!.chart"
                [xaxis]="funnelChart()!.xaxis"
                [plotOptions]="funnelChart()!.plotOptions"
                [dataLabels]="funnelChart()!.dataLabels"
                [colors]="funnelChart()!.colors"
                [tooltip]="funnelChart()!.tooltip"
              ></apx-chart>
            }
          </div>

          <!-- Stock Risk Donut -->
          <div class="card">
            <div class="card-header">
              <mat-icon>psychology</mat-icon>
              Risque de rupture stock
              <span class="badge">IA</span>
            </div>
            @if (stockDonut()) {
              <apx-chart
                [series]="stockDonut()!.series"
                [chart]="stockDonut()!.chart"
                [labels]="stockDonut()!.labels"
                [colors]="stockDonut()!.colors"
                [legend]="stockDonut()!.legend"
                [dataLabels]="stockDonut()!.dataLabels"
                [plotOptions]="stockDonut()!.plotOptions"
                [tooltip]="stockDonut()!.tooltip"
                [responsive]="stockDonut()!.responsive"
              ></apx-chart>
            } @else {
              <div style="padding:2rem;text-align:center;color:var(--clr-muted)">
                Aucune donnée stock disponible
              </div>
            }
          </div>

        </div>

        <!-- Quote conversion rate -->
        @if (conversionChart()) {
          <div class="card">
            <div class="card-header">
              <mat-icon>bar_chart</mat-icon>
              Taux d'acceptation des devis par mois
              <span class="badge">6 mois</span>
            </div>
            <apx-chart
              [series]="conversionChart()!.series"
              [chart]="conversionChart()!.chart"
              [xaxis]="conversionChart()!.xaxis"
              [yaxis]="conversionChart()!.yaxis"
              [colors]="conversionChart()!.colors"
              [dataLabels]="conversionChart()!.dataLabels"
              [plotOptions]="conversionChart()!.plotOptions"
              [tooltip]="conversionChart()!.tooltip"
              [legend]="conversionChart()!.legend"
            ></apx-chart>
          </div>
        }

      </div>
    }
  `,
})
export class EmployerDashboardComponent implements OnInit {
  private readonly dashSvc = inject(DashboardDataService);
  private readonly aiSvc   = inject(AiService);

  readonly loading   = signal(true);
  readonly summary   = signal<EmployerSummary | null>(null);
  readonly insights  = signal<DashboardInsightsResponse | null>(null);

  readonly revenueChart  = computed(() => this._buildRevenueChart(this.insights()));
  readonly funnelChart   = computed(() => this._buildFunnelChart(this.summary()));
  readonly stockDonut    = computed(() => this._buildStockDonut(this.insights()));
  readonly conversionChart = computed(() => this._buildConversionChart(this.insights()));

  ngOnInit(): void {
    forkJoin({
      summary:  this.dashSvc.employer(),
      insights: this.aiSvc.dashboardInsights().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ summary, insights }) => {
        this.summary.set(summary);
        this.insights.set(insights);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  triggerIndexing(): void {
    this.aiSvc.indexAll().subscribe();
  }

  // ── Chart builders ──────────────────────────────────────────────────────────

  private _buildRevenueChart(ins: DashboardInsightsResponse | null): RevenueChartOptions | null {
    if (!ins?.monthly_revenue?.length) return null;

    const historical = ins.monthly_revenue;
    const forecast   = ins.revenue_forecast?.slice(0, 30) ?? [];

    // Build unified month labels
    const histLabels = historical.map(r => r.month);
    const fcstLabels = forecast
      .filter((_, i) => i % 7 === 0) // weekly points to avoid clutter
      .map(r => r.date.substring(0, 7));
    const allLabels = [...new Set([...histLabels, ...fcstLabels])];

    const histData  = histLabels.map(m => {
      const found = historical.find(r => r.month === m);
      return found ? Math.round(found.revenue) : 0;
    });

    const fcstData: (number | null)[] = allLabels.map(m => {
      const found = forecast.find(r => r.date.startsWith(m));
      return found ? Math.round(found.predicted_amount) : null;
    });

    return {
      series: [
        { name: 'CA réel (TND)', data: histData, type: 'area' },
        { name: 'Prévision IA',  data: fcstData, type: 'line' },
      ],
      chart: { type: 'line', height: 300, toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
      xaxis: {
        categories: allLabels,
        labels: { style: { fontSize: '11px' } },
      },
      yaxis: {
        labels: {
          formatter: (v: number | null) => v == null ? '' : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
          style: { fontSize: '11px' },
        },
      },
      stroke: { curve: 'smooth', width: [2, 2], dashArray: [0, 6] },
      fill: {
        type: ['gradient', 'solid'],
        gradient: { opacityFrom: 0.4, opacityTo: 0.0, shadeIntensity: 1 },
      },
      tooltip: {
        y: { formatter: (v: number | null) => v != null ? `${v.toLocaleString('fr-FR')} TND` : '' },
        shared: true, intersect: false,
      },
      dataLabels: { enabled: false },
      colors: ['#2563eb', '#7c3aed'],
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      legend: { position: 'top', fontFamily: 'inherit', fontSize: '12px' },
    };
  }

  private _buildFunnelChart(sum: EmployerSummary | null): FunnelChartOptions | null {
    if (!sum?.salesFunnel?.length) return null;
    const funnel = sum.salesFunnel;
    return {
      series: [{ name: 'Nombre', data: funnel.map(s => s.count) }],
      chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: {
        categories: funnel.map(s => s.stage),
        labels: { style: { fontSize: '11px' } },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          distributed: true,
          dataLabels: { position: 'center' },
        },
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: '700', colors: ['#fff'] },
      },
      colors: ['#2563eb', '#7c3aed', '#059669', '#d97706'],
      tooltip: { y: { formatter: (v: number) => `${v} éléments` } },
    };
  }

  private _buildStockDonut(ins: DashboardInsightsResponse | null): DonutChartOptions | null {
    if (!ins?.stock_risk) return null;
    const r = ins.stock_risk;
    const total = r.critical + r.high + r.medium + r.low;
    if (total === 0) return null;
    return {
      series: [r.critical, r.high, r.medium, r.low],
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: ['Critique', 'Élevé', 'Moyen', 'Faible'],
      colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a'],
      legend: {
        position: 'bottom', fontFamily: 'inherit', fontSize: '12px',
        formatter: (label: string, opts: { w: { globals: { series: number[] } }, seriesIndex: number }) =>
          `${label}: ${opts.w.globals.series[opts.seriesIndex]}`,
      },
      dataLabels: { enabled: true, style: { fontSize: '12px' } },
      plotOptions: { pie: { donut: { size: '65%', labels: {
        show: true,
        total: {
          show: true, label: 'SKUs',
          formatter: () => String(total),
          color: 'var(--clr-text)',
        },
      } } } },
      tooltip: { y: { formatter: (v: number) => `${v} SKUs` } },
      responsive: [{ breakpoint: 480, options: { legend: { position: 'bottom' } } }],
    };
  }

  private _buildConversionChart(ins: DashboardInsightsResponse | null): ConversionChartOptions | null {
    if (!ins?.quote_conversion?.length) return null;
    const data = ins.quote_conversion;
    return {
      series: [
        { name: 'Total devis',   data: data.map(d => d.total) },
        { name: 'Acceptés',      data: data.map(d => d.accepted) },
      ],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: {
        categories: data.map(d => d.month),
        labels: { style: { fontSize: '11px' } },
      },
      yaxis: { labels: { style: { fontSize: '11px' } } },
      colors: ['#bfdbfe', '#2563eb'],
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      tooltip: {
        shared: true, intersect: false,
        y: { formatter: (v: number) => `${v} devis` },
      },
      legend: { position: 'top', fontFamily: 'inherit', fontSize: '12px' },
    };
  }
}
