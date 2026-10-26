import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { MatTableModule }        from '@angular/material/table';
import { MatButtonModule }       from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule }         from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesService, LivraisonSummary } from '../../../core/services/sales.service';

type BadgeClass = 'chip-gray' | 'chip-blue' | 'chip-green' | 'chip-red' | 'chip-orange' | 'chip-violet';

const STATUS_BADGE: Record<string, BadgeClass> = {
  EN_PREPARATION: 'chip-gray',
  PLANIFIEE:      'chip-blue',
  EN_COURS:       'chip-orange',
  LIVREE:         'chip-green',
  ANNULEE:        'chip-red',
};

@Component({
  selector: 'erp-livraison-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatProgressSpinnerModule, MatPaginatorModule, MatIconModule, MatSnackBarModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>local_shipping</mat-icon> Livraisons</h1>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="livraisons" class="w-full">

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Référence</th>
              <td mat-cell *matCellDef="let l">
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ l.reference }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let l">
                <span [class]="statusBadge(l.status)">{{ l.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="commandeId">
              <th mat-header-cell *matHeaderCellDef>Commande</th>
              <td mat-cell *matCellDef="let l"
                  style="font-family:ui-monospace,monospace;font-size:.8125rem;color:var(--clr-muted)">
                {{ l.commandeId }}
              </td>
            </ng-container>

            <ng-container matColumnDef="deliveryDate">
              <th mat-header-cell *matHeaderCellDef>Date livraison</th>
              <td mat-cell *matCellDef="let l" style="color:var(--clr-text-2)">
                {{ l.deliveryDate | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Créée le</th>
              <td mat-cell *matCellDef="let l" style="color:var(--clr-muted)">
                {{ l.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let l">
                <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                  <button mat-mini-button color="primary"
                          *ngIf="l.status === 'PLANIFIEE'"
                          [disabled]="actionId === l.id"
                          (click)="demarrer(l.id)">
                    <mat-icon>play_arrow</mat-icon> Démarrer
                  </button>
                  <button mat-mini-button color="accent"
                          *ngIf="l.status === 'EN_COURS'"
                          [disabled]="actionId === l.id"
                          (click)="confirmer(l.id)">
                    <mat-icon>local_shipping</mat-icon> Livrer
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let l; columns: columns"></tr>
          </table>

          @if (!livraisons.length) {
            <div class="erp-empty">
              <mat-icon>local_shipping</mat-icon>
              <p class="empty-title">Aucune livraison trouvée</p>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class LivraisonListComponent implements OnInit {
  private readonly salesSvc = inject(SalesService);
  private readonly snack    = inject(MatSnackBar);

  livraisons: LivraisonSummary[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  actionId: string | null = null;
  columns  = ['reference', 'status', 'commandeId', 'deliveryDate', 'createdAt', 'actions'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getLivraisons(page, this.pageSize).subscribe({
      next: p => { this.livraisons = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  /** PLANIFIEE → EN_COURS: fetch lines, deliver at full quantity */
  demarrer(id: string) {
    this.actionId = id;
    this.salesSvc.getLivraisonById(id).subscribe({
      next: liv => {
        const body = {
          deliveryDate: new Date().toISOString().substring(0, 10),
          lines: liv.lines.map(l => ({ lineId: l.id, quantityDelivered: l.quantityOrdered })),
        };
        this.salesSvc.deliverLivraison(id, body).subscribe({
          next: () => { this.actionId = null; this.snack.open('Livraison démarrée (EN_COURS)', 'OK', { duration: 3000 }); this.load(0); },
          error: () => { this.actionId = null; this.snack.open('Impossible de démarrer la livraison', 'Fermer', { duration: 4000 }); },
        });
      },
      error: () => { this.actionId = null; this.snack.open('Erreur chargement livraison', 'Fermer', { duration: 4000 }); },
    });
  }

  /** EN_COURS → LIVREE: triggers stock SORTIE via RabbitMQ */
  confirmer(id: string) {
    this.actionId = id;
    this.salesSvc.confirmLivraison(id).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Livraison confirmée — stock mis à jour automatiquement', 'OK', { duration: 3500 });
        this.load(0);
      },
      error: () => {
        this.actionId = null;
        this.snack.open('Impossible de confirmer la livraison', 'Fermer', { duration: 4000 });
      },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }
}
