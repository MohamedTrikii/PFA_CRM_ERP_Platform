import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { MatTableModule }        from '@angular/material/table';
import { MatButtonModule }       from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule }         from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatProgressSpinnerModule, MatPaginatorModule, MatIconModule, MatSnackBarModule,
  ],
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

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let c">
                <button mat-mini-button color="primary"
                        *ngIf="c.status === 'EN_ATTENTE'"
                        [disabled]="actionId === c.id"
                        (click)="confirm(c.id)">
                  <mat-icon>check_circle</mat-icon> Confirmer
                </button>
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
  private readonly snack    = inject(MatSnackBar);

  commandes: CommandeResponse[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  actionId: string | null = null;
  columns  = ['reference', 'status', 'devisId', 'expectedDeliveryDate', 'createdAt', 'actions'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getCommandes(page, this.pageSize).subscribe({
      next: p => { this.commandes = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  confirm(id: string) {
    this.actionId = id;
    this.salesSvc.transitionCommande(id, 'CONFIRMEE').subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Commande confirmée — facture créée automatiquement', 'OK', { duration: 3500 });
        this.load(0);
      },
      error: () => {
        this.actionId = null;
        this.snack.open('Impossible de confirmer la commande', 'Fermer', { duration: 4000 });
      },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }
}
