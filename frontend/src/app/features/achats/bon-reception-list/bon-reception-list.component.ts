import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { MatTableModule }        from '@angular/material/table';
import { MatButtonModule }       from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule }         from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AchatService, BonReceptionSummary } from '../../../core/services/achat.service';

type BadgeClass = 'chip-gray' | 'chip-blue' | 'chip-green' | 'chip-red' | 'chip-orange';

const STATUS_BADGE: Record<string, BadgeClass> = {
  EN_COURS: 'chip-orange',
  CONFIRME: 'chip-green',
  ANNULE:   'chip-red',
};

@Component({
  selector: 'erp-bon-reception-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatProgressSpinnerModule, MatPaginatorModule, MatIconModule, MatSnackBarModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>inventory</mat-icon> Bons de réception</h1>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="bons" class="w-full">

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Référence</th>
              <td mat-cell *matCellDef="let b">
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ b.reference }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let b">
                <span [class]="statusBadge(b.status)">{{ b.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="bonCommandeId">
              <th mat-header-cell *matHeaderCellDef>Bon de commande</th>
              <td mat-cell *matCellDef="let b"
                  style="font-family:ui-monospace,monospace;font-size:.8125rem;color:var(--clr-muted)">
                {{ b.bonCommandeId }}
              </td>
            </ng-container>

            <ng-container matColumnDef="dateReception">
              <th mat-header-cell *matHeaderCellDef>Date réception</th>
              <td mat-cell *matCellDef="let b" style="color:var(--clr-text-2)">
                {{ b.dateReception | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Créé le</th>
              <td mat-cell *matCellDef="let b" style="color:var(--clr-muted)">
                {{ b.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let b">
                <div style="display:flex;gap:.4rem">
                  <button mat-mini-button color="primary"
                          *ngIf="b.status === 'EN_COURS'"
                          [disabled]="actionId === b.id"
                          (click)="confirm(b.id)">
                    <mat-icon>check_circle</mat-icon> Confirmer
                  </button>
                  <button mat-mini-button color="warn"
                          *ngIf="b.status === 'EN_COURS'"
                          [disabled]="actionId === b.id"
                          (click)="cancel(b.id)">
                    <mat-icon>cancel</mat-icon> Annuler
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let b; columns: columns"></tr>
          </table>

          @if (!bons.length) {
            <div class="erp-empty">
              <mat-icon>inventory</mat-icon>
              <p class="empty-title">Aucun bon de réception</p>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class BonReceptionListComponent implements OnInit {
  private readonly achatSvc = inject(AchatService);
  private readonly snack    = inject(MatSnackBar);

  bons: BonReceptionSummary[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  actionId: string | null = null;
  columns  = ['reference', 'status', 'bonCommandeId', 'dateReception', 'createdAt', 'actions'];

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.achatSvc.getBonsReception(page, this.pageSize).subscribe({
      next: p => { this.bons = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  confirm(id: string) {
    this.actionId = id;
    this.achatSvc.confirmBonReception(id).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Réception confirmée — stock mis à jour (ENTREE)', 'OK', { duration: 3500 });
        this.load(0);
      },
      error: () => {
        this.actionId = null;
        this.snack.open('Impossible de confirmer la réception', 'Fermer', { duration: 4000 });
      },
    });
  }

  cancel(id: string) {
    this.actionId = id;
    this.achatSvc.cancelBonReception(id).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Réception annulée', 'OK', { duration: 3000 });
        this.load(0);
      },
      error: () => {
        this.actionId = null;
        this.snack.open('Impossible d\'annuler la réception', 'Fermer', { duration: 4000 });
      },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }
}
