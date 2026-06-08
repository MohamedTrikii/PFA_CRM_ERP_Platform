import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService, StockMovementResponse } from '../../../core/services/inventory.service';

type BadgeClass = 'chip-green' | 'chip-red' | 'chip-blue' | 'chip-gray';

const TYPE_BADGE: Record<string, BadgeClass> = {
  ENTREE:      'chip-green',
  SORTIE:      'chip-red',
  AJUSTEMENT:  'chip-blue',
};

@Component({
  selector: 'app-movement-history',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule, MatPaginatorModule, MatIconModule],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>inventory_2</mat-icon> Mouvements de stock</h1>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="movements" class="w-full">

            <ng-container matColumnDef="occurredAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                {{ r.occurredAt | date:'dd/MM/yyyy HH:mm' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="productReference">
              <th mat-header-cell *matHeaderCellDef>Produit</th>
              <td mat-cell *matCellDef="let r">
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">
                  {{ r.productReference }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="movementType">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let r">
                <span [class]="typeBadge(r.movementType)">{{ r.movementType }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">Quantité</th>
              <td mat-cell *matCellDef="let r" style="text-align:right;font-weight:700"
                  [style.color]="r.movementType === 'ENTREE' ? 'var(--clr-success)' : r.movementType === 'SORTIE' ? 'var(--clr-danger)' : 'var(--clr-info)'">
                {{ r.movementType === 'SORTIE' ? '−' : '+' }}{{ r.quantity | number:'1.3-3' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="referenceType">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                {{ r.referenceType }}
              </td>
            </ng-container>

            <ng-container matColumnDef="notes">
              <th mat-header-cell *matHeaderCellDef>Notes</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-muted);font-size:.8125rem">
                {{ r.notes }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let r; columns: columns"></tr>
          </table>

          @if (!movements.length) {
            <div class="erp-empty">
              <mat-icon>inventory_2</mat-icon>
              <p class="empty-title">Aucun mouvement trouvé</p>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[20,50,100]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class MovementHistoryComponent implements OnInit {
  private readonly inventorySvc = inject(InventoryService);

  movements: StockMovementResponse[] = [];
  loading = true;
  total = 0;
  pageSize = 50;
  columns = ['occurredAt', 'productReference', 'movementType', 'quantity', 'referenceType', 'notes'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.inventorySvc.getMovements(page, this.pageSize).subscribe({
      next: p => { this.movements = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  typeBadge(t: string): BadgeClass { return TYPE_BADGE[t] ?? 'chip-gray'; }
}
