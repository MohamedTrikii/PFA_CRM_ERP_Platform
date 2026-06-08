import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SalesService, ProductResponse } from '../../../core/services/sales.service';
import { AuthContextService } from '../../../core/services/auth-context.service';

const UNITS = ['ml', 'm²', 'm', 'unité', 'kg', 'pièce', 'lot', 'heure', 'paquet'];

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  styles: [`
    .form-card {
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
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: .5rem 1rem;
      align-items: start;
    }
    .form-grid .full { grid-column: 1 / -1; }
    .form-actions { display: flex; align-items: center; gap: .75rem; margin-top: .75rem; }
    .card-title { margin: 0 0 1rem; font-size: .9375rem; font-weight: 600; color: var(--clr-text-1, #1e293b); }
    .price-cell { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .ref-cell   { font-family: ui-monospace, monospace; font-size: .8125rem; font-weight: 600; color: var(--clr-primary, #3b82f6); }
    .action-cell { display: flex; gap: .25rem; justify-content: flex-end; }
  `],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>category</mat-icon> Catalogue produits</h1>
        <div class="page-actions">
          <button mat-raised-button color="primary" (click)="toggleCreate()">
            <mat-icon>{{ (showCreate && !editingProduct) ? 'close' : 'add' }}</mat-icon>
            {{ (showCreate && !editingProduct) ? 'Annuler' : 'Nouveau produit' }}
          </button>
        </div>
      </div>

      <!-- Create form -->
      @if (showCreate && !editingProduct) {
        <div class="form-card">
          <p class="card-title">Nouveau produit</p>
          <form [formGroup]="createForm" (ngSubmit)="onCreate()">
            <div class="form-grid">
              @if (authCtx.isSuperAdmin()) {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Tenant *</mat-label>
                  <mat-select formControlName="tenantId">
                    @for (t of authCtx.tenants(); track t.id) {
                      <mat-option [value]="t.id">{{ t.name }} <span style="font-size:.8em;color:var(--clr-muted)">({{ t.slug }})</span></mat-option>
                    }
                  </mat-select>
                  <mat-hint>Tenant cible pour ce produit</mat-hint>
                </mat-form-field>
              }
              <mat-form-field appearance="outline">
                <mat-label>Référence *</mat-label>
                <input matInput formControlName="reference" placeholder="ALU-PRO-6060">
                <mat-error>Obligatoire</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nom *</mat-label>
                <input matInput formControlName="name" placeholder="Profilé aluminium 60×60 mm">
                <mat-error>Obligatoire</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Unité</mat-label>
                <mat-select formControlName="unit">
                  @for (u of units; track u) {
                    <mat-option [value]="u">{{ u }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Prix unitaire HT (TND) *</mat-label>
                <input matInput formControlName="unitPrice" type="number" min="0.01" step="0.01">
                <mat-error>Valeur positive requise</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>TVA (%)</mat-label>
                <mat-select formControlName="tvaRate">
                  <mat-option [value]="0">0 %</mat-option>
                  <mat-option [value]="7">7 %</mat-option>
                  <mat-option [value]="10">10 %</mat-option>
                  <mat-option [value]="14">14 %</mat-option>
                  <mat-option [value]="20">20 %</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="2"
                          placeholder="Description technique, dimensions, normes…"></textarea>
              </mat-form-field>
            </div>
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="createForm.invalid || saving">
                @if (saving) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                } @else {
                  <mat-icon>save</mat-icon>
                }
                Enregistrer
              </button>
              <button mat-stroked-button type="button" (click)="toggleCreate()">Annuler</button>
            </div>
          </form>
        </div>
      }

      <!-- Edit form -->
      @if (editingProduct) {
        <div class="form-card">
          <p class="card-title">Modifier · <span style="font-family:monospace;color:var(--clr-primary)">{{ editingProduct.reference }}</span></p>
          <form [formGroup]="editForm" (ngSubmit)="onEdit()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nom *</mat-label>
                <input matInput formControlName="name">
                <mat-error>Obligatoire</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Unité</mat-label>
                <mat-select formControlName="unit">
                  @for (u of units; track u) {
                    <mat-option [value]="u">{{ u }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Prix unitaire HT (TND) *</mat-label>
                <input matInput formControlName="unitPrice" type="number" min="0.01" step="0.01">
                <mat-error>Valeur positive requise</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>TVA (%)</mat-label>
                <mat-select formControlName="tvaRate">
                  <mat-option [value]="0">0 %</mat-option>
                  <mat-option [value]="7">7 %</mat-option>
                  <mat-option [value]="10">10 %</mat-option>
                  <mat-option [value]="14">14 %</mat-option>
                  <mat-option [value]="20">20 %</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
              </mat-form-field>
            </div>
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="editForm.invalid || saving">
                @if (saving) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                } @else {
                  <mat-icon>save</mat-icon>
                }
                Mettre à jour
              </button>
              <button mat-stroked-button type="button" (click)="cancelEdit()">Annuler</button>
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
          <table mat-table [dataSource]="products" class="w-full">

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Référence</th>
              <td mat-cell *matCellDef="let r">
                <span class="ref-cell">{{ r.reference }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nom</th>
              <td mat-cell *matCellDef="let r">
                <span style="font-weight:500">{{ r.name }}</span>
                @if (r.description) {
                  <br><small style="color:var(--clr-muted);font-size:.75rem">{{ r.description | slice:0:60 }}{{ r.description.length > 60 ? '…' : '' }}</small>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="unit">
              <th mat-header-cell *matHeaderCellDef>Unité</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">{{ r.unit }}</td>
            </ng-container>

            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">Prix HT</th>
              <td mat-cell *matCellDef="let r" class="price-cell">
                {{ r.unitPrice | number:'1.2-2' }}
                <span style="font-size:.75rem;color:var(--clr-muted)"> TND</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="tvaRate">
              <th mat-header-cell *matHeaderCellDef style="text-align:right">TVA</th>
              <td mat-cell *matCellDef="let r" style="text-align:right;color:var(--clr-text-2)">
                {{ r.tvaRate | number:'1.0-0' }} %
              </td>
            </ng-container>

            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let r">
                <span [class]="r.active ? 'chip-green' : 'chip-gray'">
                  {{ r.active ? 'Actif' : 'Inactif' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <div class="action-cell">
                  <button mat-icon-button color="primary"
                          matTooltip="Modifier"
                          (click)="startEdit(r)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button
                          [color]="r.active ? 'warn' : 'accent'"
                          [matTooltip]="r.active ? 'Désactiver' : 'Réactiver'"
                          (click)="toggleActive(r)">
                    <mat-icon>{{ r.active ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let r; columns: columns"
                [style.opacity]="r.active ? 1 : .55"></tr>
          </table>

          @if (!products.length) {
            <div class="erp-empty">
              <mat-icon>category</mat-icon>
              <p class="empty-title">Aucun produit dans le catalogue</p>
              <span class="empty-sub">Cliquez sur "Nouveau produit" pour commencer.</span>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class ProductCatalogComponent implements OnInit {
  private readonly salesSvc = inject(SalesService);
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);
  readonly authCtx          = inject(AuthContextService);

  readonly units = UNITS;

  products: ProductResponse[] = [];
  loading  = true;
  saving   = false;
  total    = 0;
  pageSize = 20;
  columns  = ['reference', 'name', 'unit', 'unitPrice', 'tvaRate', 'active', 'actions'];

  showCreate    = false;
  editingProduct: ProductResponse | null = null;

  createForm = this.fb.group({
    tenantId:    [null as string | null],
    reference:   ['', Validators.required],
    name:        ['', Validators.required],
    description: [''],
    unit:        ['unité'],
    unitPrice:   [0, [Validators.required, Validators.min(0.01)]],
    tvaRate:     [20, Validators.required],
  });

  editForm = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    unit:        [''],
    unitPrice:   [0, [Validators.required, Validators.min(0.01)]],
    tvaRate:     [20, Validators.required],
  });

  ngOnInit() {
    this.load(0);
    if (this.authCtx.isSuperAdmin()) {
      this.createForm.get('tenantId')!.addValidators(Validators.required);
      this.createForm.get('tenantId')!.updateValueAndValidity();
    }
  }

  load(page: number) {
    this.loading = true;
    this.salesSvc.getProducts(page, this.pageSize).subscribe({
      next: p => { this.products = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  toggleCreate() {
    this.showCreate = !this.showCreate;
    this.editingProduct = null;
    if (!this.showCreate) this.createForm.reset({ tenantId: null, tvaRate: 20, unit: 'unité', unitPrice: 0 });
  }

  onCreate() {
    if (this.createForm.invalid) return;
    this.saving = true;
    this.salesSvc.createProduct(this.createForm.value).subscribe({
      next: () => {
        this.saving = false;
        this.showCreate = false;
        this.createForm.reset({ tvaRate: 20, unit: 'unité', unitPrice: 0 });
        this.snack.open('Produit créé avec succès', 'OK', { duration: 3000 });
        this.load(0);
      },
      error: () => { this.saving = false; this.snack.open('Erreur lors de la création', 'Fermer', { duration: 4000 }); },
    });
  }


  startEdit(p: ProductResponse) {
    this.showCreate = false;
    this.editingProduct = p;
    this.editForm.patchValue({
      name: p.name, description: p.description ?? '',
      unit: p.unit, unitPrice: p.unitPrice, tvaRate: p.tvaRate,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() { this.editingProduct = null; }

  onEdit() {
    if (!this.editingProduct || this.editForm.invalid) return;
    this.saving = true;
    this.salesSvc.updateProduct(this.editingProduct.id, this.editForm.value).subscribe({
      next: () => {
        this.saving = false;
        this.editingProduct = null;
        this.snack.open('Produit mis à jour', 'OK', { duration: 3000 });
        this.load(0);
      },
      error: () => { this.saving = false; this.snack.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 }); },
    });
  }

  toggleActive(p: ProductResponse) {
    this.salesSvc.updateProduct(p.id, { active: !p.active }).subscribe({
      next: () => {
        this.snack.open(p.active ? 'Produit désactivé' : 'Produit réactivé', 'OK', { duration: 2000 });
        this.load(0);
      },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }
}
