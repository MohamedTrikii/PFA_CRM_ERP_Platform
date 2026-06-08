import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { MatTableModule }        from '@angular/material/table';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { SalesService, FactureSummary } from '../../../core/services/sales.service';

type BadgeClass = 'chip-gray' | 'chip-blue' | 'chip-green' | 'chip-red' | 'chip-orange' | 'chip-violet';

const STATUS_BADGE: Record<string, BadgeClass> = {
  BROUILLON:           'chip-gray',
  EMISE:               'chip-blue',
  PARTIELLEMENT_PAYEE: 'chip-orange',
  PAYEE:               'chip-green',
  EN_RETARD:           'chip-red',
  ANNULEE:             'chip-red',
};

@Component({
  selector: 'erp-facture-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatPaginatorModule, MatTooltipModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>description</mat-icon> Factures</h1>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="factures" class="w-full">

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Référence</th>
              <td mat-cell *matCellDef="let f">
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ f.reference }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let f">
                <span [class]="statusBadge(f.status)">{{ f.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="dueDate">
              <th mat-header-cell *matHeaderCellDef>Échéance</th>
              <td mat-cell *matCellDef="let f"
                  [style.color]="isOverdue(f) ? 'var(--clr-danger)' : 'var(--clr-text-2)'">
                {{ f.dueDate | date:'dd/MM/yyyy' }}
                @if (isOverdue(f)) {
                  <mat-icon style="font-size:.9rem;vertical-align:middle;margin-left:.25rem"
                            matTooltip="Retard de paiement">warning</mat-icon>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="totalTtc">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">Total TTC</th>
              <td mat-cell *matCellDef="let f" style="text-align:right;font-weight:600">
                {{ f.totalTtc | number:'1.2-2' }}
                <span style="font-size:.75rem;color:var(--clr-muted)"> TND</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="amountPaid">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">Encaissé</th>
              <td mat-cell *matCellDef="let f" style="text-align:right"
                  [style.color]="f.amountPaid >= f.totalTtc ? 'var(--clr-success)' : f.amountPaid > 0 ? 'var(--clr-warning)' : 'var(--clr-muted)'">
                {{ f.amountPaid | number:'1.2-2' }} TND
              </td>
            </ng-container>

            <ng-container matColumnDef="remaining">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">Restant</th>
              <td mat-cell *matCellDef="let f" style="text-align:right;font-weight:700"
                  [style.color]="(f.totalTtc - f.amountPaid) > 0 ? 'var(--clr-danger)' : 'var(--clr-success)'">
                {{ (f.totalTtc - f.amountPaid) | number:'1.2-2' }} TND
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let f" style="color:var(--clr-muted)">
                {{ f.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let f; columns: columns"
                [style.background]="isOverdue(f) ? '#fff5f5' : null"></tr>
          </table>

          @if (!factures.length) {
            <div class="erp-empty">
              <mat-icon>description</mat-icon>
              <p class="empty-title">Aucune facture trouvée</p>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class FactureListComponent implements OnInit {
  private readonly salesSvc = inject(SalesService);

  factures: FactureSummary[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  columns  = ['reference', 'status', 'dueDate', 'totalTtc', 'amountPaid', 'remaining', 'createdAt'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getFactures(page, this.pageSize).subscribe({
      next: p => { this.factures = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }

  isOverdue(f: FactureSummary): boolean {
    return f.status === 'EN_RETARD'
      || (f.amountPaid < f.totalTtc && !!f.dueDate && new Date(f.dueDate) < new Date());
  }
}
