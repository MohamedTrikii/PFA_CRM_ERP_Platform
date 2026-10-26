import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink }             from '@angular/router';
import { NgApexchartsModule }      from 'ng-apexcharts';
import { NgForOf, NgIf, DatePipe, DecimalPipe }  from '@angular/common';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }       from '@angular/material/tooltip';
import type {
  ApexAxisChartSeries, ApexNonAxisChartSeries,
  ApexChart, ApexXAxis, ApexYAxis, ApexStroke,
  ApexFill, ApexTooltip, ApexDataLabels, ApexPlotOptions,
  ApexLegend, ApexResponsive,
} from 'ng-apexcharts';
import {
  AiService,
  DashboardInsightsResponse,
  ModelStatusResponse, ModelRegistryItem,
  TrainingTaskResponse, AnomalyItem,
  RecommendationItem,
} from '../../core/services/ai.service';

interface AiLineChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  colors: string[];
  legend: ApexLegend;
}

interface AiBarChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
}

interface AiDonutChartOptions {
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

@Component({
  selector: 'erp-ai-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, NgApexchartsModule, NgForOf, NgIf, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  styles: [`
    :host { display: block; }

    .dash-layout {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1100px;
      animation: fadeInUp .3s var(--ease) both;
    }

    .dash-header {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding-bottom: 1.125rem;
      border-bottom: 1px solid var(--clr-border);
    }

    .dash-avatar {
      width: 2.75rem; height: 2.75rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .dash-title   { font-size: 1.125rem; font-weight: 700; color: var(--clr-text); margin: 0; }
    .dash-subtitle{ font-size: .8rem; color: var(--clr-muted); margin: 0; }

    .section-title {
      font-size: .75rem; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: var(--clr-muted);
      margin: 0 0 .75rem;
    }

    /* ── Cards grid ── */
    .cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }

    .card {
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-sm);
      padding: 1.125rem 1.25rem;
      display: flex; flex-direction: column; gap: .375rem;
    }

    .card-label {
      font-size: .75rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: .06em;
      color: var(--clr-muted);
    }

    .card-value {
      font-size: 1.875rem; font-weight: 700;
      color: var(--clr-text);
      line-height: 1.1;
    }

    .card-sub { font-size: .8125rem; color: var(--clr-muted); }

    .badge {
      display: inline-flex; align-items: center;
      padding: .2rem .55rem;
      border-radius: 999px;
      font-size: .75rem; font-weight: 600;
    }

    .badge-ok     { background: #dcfce7; color: #166534; }
    .badge-warn   { background: #fef9c3; color: #854d0e; }
    .badge-error  { background: #fee2e2; color: #991b1b; }
    .badge-info   { background: #dbeafe; color: #1e40af; }

    /* ── Status row ── */
    .status-row {
      display: flex; align-items: center; gap: .625rem;
      padding: .75rem 1rem;
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-md);
    }

    .dot {
      width: .625rem; height: .625rem;
      border-radius: 50%; flex-shrink: 0;
    }

    .dot-ok    { background: #22c55e; }
    .dot-warn  { background: #eab308; }
    .dot-error { background: #ef4444; }

    /* ── Table-like list ── */
    .item-list { display: flex; flex-direction: column; gap: .5rem; }

    .item-row {
      display: flex; align-items: center;
      padding: .625rem .875rem;
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-md);
      gap: .75rem;
    }

    .item-label { flex: 1; font-size: .875rem; color: var(--clr-text); }
    .item-meta  { font-size: .8rem; color: var(--clr-muted); }

    /* ── Training controls ── */
    .train-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: .875rem;
    }

    .train-card {
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-lg);
      padding: 1rem 1.125rem;
      display: flex; align-items: center; gap: .875rem;
    }

    .train-icon {
      width: 2.25rem; height: 2.25rem;
      border-radius: 10px;
      background: var(--clr-primary-light);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: var(--clr-primary); font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    }

    .train-info { flex: 1; min-width: 0; }
    .train-name { font-size: .9rem; font-weight: 600; color: var(--clr-text); }
    .train-status { font-size: .775rem; color: var(--clr-muted); }

    /* ── Quick actions ── */
    .quick-actions {
      display: flex; flex-wrap: wrap; gap: .625rem;
    }

    .empty-hint {
      text-align: center; padding: 1.5rem;
      color: var(--clr-muted); font-size: .9rem;
    }
  `],
  template: `
    <div class="dash-layout">

      <!-- Header -->
      <div class="dash-header">
        <div class="dash-avatar">
          <mat-icon style="color:#fff;font-size:1.375rem;width:1.375rem;height:1.375rem">insights</mat-icon>
        </div>
        <div>
          <p class="dash-title">Dashboard IA — Analyse & Modèles</p>
          <p class="dash-subtitle">Prévisions · Classification · Anomalies · Indexation RAG</p>
        </div>
        <span style="flex:1"></span>
        <button mat-stroked-button (click)="refreshAll()" [disabled]="refreshing()">
          <ng-container *ngIf="refreshing(); else refreshIcon">
            <mat-spinner diameter="16" style="display:inline-block"/>
          </ng-container>
          <ng-template #refreshIcon>
            <mat-icon>refresh</mat-icon>
          </ng-template>
          Actualiser
        </button>
      </div>

      <!-- ── 1. Statut Ollama ── -->
      <section>
        <p class="section-title">Statut Ollama / LLM</p>
        <ng-container *ngIf="ollamaStatus(); else loadingOllama">
          <div class="status-row">
            <span [class]="'dot ' + (ollamaStatus()!.model_available ? 'dot-ok' : 'dot-error')"></span>
            <span style="font-weight:600;font-size:.9rem">{{ ollamaStatus()!.configured_model }}</span>
            <span class="badge" [class]="ollamaStatus()!.model_available ? 'badge-ok' : 'badge-error'">
              {{ ollamaStatus()!.model_available ? 'Disponible' : 'Indisponible' }}
            </span>
            <span class="item-meta">{{ ollamaStatus()!.ollama_url }}</span>
            <span *ngIf="ollamaStatus()!.available_models.length" class="item-meta">
              {{ ollamaStatus()!.available_models.length }} modèle(s) chargé(s)
            </span>
          </div>
        </ng-container>
        <ng-template #loadingOllama>
          <div class="status-row">
            <span class="dot dot-warn"></span>
            <span style="font-size:.875rem">Chargement du statut Ollama…</span>
          </div>
        </ng-template>
      </section>

      <!-- ── 2. Indicateurs IA — Prévisions et alertes ── -->
      <section>
        <p class="section-title">Indicateurs IA</p>
        <div class="cards-row">
          <div class="card">
            <span class="card-label">Seuil d'alerte stock</span>
            <span class="card-value">{{ insights() ? (insights()!.stock_risk.critical + insights()!.stock_risk.high) : '—' }}</span>
            <span class="card-sub">{{ insights() ? (insights()!.stock_risk.critical + ' critiques · ' + insights()!.stock_risk.high + ' hautes') : 'Chargement…' }}</span>
          </div>
          <div class="card">
            <span class="card-label">Prévision des ventes</span>
            <span class="card-value">{{ insights() ? (forecastTotal() | number:'1.0-0') : '—' }}</span>
            <span class="card-sub">Montant prévu sur les prochains jours</span>
          </div>
          <div class="card">
            <span class="card-label">Acceptation devis</span>
            <span class="card-value">{{ insights() ? quoteAcceptancePercent() : '—' }}%</span>
            <span class="card-sub">Taux d'acceptation estimé</span>
          </div>
          <div class="card">
            <span class="card-label">Risque paiement</span>
            <span class="card-value">{{ insights()?.payment_risk_level ?? 'modéré' }}</span>
            <span class="card-sub">Niveau de risque estimé</span>
          </div>
        </div>
      </section>

      <!-- ── 3. Modèles ML enregistrés ── -->
      <section>
        <p class="section-title">Modèles ML enregistrés</p>
        <div class="cards-row">
          <ng-container *ngIf="mlModels().length; else noModels">
            <div class="card" *ngFor="let model of mlModels(); trackBy: trackByModel">
              <span class="card-label">{{ model.name }}</span>
              <span class="badge badge-info">v{{ model.version ?? '—' }}</span>
              <span class="card-sub">{{ model.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </ng-container>
          <ng-template #noModels>
            <p class="empty-hint">Aucun modèle entraîné. Lancez un entraînement ci-dessous.</p>
          </ng-template>
        </div>
      </section>

      <!-- ── 3. Tâches d'entraînement ── -->
      <section>
        <p class="section-title">Entraînement des modèles</p>
        <div class="train-grid">
          <div class="train-card" *ngFor="let task of trainingCards; trackBy: trackByKey">
            <div class="train-icon"><mat-icon>{{ task.icon }}</mat-icon></div>
            <div class="train-info">
              <div class="train-name">{{ task.label }}</div>
              <div *ngIf="taskStatus(task.key) as s; else notStarted" class="train-status">
                <span class="badge" [class]="statusBadgeClass(s.status)">{{ trainingStatusLabel(s.status) }}</span>
                <span class="train-meta">
                  {{ s.status === 'done' ? 'Terminé · ' + (s.finished_at | date:'HH:mm') : (s.status === 'running' ? 'En cours · ' + (s.started_at | date:'HH:mm') : 'En attente · ' + (s.started_at | date:'HH:mm')) }}
                </span>
              </div>
              <ng-template #notStarted>
                <div class="train-status">Non lancé</div>
              </ng-template>
            </div>
          </div>
        </div>
        <div class="quick-actions" style="margin-top:.875rem">
          <button mat-raised-button color="primary"
                  [disabled]="training()"
                  (click)="trainAll()"
                  matTooltip="Entraîne les 4 modèles en arrière-plan">
            <ng-container *ngIf="training()">
              <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"/>
            </ng-container>
            <mat-icon>model_training</mat-icon>
            Entraîner tous les modèles
          </button>
          <button mat-stroked-button routerLink="/ai-assistant">
            <mat-icon>smart_toy</mat-icon>
            Ouvrir l'assistant
          </button>
        </div>
      </section>

      <!-- ── 4. Graphiques IA ── -->
      <section>
        <p class="section-title">Graphiques IA</p>
        <div class="cards-row">
          <div class="card" *ngIf="revenueForecastChart() as chart">
            <span class="card-label">Prévision des ventes</span>
            <span class="card-sub">Revues et prévisions</span>
            <apx-chart
              [series]="chart.series"
              [chart]="chart.chart"
              [xaxis]="chart.xaxis"
              [yaxis]="chart.yaxis"
              [stroke]="chart.stroke"
              [fill]="chart.fill"
              [tooltip]="chart.tooltip"
              [dataLabels]="chart.dataLabels"
              [colors]="chart.colors"
              [legend]="chart.legend"
            ></apx-chart>
          </div>
          <div class="card" *ngIf="quoteConversionChart() as chart">
            <span class="card-label">Acceptation des devis</span>
            <span class="card-sub">Comparaison mois par mois</span>
            <apx-chart
              [series]="chart.series"
              [chart]="chart.chart"
              [xaxis]="chart.xaxis"
              [yaxis]="chart.yaxis"
              [colors]="chart.colors"
              [plotOptions]="chart.plotOptions"
              [tooltip]="chart.tooltip"
              [dataLabels]="chart.dataLabels"
              [legend]="chart.legend"
            ></apx-chart>
          </div>
          <div class="card" *ngIf="stockRiskDonutChart() as chart">
            <span class="card-label">Risque de stock</span>
            <span class="card-sub">Répartition des alertes</span>
            <apx-chart
              [series]="chart.series"
              [chart]="chart.chart"
              [labels]="chart.labels"
              [colors]="chart.colors"
              [legend]="chart.legend"
              [dataLabels]="chart.dataLabels"
              [plotOptions]="chart.plotOptions"
              [tooltip]="chart.tooltip"
              [responsive]="chart.responsive"
            ></apx-chart>
          </div>
        </div>
      </section>

      <!-- ── 5. Anomalies stock ── -->
      <section>
        <p class="section-title">Anomalies stock détectées</p>
        <ng-container *ngIf="anomalies().length; else noAnomalies">
          <div class="item-list">
            <div class="item-row" *ngFor="let a of anomalies(); trackBy: trackById">
              <mat-icon style="color:#ef4444;font-size:1.1rem;width:1.1rem;height:1.1rem">warning</mat-icon>
              <span class="item-label">{{ a.product_reference }}</span>
              <span class="badge badge-error">score: {{ a.anomaly_score | number:'1.2-2' }}</span>
              <span *ngIf="a.reason" class="item-meta">{{ a.reason }}</span>
            </div>
          </div>
        </ng-container>
        <ng-template #noAnomalies>
          <p class="empty-hint">Aucune anomalie détectée.</p>
        </ng-template>
      </section>

      <!-- ── 5. Recommandations achats ── -->
      <section>
        <p class="section-title">Recommandations de réapprovisionnement</p>
        <ng-container *ngIf="recommendations().length; else noRecommendations">
          <div class="item-list">
            <div class="item-row" *ngFor="let r of recommendations(); trackBy: trackById">
              <mat-icon style="color:#2563eb;font-size:1.1rem;width:1.1rem;height:1.1rem">shopping_cart</mat-icon>
              <span class="item-label">{{ r.reason }}</span>
              <span class="badge badge-warn">+{{ r.suggested_qty | number:'1.0-0' }} unités</span>
            </div>
          </div>
        </ng-container>
        <ng-template #noRecommendations>
          <p class="empty-hint">Aucune recommandation d'achat urgente.</p>
        </ng-template>
      </section>

    </div>
  `,
})
export class AiDashboardComponent implements OnInit {
  private readonly ai = inject(AiService);

  readonly ollamaStatus    = signal<ModelStatusResponse | null>(null);
  readonly insights        = signal<DashboardInsightsResponse | null>(null);
  readonly mlModels        = signal<ModelRegistryItem[]>([]);
  readonly trainingTasks   = signal<TrainingTaskResponse[]>([]);
  readonly anomalies       = signal<AnomalyItem[]>([]);
  readonly recommendations = signal<RecommendationItem[]>([]);
  readonly refreshing      = signal(false);
  readonly training        = signal(false);

  readonly revenueForecastChart = computed(() => this._buildRevenueForecastChart(this.insights()));
  readonly quoteConversionChart = computed(() => this._buildQuoteConversionChart(this.insights()));
  readonly stockRiskDonutChart  = computed(() => this._buildStockRiskDonut(this.insights()));

  readonly trainingCards = [
    { key: 'sales_forecast',     label: 'Prévision des ventes',  icon: 'trending_up'     },
    { key: 'quote_acceptance',   label: 'Acceptation devis',     icon: 'fact_check'       },
    { key: 'payment_risk',       label: 'Risque paiement',       icon: 'payments'         },
    { key: 'stock_anomaly',      label: 'Anomalies stock',       icon: 'warehouse'        },
  ];

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.refreshing.set(true);
    let pending = 6;
    const done = () => { if (--pending === 0) this.refreshing.set(false); };

    this.ai.modelStatus().subscribe({ next: r  => { this.ollamaStatus.set(r);       done(); }, error: done });
    this.ai.dashboardInsights().subscribe({ next: r => { this.insights.set(r);       done(); }, error: done });
    this.ai.listModels().subscribe({ next: r   => { this.mlModels.set(r);            done(); }, error: done });
    this.ai.listTrainingTasks().subscribe({ next: r => { this.trainingTasks.set(r); done(); }, error: done });
    this.ai.detectAnomalies().subscribe({
      next: r => { this.anomalies.set(r.anomalies.filter(a => a.is_anomaly)); done(); },
      error: done,
    });
    this.ai.recommendPurchase().subscribe({
      next: r => { this.recommendations.set(r.recommendations); done(); },
      error: done,
    });
  }

  trainAll(): void {
    this.training.set(true);
    this.ai.trainAll().subscribe({
      next: tasks => {
        this.trainingTasks.set(tasks);
        this.training.set(false);
      },
      error: () => this.training.set(false),
    });
  }

  private readonly trainingTaskNamePatterns: Record<string, string[]> = {
    sales_forecast: ['sales forecast', 'prévision des ventes'],
    quote_acceptance: ['quote acceptance', 'acceptation devis'],
    payment_risk: ['payment risk', 'risque paiement'],
    stock_anomaly: ['stock anomaly', 'anomalies stock'],
  };

  taskStatus(key: string): TrainingTaskResponse | undefined {
    const patterns = this.trainingTaskNamePatterns[key] ?? [key.replace('_', ' ')];
    return this.trainingTasks().find(task => {
      const normalized = task.name.toLowerCase();
      return patterns.some(pattern => normalized.includes(pattern));
    });
  }

  quoteAcceptancePercent(): string {
    const acceptance = this.insights()?.quote_acceptance_rate;
    if (acceptance === undefined) {
      return '—';
    }
    return Math.round(acceptance * 100).toString();
  }

  forecastTotal(): number {
    return this.insights()?.revenue_forecast?.reduce((sum, item) => sum + item.predicted_amount, 0) ?? 0;
  }

  private _buildRevenueForecastChart(ins: DashboardInsightsResponse | null): AiLineChartOptions | null {
    if (!ins?.monthly_revenue?.length || !ins.revenue_forecast?.length) return null;

    const history = ins.monthly_revenue;
    const forecast = ins.revenue_forecast;
    const categories = [...new Set([...history.map(item => item.month), ...forecast.map(item => item.date)])];

    return {
      series: [
        { name: 'Revenu réel', data: history.map(item => item.revenue) },
        { name: 'Prévision IA', data: categories.map(label => {
            const match = forecast.find(pt => pt.date === label);
            return match ? Math.round(match.predicted_amount) : null;
          }) },
      ],
      chart: { type: 'line', height: 260, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      xaxis: { categories, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { style: { fontSize: '11px' } } },
      stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
      fill: { type: ['solid', 'gradient'], gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
      tooltip: { shared: true, intersect: false, y: { formatter: (value: number | null) => value === null ? '' : `${value.toLocaleString('fr-FR')} TND` } },
      dataLabels: { enabled: false },
      colors: ['#2563eb', '#7c3aed'],
      legend: { position: 'top', fontFamily: 'inherit', fontSize: '12px' },
    };
  }

  private _buildQuoteConversionChart(ins: DashboardInsightsResponse | null): AiBarChartOptions | null {
    if (!ins?.quote_conversion?.length) return null;

    return {
      series: [
        { name: 'Total devis', data: ins.quote_conversion.map(item => item.total) },
        { name: 'Acceptés', data: ins.quote_conversion.map(item => item.accepted) },
      ],
      chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories: ins.quote_conversion.map(item => item.month), labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { style: { fontSize: '11px' } } },
      colors: ['#bfdbfe', '#2563eb'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      tooltip: { shared: true, intersect: false, y: { formatter: (value: number) => `${value} devis` } },
      dataLabels: { enabled: false },
      legend: { position: 'top', fontFamily: 'inherit', fontSize: '12px' },
    };
  }

  private _buildStockRiskDonut(ins: DashboardInsightsResponse | null): AiDonutChartOptions | null {
    if (!ins?.stock_risk) return null;

    const risk = ins.stock_risk;
    const total = risk.critical + risk.high + risk.medium + risk.low;
    if (total === 0) return null;

    return {
      series: [risk.critical, risk.high, risk.medium, risk.low],
      chart: { type: 'donut', height: 260, fontFamily: 'inherit' },
      labels: ['Critique', 'Élevé', 'Moyen', 'Faible'],
      colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a'],
      legend: { position: 'bottom', fontFamily: 'inherit', fontSize: '12px' },
      dataLabels: { enabled: true, style: { fontSize: '12px' } },
      plotOptions: { pie: { donut: { size: '64%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${total}` } } } } },
      tooltip: { y: { formatter: (value: number) => `${value} articles` } },
      responsive: [{ breakpoint: 640, options: { legend: { position: 'bottom' } } }],
    };
  }

  trackByModel(_: number, model: ModelRegistryItem): string {
    return model.id;
  }

  trackByKey(_: number, task: { key: string }): string {
    return task.key;
  }

  trackById(_: number, item: { product_id: string }): string {
    return item.product_id;
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      done: 'badge-ok', running: 'badge-info', error: 'badge-error', pending: 'badge-warn',
    };
    return map[status] ?? 'badge-info';
  }

  trainingStatusLabel(status: string): string {
    if (status === 'done') return 'Terminé';
    if (status === 'running') return 'En cours';
    if (status === 'pending') return 'En attente';
    if (status === 'error') return 'Erreur';
    return 'Inconnu';
  }
}
