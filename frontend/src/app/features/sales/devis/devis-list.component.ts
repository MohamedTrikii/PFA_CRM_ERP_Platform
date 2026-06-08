import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, AbstractControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { SalesService, DevisSummary, ProductResponse } from '../../../core/services/sales.service';
import { PriceSuggestionDialogComponent } from './price-suggestion-dialog.component';

type BadgeClass = 'chip-gray' | 'chip-blue' | 'chip-green' | 'chip-red' | 'chip-orange' | 'chip-violet';

const STATUS_BADGE: Record<string, BadgeClass> = {
  BROUILLON: 'chip-gray',
  ENVOYE:    'chip-blue',
  ACCEPTE:   'chip-green',
  REFUSE:    'chip-red',
  EXPIRE:    'chip-orange',
  ANNULE:    'chip-red',
};

interface ClientOption { id: string; label: string; }

@Component({
  selector: 'app-devis-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatIconModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatDividerModule,
  ],
  styles: [`
    .create-card {
      background: #fff;
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: var(--r-md, 10px);
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,.08));
      animation: slideDown .2s ease both;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .header-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .5rem 1rem;
    }
    .line-row {
      display: grid;
      grid-template-columns: 2fr 100px 100px 40px;
      gap: .5rem;
      align-items: start;
      margin-bottom: .25rem;
    }
    .lines-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 1rem 0 .5rem;
    }
    .lines-label {
      font-size: .875rem;
      font-weight: 600;
      color: var(--clr-text-1, #1e293b);
    }
    .form-actions {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin-top: 1rem;
    }
    .card-title {
      margin: 0 0 1rem;
      font-size: .9375rem;
      font-weight: 600;
      color: var(--clr-text-1, #1e293b);
    }
  `],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>receipt_long</mat-icon> Devis</h1>
        <div class="page-actions">
          <button mat-stroked-button color="primary" (click)="openPriceSuggestion()">
            <mat-icon>psychology</mat-icon> Suggestion prix IA
          </button>
          <button mat-raised-button color="primary" (click)="toggleCreate()">
            <mat-icon>{{ showCreate ? 'close' : 'add' }}</mat-icon>
            {{ showCreate ? 'Annuler' : 'Nouveau devis' }}
          </button>
        </div>
      </div>

      @if (showCreate) {
        <div class="create-card">
          <p class="card-title">Nouveau devis</p>
          <form [formGroup]="createForm" (ngSubmit)="onCreate()">

            <!-- Header fields -->
            <div class="header-grid">
              <mat-form-field appearance="outline">
                <mat-label>Client *</mat-label>
                <mat-select formControlName="clientId">
                  @if (clientsLoading) {
                    <mat-option disabled>Chargement…</mat-option>
                  }
                  @for (c of clients; track c.id) {
                    <mat-option [value]="c.id">{{ c.label }}</mat-option>
                  }
                  @if (!clientsLoading && !clients.length) {
                    <mat-option disabled>Aucun client disponible</mat-option>
                  }
                </mat-select>
                <mat-error>Sélectionnez un client</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Valide jusqu'au</mat-label>
                <input matInput formControlName="validUntil" type="date">
              </mat-form-field>

              <mat-form-field appearance="outline" style="grid-column:1/-1">
                <mat-label>Notes</mat-label>
                <textarea matInput formControlName="notes" rows="2"
                          placeholder="Remarques, conditions particulières…"></textarea>
              </mat-form-field>
            </div>

            <!-- Lines -->
            <div class="lines-header">
              <span class="lines-label">Lignes produits *</span>
              <button mat-stroked-button type="button" (click)="addLine()">
                <mat-icon>add</mat-icon> Ajouter ligne
              </button>
            </div>

            @if (productsLoading) {
              <div style="text-align:center;padding:.75rem;color:var(--clr-muted)">
                <mat-spinner diameter="20" style="display:inline-block"/>
                Chargement des produits…
              </div>
            }

            <div formArrayName="lines">
              @for (line of linesArray.controls; track line; let i = $index) {
                <div [formGroupName]="i" class="line-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Produit *</mat-label>
                    <mat-select formControlName="productId">
                      @for (p of products; track p.id) {
                        <mat-option [value]="p.id">{{ p.name }}</mat-option>
                      }
                    </mat-select>
                    <mat-error>Obligatoire</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Qté *</mat-label>
                    <input matInput formControlName="quantity" type="number" min="0.001" step="1">
                    <mat-error>≥ 0</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Remise %</mat-label>
                    <input matInput formControlName="discountPct" type="number" min="0" max="100">
                  </mat-form-field>

                  <button mat-icon-button color="warn" type="button"
                          [disabled]="linesArray.length <= 1"
                          (click)="removeLine(i)"
                          style="margin-top:.25rem">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="createForm.invalid || saving">
                @if (saving) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                } @else {
                  <mat-icon>save</mat-icon>
                }
                Créer le devis
              </button>
              <button mat-stroked-button type="button" (click)="toggleCreate()">Annuler</button>
            </div>
          </form>
        </div>
      }

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
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
                <span [class]="statusBadge(r.status)">{{ r.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="validUntil">
              <th mat-header-cell *matHeaderCellDef>Valide jusqu'au</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                {{ r.validUntil | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="totalTtc">
              <th mat-header-cell *matHeaderCellDef>Total TTC</th>
              <td mat-cell *matCellDef="let r" style="text-align:right;font-weight:600">
                {{ r.totalTtc | number:'1.2-2' }}
                <span style="font-size:.75rem;color:var(--clr-muted)"> TND</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-muted)">
                {{ r.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let r">
                <div style="display:flex; flex-wrap:wrap; gap:.5rem; align-items:center;">
                  <button mat-mini-button color="primary" *ngIf="r.status === 'BROUILLON'"
                          (click)="transitionDevis(r.id, 'ENVOYE')"
                          [disabled]="transitioningId === r.id">
                    <mat-icon>send</mat-icon>
                    Envoyer
                  </button>
                  <button mat-mini-button color="primary" *ngIf="r.status === 'ENVOYE'"
                          (click)="transitionDevis(r.id, 'ACCEPTE')"
                          [disabled]="transitioningId === r.id">
                    <mat-icon>check</mat-icon>
                    Accepter
                  </button>
                  <button mat-mini-button color="warn" *ngIf="r.status === 'ENVOYE'"
                          (click)="transitionDevis(r.id, 'REFUSE')"
                          [disabled]="transitioningId === r.id">
                    <mat-icon>close</mat-icon>
                    Refuser
                  </button>
                  <button mat-mini-button color="accent" *ngIf="r.status === 'ENVOYE'"
                          (click)="transitionDevis(r.id, 'EXPIRE')"
                          [disabled]="transitioningId === r.id">
                    <mat-icon>hourglass_empty</mat-icon>
                    Expirer
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let r; columns: columns"></tr>
          </table>

          @if (!devis.length) {
            <div class="erp-empty">
              <mat-icon>receipt_long</mat-icon>
              <p class="empty-title">Aucun devis trouvé</p>
              <span class="empty-sub">Cliquez sur "Nouveau devis" pour commencer.</span>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class DevisListComponent implements OnInit {
  private readonly salesSvc = inject(SalesService);
  private readonly http     = inject(HttpClient);
  private readonly dialog   = inject(MatDialog);
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);

  devis: DevisSummary[]   = [];
  clients: ClientOption[] = [];
  products: ProductResponse[] = [];
  loading        = true;
  clientsLoading = false;
  productsLoading = false;
  saving         = false;
  showCreate     = false;
  total          = 0;
  pageSize       = 20;
  columns        = ['reference', 'status', 'validUntil', 'totalTtc', 'createdAt', 'actions'];
  transitioningId: string | null = null;

  createForm = this.fb.group({
    clientId:   ['', Validators.required],
    validUntil: [''],
    notes:      [''],
    lines:      this.fb.array([this.newLine()]),
  });

  get linesArray(): FormArray { return this.createForm.get('lines') as FormArray; }

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getDevis(page, this.pageSize).subscribe({
      next: p => { this.devis = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  toggleCreate() {
    this.showCreate = !this.showCreate;
    if (this.showCreate) {
      this.loadClients();
      this.loadProducts();
    } else {
      this.resetForm();
    }
  }

  private newLine() {
    return this.fb.group({
      productId:   ['', Validators.required],
      quantity:    [1, [Validators.required, Validators.min(0.001)]],
      discountPct: [0],
    });
  }

  addLine() { this.linesArray.push(this.newLine()); }

  removeLine(i: number) {
    if (this.linesArray.length > 1) this.linesArray.removeAt(i);
  }

  private resetForm() {
    this.linesArray.clear();
    this.linesArray.push(this.newLine());
    this.createForm.reset({ clientId: '', validUntil: '', notes: '' });
  }

  private loadClients() {
    this.clientsLoading = true;
    this.http.get<any>('/api/v1/crm/prospects?size=100').subscribe({
      next: page => {
        const items: any[] = page.content ?? page;
        this.clients = items.map(p => ({
          id: p.id,
          label: p.company ? `${p.name} – ${p.company}` : p.name,
        }));
        this.clientsLoading = false;
      },
      error: () => { this.clientsLoading = false; },
    });
  }

  private loadProducts() {
    this.productsLoading = true;
    this.salesSvc.getActiveProducts().subscribe({
      next: list => { this.products = list; this.productsLoading = false; },
      error: () => { this.productsLoading = false; },
    });
  }

  onCreate() {
    if (this.createForm.invalid) return;
    this.saving = true;
    const v = this.createForm.value;
    const payload = {
      clientId:   v.clientId,
      validUntil: v.validUntil || null,
      notes:      v.notes || null,
      lines: (v.lines as any[]).map(l => ({
        productId:   l.productId,
        quantity:    l.quantity,
        discountPct: l.discountPct ?? 0,
      })),
    };
    this.salesSvc.createDevis(payload).subscribe({
      next: () => {
        this.saving     = false;
        this.showCreate = false;
        this.resetForm();
        this.snack.open('Devis créé avec succès', 'OK', { duration: 3000 });
        this.load(0);
      },
      error: () => {
        this.saving = false;
        this.snack.open('Erreur lors de la création', 'Fermer', { duration: 4000 });
      },
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  statusBadge(s: string): BadgeClass { return STATUS_BADGE[s] ?? 'chip-gray'; }

  transitionDevis(id: string, targetStatus: string) {
    this.transitioningId = id;
    this.salesSvc.transitionDevis(id, targetStatus).subscribe({
      next: () => {
        this.transitioningId = null;
        this.load(0);
        this.snack.open(`Statut mis à jour : ${targetStatus}`, 'OK', { duration: 3000 });
      },
      error: () => {
        this.transitioningId = null;
        this.snack.open('Impossible de changer le statut du devis.', 'Fermer', { duration: 4000 });
      },
    });
  }

  openPriceSuggestion(): void {
    this.dialog.open(PriceSuggestionDialogComponent, { width: '480px' });
  }
}
