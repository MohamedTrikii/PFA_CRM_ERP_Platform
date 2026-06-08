import { Component, OnInit, inject } from '@angular/core';
import { NgIf, NgFor, DatePipe, DecimalPipe } from '@angular/common';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatTableModule }           from '@angular/material/table';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { RouterModule }             from '@angular/router';
import { PortalService, DevisRequestSummary } from '../../../core/services/portal.service';
import { DevisSummary, FactureSummary }        from '../../../core/services/sales.service';

type BadgeClass = 'chip-green' | 'chip-gray' | 'chip-blue' | 'chip-orange' | 'chip-red' | 'chip-violet';

const DEVIS_BADGE: Record<string, BadgeClass> = {
  BROUILLON:  'chip-gray',
  ENVOYE:     'chip-blue',
  ACCEPTE:    'chip-green',
  REFUSE:     'chip-red',
  EXPIRE:     'chip-orange',
};

const FACTURE_BADGE: Record<string, BadgeClass> = {
  BROUILLON:              'chip-gray',
  ENVOYEE:                'chip-blue',
  PARTIELLEMENT_PAYEE:    'chip-orange',
  PAYEE:                  'chip-green',
  EN_RETARD:              'chip-red',
  ANNULEE:                'chip-gray',
};

const REQUEST_BADGE: Record<string, BadgeClass> = {
  EN_ATTENTE:  'chip-orange',
  EN_ETUDE:    'chip-blue',
  DEVIS_CREE:  'chip-green',
  REFUSE:      'chip-red',
};

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe,
    MatTabsModule, MatTableModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule,
    RouterModule,
  ],
  styles: [`
    .portal-wrap {
      padding: 1.75rem;
      animation: fadeInUp .3s var(--ease) both;
    }

    .portal-header {
      display: flex;
      align-items: center;
      gap: .875rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--clr-border);
    }

    .portal-header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--clr-text);
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .tab-content {
      padding-top: 1rem;
    }

    .tab-spinner {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .empty-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: var(--clr-muted);
      gap: .5rem;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; opacity: .25; }
      p { margin: 0; }
    }
  `],
  template: `
    <div class="portal-wrap">

      <div class="portal-header">
        <mat-icon style="color:var(--clr-primary);font-size:1.625rem;width:1.625rem;height:1.625rem">
          account_circle
        </mat-icon>
        <h1>Mon espace client</h1>
      </div>

      <mat-tab-group animationDuration="200ms" color="primary">

        <!-- Devis -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">description</mat-icon>
            Mes devis&nbsp;<span class="badge">{{ devis.length }}</span>
          </ng-template>
          <div class="tab-content">
            @if (loading) {
              <div class="tab-spinner"><mat-spinner diameter="36"/></div>
            } @else if (!devis.length) {
              <div class="empty-tab">
                <mat-icon>description</mat-icon>
                <p>Aucun devis pour le moment.</p>
              </div>
            } @else {
              <div class="erp-table-wrap">
                <table mat-table [dataSource]="devis" class="w-full">
                  <ng-container matColumnDef="reference">
                    <th mat-header-cell *matHeaderCellDef>Référence</th>
                    <td mat-cell *matCellDef="let r">
                      <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ r.reference }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let r">
                      <span [class]="devisBadge(r.status)">{{ r.status }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="totalTtc">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">Montant TTC</th>
                    <td mat-cell *matCellDef="let r" style="text-align:right;font-weight:600">
                      {{ r.totalTtc | number:'1.2-2' }}&nbsp;TND
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="createdAt">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                      {{ r.createdAt | date:'dd/MM/yyyy' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let r">
                      <button mat-icon-button color="primary" matTooltip="Télécharger PDF"
                              (click)="downloadDevis(r.id)">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="devisCols"></tr>
                  <tr mat-row *matRowDef="let r; columns: devisCols"></tr>
                </table>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Factures -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">receipt_long</mat-icon>
            Mes factures&nbsp;<span class="badge">{{ factures.length }}</span>
          </ng-template>
          <div class="tab-content">
            @if (loading) {
              <div class="tab-spinner"><mat-spinner diameter="36"/></div>
            } @else if (!factures.length) {
              <div class="empty-tab">
                <mat-icon>receipt_long</mat-icon>
                <p>Aucune facture pour le moment.</p>
              </div>
            } @else {
              <div class="erp-table-wrap">
                <table mat-table [dataSource]="factures" class="w-full">
                  <ng-container matColumnDef="reference">
                    <th mat-header-cell *matHeaderCellDef>Référence</th>
                    <td mat-cell *matCellDef="let r">
                      <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ r.reference }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let r">
                      <span [class]="factureBadge(r.status)">{{ r.status }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="totalTtc">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">Total TTC</th>
                    <td mat-cell *matCellDef="let r" style="text-align:right;font-weight:600">
                      {{ r.totalTtc | number:'1.2-2' }}&nbsp;TND
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="amountPaid">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">Payé</th>
                    <td mat-cell *matCellDef="let r" style="text-align:right;color:var(--clr-success);font-weight:500">
                      {{ r.amountPaid | number:'1.2-2' }}&nbsp;TND
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="dueDate">
                    <th mat-header-cell *matHeaderCellDef>Échéance</th>
                    <td mat-cell *matCellDef="let r"
                        [style.color]="isOverdue(r) ? 'var(--clr-danger)' : 'var(--clr-text-2)'">
                      {{ r.dueDate | date:'dd/MM/yyyy' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let r">
                      <button mat-icon-button color="primary" matTooltip="Télécharger PDF"
                              (click)="downloadFacture(r.id)">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="factureCols"></tr>
                  <tr mat-row *matRowDef="let r; columns: factureCols"
                      [style.background]="isOverdue(r) ? '#fff5f5' : null"></tr>
                </table>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Requests -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">send</mat-icon>
            Mes demandes&nbsp;<span class="badge">{{ requests.length }}</span>
          </ng-template>
          <div class="tab-content">
            @if (loading) {
              <div class="tab-spinner"><mat-spinner diameter="36"/></div>
            } @else if (!requests.length) {
              <div class="empty-tab">
                <mat-icon>send</mat-icon>
                <p>Aucune demande soumise.</p>
              </div>
            } @else {
              <div class="erp-table-wrap">
                <table mat-table [dataSource]="requests" class="w-full">
                  <ng-container matColumnDef="projectType">
                    <th mat-header-cell *matHeaderCellDef>Type de projet</th>
                    <td mat-cell *matCellDef="let r" style="font-weight:500">{{ r.projectType }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let r">
                      <span [class]="requestBadge(r.status)">{{ r.status }}</span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="itemCount">
                    <th mat-header-cell *matHeaderCellDef style="text-align:center">Éléments</th>
                    <td mat-cell *matCellDef="let r" style="text-align:center;color:var(--clr-text-2)">
                      {{ r.itemCount }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="createdAt">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                      {{ r.createdAt | date:'dd/MM/yyyy' }}
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="requestCols"></tr>
                  <tr mat-row *matRowDef="let r; columns: requestCols"></tr>
                </table>
              </div>
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
})
export class CustomerPortalComponent implements OnInit {
  private readonly portalSvc = inject(PortalService);

  devis:    DevisSummary[]         = [];
  factures: FactureSummary[]       = [];
  requests: DevisRequestSummary[]  = [];
  loading = true;

  devisCols   = ['reference', 'status', 'totalTtc', 'createdAt', 'actions'];
  factureCols = ['reference', 'status', 'totalTtc', 'amountPaid', 'dueDate', 'actions'];
  requestCols = ['projectType', 'status', 'itemCount', 'createdAt'];

  ngOnInit() {
    Promise.all([
      this.portalSvc.myDevis().toPromise(),
      this.portalSvc.myFactures().toPromise(),
      this.portalSvc.myRequests().toPromise(),
    ]).then(([d, f, r]) => {
      this.devis    = d ?? [];
      this.factures = f ?? [];
      this.requests = r ?? [];
      this.loading  = false;
    }).catch(() => { this.loading = false; });
  }

  downloadDevis(id: string)   { this.portalSvc.downloadDevisPdf(id).subscribe(b => download(b, 'devis.pdf')); }
  downloadFacture(id: string) { this.portalSvc.downloadFacturePdf(id).subscribe(b => download(b, 'facture.pdf')); }

  isOverdue(f: FactureSummary): boolean {
    return f.status === 'EN_RETARD' || (f.dueDate != null && new Date(f.dueDate) < new Date() && f.status !== 'PAYEE');
  }

  devisBadge(s: string):   BadgeClass { return DEVIS_BADGE[s]   ?? 'chip-gray'; }
  factureBadge(s: string): BadgeClass { return FACTURE_BADGE[s] ?? 'chip-gray'; }
  requestBadge(s: string): BadgeClass { return REQUEST_BADGE[s] ?? 'chip-gray'; }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
