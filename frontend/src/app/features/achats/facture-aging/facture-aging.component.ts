import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchatService, AgingReport, AgingBucket } from '../../../core/services/achat.service';

@Component({
  selector: 'app-facture-aging',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>Vieillissement des créances</h2>
    </div>

    @if (report) {
      <div class="kpi-row">
        <div class="kpi-card kpi-neutral">
          <span class="kpi-label">Total impayé</span>
          <span class="kpi-value">{{ report.totalOutstanding | number:'1.2-2' }} TND</span>
        </div>
      </div>

      <div class="aging-grid">
        @for (bucket of buckets; track bucket.label) {
          <div class="aging-card" [class]="bucket.cssClass">
            <div class="aging-label">{{ bucket.label }}</div>
            <div class="aging-count">{{ bucket.count }} facture{{ bucket.count !== 1 ? 's' : '' }}</div>
            <div class="aging-amount">{{ bucket.amount | number:'1.2-2' }} TND</div>
            <div class="aging-bar">
              <div class="aging-bar-fill"
                   [style.width.%]="report.totalOutstanding > 0 ? (bucket.amount / report.totalOutstanding) * 100 : 0">
              </div>
            </div>
          </div>
        }
      </div>
    } @else {
      <p class="loading">Chargement…</p>
    }
  `,
  styles: [`
    .aging-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .aging-card { background: var(--surface); border-radius: 8px; padding: 1.25rem; border-left: 4px solid var(--border); }
    .aging-card.ok    { border-color: #22c55e; }
    .aging-card.warn1 { border-color: #facc15; }
    .aging-card.warn2 { border-color: #f97316; }
    .aging-card.warn3 { border-color: #ef4444; }
    .aging-card.crit  { border-color: #7f1d1d; }
    .aging-label  { font-size: .8rem; color: var(--text-secondary); margin-bottom: .25rem; }
    .aging-count  { font-size: .9rem; color: var(--text-secondary); }
    .aging-amount { font-size: 1.4rem; font-weight: 700; margin: .5rem 0; }
    .aging-bar    { height: 6px; background: var(--border); border-radius: 3px; }
    .aging-bar-fill { height: 100%; background: currentColor; border-radius: 3px; transition: width .4s; }
  `],
})
export class FactureAgingComponent implements OnInit {
  private achatService = inject(AchatService);

  report: AgingReport | null = null;

  buckets: Array<AgingBucket & { cssClass: string }> = [];

  ngOnInit() {
    this.achatService.getAgingSummary().subscribe(r => {
      this.report = r;
      this.buckets = [
        { ...r.current,   cssClass: 'ok'    },
        { ...r.days1_30,  cssClass: 'warn1' },
        { ...r.days31_60, cssClass: 'warn2' },
        { ...r.days61_90, cssClass: 'warn3' },
        { ...r.over90,    cssClass: 'crit'  },
      ];
    });
  }
}
