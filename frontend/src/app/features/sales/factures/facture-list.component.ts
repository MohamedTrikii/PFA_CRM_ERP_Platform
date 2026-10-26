import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule }        from '@angular/material/table';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatSelectModule }       from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesService, FactureSummary } from '../../../core/services/sales.service';
import { ReferenceService, RefValue } from '../../../core/services/reference.service';

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
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatPaginatorModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  styles: [`
    .encaisser-row { display:flex; gap:.5rem; align-items:center; }
    .encaisser-row mat-form-field { width: 120px; }
  `],
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

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let f">
                @if (f.status !== 'PAYEE' && f.status !== 'ANNULEE') {
                  @if (encaisserId === f.id) {
                    <div class="encaisser-row" [formGroup]="encaisserForm">
                      <mat-form-field appearance="outline">
                        <mat-label>Montant</mat-label>
                        <input matInput type="number" formControlName="amount" min="0.01" step="0.01">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Mode</mat-label>
                        <mat-select formControlName="paymentMethod">
                          @for (v of paymentMethods; track v.id) {
                            <mat-option [value]="v.code">{{ v.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <button mat-icon-button color="primary"
                              [disabled]="encaisserForm.invalid || saving"
                              (click)="submitEncaisser(f.id, f.totalTtc - f.amountPaid)">
                        <mat-icon>check</mat-icon>
                      </button>
                      <button mat-icon-button (click)="encaisserId = null">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  } @else {
                    <button mat-mini-button color="accent" (click)="openEncaisser(f.id)">
                      <mat-icon>payments</mat-icon> Encaisser
                    </button>
                  }
                }
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
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);
  private readonly refSvc   = inject(ReferenceService);

  factures:       FactureSummary[] = [];
  paymentMethods: RefValue[]       = [];
  loading     = true;
  saving      = false;
  total       = 0;
  pageSize    = 20;
  encaisserId: string | null = null;
  columns     = ['reference', 'status', 'dueDate', 'totalTtc', 'amountPaid', 'remaining', 'createdAt', 'actions'];

  encaisserForm = this.fb.group({
    amount:        [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['VIREMENT', Validators.required],
  });

  ngOnInit() {
    this.load(0);
    this.refSvc.getValues('TYPE_PAIEMENT').subscribe(vals => this.paymentMethods = vals);
  }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getFactures(page, this.pageSize).subscribe({
      next: p => { this.factures = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openEncaisser(id: string) {
    this.encaisserId = id;
    this.encaisserForm.reset({ amount: null, paymentMethod: 'VIREMENT' });
  }

  submitEncaisser(id: string, maxAmount: number) {
    if (this.encaisserForm.invalid) return;
    const { amount, paymentMethod } = this.encaisserForm.value;
    if ((amount ?? 0) > maxAmount) {
      this.snack.open('Montant supérieur au solde restant', 'Fermer', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.salesSvc.encaisserFacture(id, amount!, paymentMethod!).subscribe({
      next: () => {
        this.saving = false;
        this.encaisserId = null;
        this.snack.open('Paiement enregistré', 'OK', { duration: 3000 });
        this.load(0);
      },
      error: () => {
        this.saving = false;
        this.snack.open('Erreur lors de l\'encaissement', 'Fermer', { duration: 4000 });
      },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }

  isOverdue(f: FactureSummary): boolean {
    return f.status === 'EN_RETARD'
      || (f.amountPaid < f.totalTtc && !!f.dueDate && new Date(f.dueDate) < new Date());
  }
}
