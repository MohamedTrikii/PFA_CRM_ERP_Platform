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
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryService, StockItemResponse, LocationResponse } from '../../../core/services/inventory.service';
import { SalesService, ProductResponse } from '../../../core/services/sales.service';

type MovementType = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';

const TYPE_LABELS: Record<MovementType, string> = {
  ENTREE:     'Entrée en stock',
  SORTIE:     'Sortie de stock',
  AJUSTEMENT: 'Ajustement d\'inventaire',
};
const TYPE_BADGE: Record<MovementType, string> = {
  ENTREE: 'chip-green', SORTIE: 'chip-red', AJUSTEMENT: 'chip-blue',
};

@Component({
  selector: 'app-stock-management',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule, MatTabsModule,
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
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .5rem 1rem;
      align-items: start;
    }
    .form-grid .full { grid-column: 1 / -1; }
    .form-actions { display: flex; align-items: center; gap: .75rem; margin-top: .75rem; }
    .card-title { margin: 0 0 1rem; font-size: .9375rem; font-weight: 600; color: var(--clr-text-1, #1e293b); }
    .qty-cell {
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .qty-low { color: var(--clr-danger, #ef4444); }
    .qty-ok  { color: var(--clr-success, #22c55e); }
    .ref-cell { font-family: ui-monospace, monospace; font-size: .8125rem; font-weight: 600; }
    .tab-content { padding-top: 1rem; }
    .loc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      padding: 1rem 0;
    }
    .loc-card {
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: var(--r-md, 10px);
      padding: 1rem 1.25rem;
      background: #fff;
    }
    .loc-code { font-family: ui-monospace, monospace; font-weight: 700; font-size: .9rem; color: var(--clr-primary, #3b82f6); }
    .loc-name { font-weight: 500; margin: .25rem 0 .125rem; }
    .loc-desc { font-size: .8125rem; color: var(--clr-muted); }
  `],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>warehouse</mat-icon> Gestion du stock</h1>
        <div class="page-actions">
          <button mat-stroked-button color="primary" [routerLink]="['/inventory/movements']">
            <mat-icon>history</mat-icon> Historique
          </button>
          <button mat-raised-button color="primary" (click)="toggleAdjust()">
            <mat-icon>{{ showAdjust ? 'close' : 'tune' }}</mat-icon>
            {{ showAdjust ? 'Annuler' : 'Ajustement' }}
          </button>
        </div>
      </div>

      <!-- Adjustment form -->
      @if (showAdjust) {
        <div class="form-card">
          <p class="card-title">Mouvement de stock</p>
          <form [formGroup]="adjustForm" (ngSubmit)="onAdjust()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Type de mouvement *</mat-label>
                <mat-select formControlName="movementType">
                  @for (t of movementTypes; track t) {
                    <mat-option [value]="t">
                      {{ TYPE_LABELS[t] }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Produit *</mat-label>
                <mat-select formControlName="productId">
                  @if (productsLoading) {
                    <mat-option disabled>Chargement…</mat-option>
                  }
                  @for (p of activeProducts; track p.id) {
                    <mat-option [value]="p.id">
                      {{ p.reference }} — {{ p.name }}
                    </mat-option>
                  }
                  @if (!productsLoading && !activeProducts.length) {
                    <mat-option disabled>Aucun produit actif</mat-option>
                  }
                </mat-select>
                <mat-error>Sélectionnez un produit</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Emplacement</mat-label>
                <mat-select formControlName="locationId">
                  <mat-option [value]="null">— Aucun emplacement —</mat-option>
                  @for (l of locations; track l.id) {
                    <mat-option [value]="l.id">{{ l.code }} · {{ l.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Quantité *</mat-label>
                <input matInput formControlName="quantity" type="number" min="0.001" step="1">
                <mat-error>Valeur positive requise</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Notes / Motif</mat-label>
                <input matInput formControlName="notes" placeholder="Inventaire annuel, correction…">
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="adjustForm.invalid || saving">
                @if (saving) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                } @else {
                  <mat-icon>check</mat-icon>
                }
                Valider le mouvement
              </button>
              <button mat-stroked-button type="button" (click)="toggleAdjust()">Annuler</button>
            </div>
          </form>
        </div>
      }

      <!-- Tabs: Stock items / Emplacements -->
      <mat-tab-group animationDuration="150ms">

        <!-- Tab 1: Stock actuel -->
        <mat-tab label="Stock actuel">
          <div class="tab-content">
            @if (loading) {
              <div style="display:flex;justify-content:center;padding:3rem">
                <mat-spinner diameter="40"/>
              </div>
            } @else {
              <div class="erp-table-wrap">
                <table mat-table [dataSource]="items" class="w-full">

                  <ng-container matColumnDef="reference">
                    <th mat-header-cell *matHeaderCellDef>Référence</th>
                    <td mat-cell *matCellDef="let r">
                      <span class="ref-cell">{{ r.productReference }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="productName">
                    <th mat-header-cell *matHeaderCellDef>Produit</th>
                    <td mat-cell *matCellDef="let r" style="font-weight:500">{{ r.productName }}</td>
                  </ng-container>

                  <ng-container matColumnDef="location">
                    <th mat-header-cell *matHeaderCellDef>Emplacement</th>
                    <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">
                      {{ locationName(r.locationId) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="quantity">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">En stock</th>
                    <td mat-cell *matCellDef="let r" class="qty-cell"
                        [class.qty-low]="r.availableQuantity <= 0"
                        [class.qty-ok]="r.availableQuantity > 0">
                      {{ r.quantity | number:'1.3-3' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="reserved">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">Réservé</th>
                    <td mat-cell *matCellDef="let r" style="text-align:right;color:var(--clr-muted)">
                      {{ r.reservedQuantity | number:'1.3-3' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="available">
                    <th mat-header-cell *matHeaderCellDef style="text-align:right">Disponible</th>
                    <td mat-cell *matCellDef="let r" class="qty-cell">
                      <span [class]="r.availableQuantity > 0 ? 'chip-green' : 'chip-red'">
                        {{ r.availableQuantity | number:'1.3-3' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="updatedAt">
                    <th mat-header-cell *matHeaderCellDef>Màj</th>
                    <td mat-cell *matCellDef="let r" style="color:var(--clr-muted);font-size:.8125rem">
                      {{ r.updatedAt | date:'dd/MM/yy' }}
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
                  <tr mat-row *matRowDef="let r; columns: itemColumns"></tr>
                </table>

                @if (!items.length) {
                  <div class="erp-empty">
                    <mat-icon>warehouse</mat-icon>
                    <p class="empty-title">Stock vide</p>
                    <span class="empty-sub">Réalisez un premier ajustement pour initialiser les niveaux de stock.</span>
                  </div>
                }

                <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[20,50,100]"
                               (page)="onPage($event)"/>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Tab 2: Emplacements -->
        <mat-tab label="Emplacements">
          <div class="tab-content">
            <div style="display:flex;justify-content:flex-end;margin-bottom:.75rem">
              <button mat-stroked-button color="primary" (click)="toggleLocation()">
                <mat-icon>{{ showLocation ? 'close' : 'add' }}</mat-icon>
                {{ showLocation ? 'Annuler' : 'Nouvel emplacement' }}
              </button>
            </div>

            @if (showLocation) {
              <div class="form-card" style="margin-bottom:1rem">
                <p class="card-title">Nouvel emplacement de stockage</p>
                <form [formGroup]="locationForm" (ngSubmit)="onCreateLocation()">
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Code *</mat-label>
                      <input matInput formControlName="code" placeholder="MAG-A1">
                      <mat-error>Obligatoire</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Nom *</mat-label>
                      <input matInput formControlName="name" placeholder="Magasin principal – Zone A">
                      <mat-error>Obligatoire</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Description</mat-label>
                      <input matInput formControlName="description">
                    </mat-form-field>
                  </div>
                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit"
                            [disabled]="locationForm.invalid || savingLocation">
                      @if (savingLocation) {
                        <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                      } @else {
                        <mat-icon>save</mat-icon>
                      }
                      Créer
                    </button>
                    <button mat-stroked-button type="button" (click)="toggleLocation()">Annuler</button>
                  </div>
                </form>
              </div>
            }

            @if (locationsLoading) {
              <div style="display:flex;justify-content:center;padding:2rem">
                <mat-spinner diameter="32"/>
              </div>
            } @else if (locations.length) {
              <div class="loc-grid">
                @for (loc of locations; track loc.id) {
                  <div class="loc-card">
                    <div class="loc-code">{{ loc.code }}</div>
                    <div class="loc-name">{{ loc.name }}</div>
                    @if (loc.description) {
                      <div class="loc-desc">{{ loc.description }}</div>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="erp-empty">
                <mat-icon>place</mat-icon>
                <p class="empty-title">Aucun emplacement défini</p>
                <span class="empty-sub">Ajoutez vos zones de stockage (magasin, rayon, zone extérieure…).</span>
              </div>
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
})
export class StockManagementComponent implements OnInit {
  private readonly inventorySvc = inject(InventoryService);
  private readonly salesSvc     = inject(SalesService);
  private readonly fb           = inject(FormBuilder);
  private readonly snack        = inject(MatSnackBar);

  readonly TYPE_LABELS    = TYPE_LABELS;
  readonly movementTypes: MovementType[] = ['ENTREE', 'SORTIE', 'AJUSTEMENT'];

  // Stock items
  items: StockItemResponse[] = [];
  loading  = true;
  total    = 0;
  pageSize = 20;
  itemColumns = ['reference', 'productName', 'location', 'quantity', 'reserved', 'available', 'updatedAt'];

  // Locations
  locations: LocationResponse[] = [];
  locationsLoading = false;
  showLocation     = false;
  savingLocation   = false;

  // Active products (for adjustment form)
  activeProducts: ProductResponse[] = [];
  productsLoading = false;

  // Adjustment
  showAdjust = false;
  saving     = false;

  adjustForm = this.fb.group({
    movementType: ['ENTREE' as MovementType, Validators.required],
    productId:    ['', Validators.required],
    locationId:   [null as string | null],
    quantity:     [1, [Validators.required, Validators.min(0.001)]],
    notes:        [''],
  });

  locationForm = this.fb.group({
    code:        ['', Validators.required],
    name:        ['', Validators.required],
    description: [''],
  });

  ngOnInit() {
    this.loadItems(0);
    this.loadLocations();
  }

  loadItems(page: number) {
    this.loading = true;
    this.inventorySvc.getItems(page, this.pageSize).subscribe({
      next: p => { this.items = p.content; this.total = p.totalElements; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadLocations() {
    this.locationsLoading = true;
    this.inventorySvc.getLocations().subscribe({
      next: list => { this.locations = list; this.locationsLoading = false; },
      error: () => { this.locationsLoading = false; },
    });
  }

  toggleAdjust() {
    this.showAdjust = !this.showAdjust;
    if (this.showAdjust && !this.activeProducts.length) {
      this.productsLoading = true;
      this.salesSvc.getActiveProducts().subscribe({
        next: list => { this.activeProducts = list; this.productsLoading = false; },
        error: () => { this.productsLoading = false; },
      });
    }
    if (!this.showAdjust) this.adjustForm.reset({ movementType: 'ENTREE', quantity: 1 });
  }

  onAdjust() {
    if (this.adjustForm.invalid) return;
    this.saving = true;
    const v = this.adjustForm.value;
    const payload = {
      productId:    v.productId,
      locationId:   v.locationId || undefined,
      movementType: v.movementType,
      quantity:     v.quantity,
      notes:        v.notes || undefined,
    };
    this.inventorySvc.adjustStock(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showAdjust = false;
        this.adjustForm.reset({ movementType: 'ENTREE', quantity: 1 });
        this.snack.open('Mouvement enregistré avec succès', 'OK', { duration: 3000 });
        this.loadItems(0);
      },
      error: () => { this.saving = false; this.snack.open('Erreur lors de l\'ajustement', 'Fermer', { duration: 4000 }); },
    });
  }

  toggleLocation() {
    this.showLocation = !this.showLocation;
    if (!this.showLocation) this.locationForm.reset();
  }

  onCreateLocation() {
    if (this.locationForm.invalid) return;
    this.savingLocation = true;
    this.inventorySvc.createLocation(this.locationForm.value).subscribe({
      next: () => {
        this.savingLocation = false;
        this.showLocation = false;
        this.locationForm.reset();
        this.snack.open('Emplacement créé', 'OK', { duration: 3000 });
        this.loadLocations();
      },
      error: () => { this.savingLocation = false; this.snack.open('Erreur lors de la création', 'Fermer', { duration: 4000 }); },
    });
  }

  locationName(id: string): string {
    return this.locations.find(l => l.id === id)?.name ?? '—';
  }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.loadItems(e.pageIndex); }
}
