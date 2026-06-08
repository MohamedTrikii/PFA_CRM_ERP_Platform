import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { MatTableModule }        from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule }         from '@angular/material/icon';
import { SalesService, CommandeResponse } from '../../../core/services/sales.service';

type BadgeClass = 'chip-gray' | 'chip-blue' | 'chip-green' | 'chip-red' | 'chip-orange' | 'chip-violet';

const STATUS_BADGE: Record<string, BadgeClass> = {
  EN_ATTENTE:     'chip-gray',
  CONFIRMEE:      'chip-blue',
  EN_PREPARATION: 'chip-orange',
  LIVREE:         'chip-green',
  ANNULEE:        'chip-red',
};

@Component({
  selector: 'erp-commande-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule, MatPaginatorModule, MatIconModule],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>shopping_bag</mat-icon> Commandes</h1>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="commandes" class="w-full">

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Référence</th>
              <td mat-cell *matCellDef="let c">
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ c.reference }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let c">
                <span [class]="statusBadge(c.status)">{{ c.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="devisId">
              <th mat-header-cell *matHeaderCellDef>Devis origine</th>
              <td mat-cell *matCellDef="let c"
                  style="font-family:ui-monospace,monospace;font-size:.8125rem;color:var(--clr-muted)">
                {{ c.devisId }}
              </td>
            </ng-container>

            <ng-container matColumnDef="expectedDeliveryDate">
              <th mat-header-cell *matHeaderCellDef>Livraison prévue</th>
              <td mat-cell *matCellDef="let c" style="color:var(--clr-text-2)">
                {{ c.expectedDeliveryDate | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let c" style="color:var(--clr-muted)">
                {{ c.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let c; columns: columns"></tr>
          </table>

          @if (!commandes.length) {
            <div class="erp-empty">
              <mat-icon>shopping_bag</mat-icon>
              <p class="empty-title">Aucune commande trouvée</p>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class CommandeListComponent implements OnInit {
  private readonly salesSvc = inject(SalesService);

  commandes: CommandeResponse[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  columns  = ['reference', 'status', 'devisId', 'expectedDeliveryDate', 'createdAt'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getCommandes(page, this.pageSize).subscribe({
      next: p => { this.commandes = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }
}
