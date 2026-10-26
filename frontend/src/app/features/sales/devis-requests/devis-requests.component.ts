import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import {
  PortalService,
  DevisRequestSummary,
  DevisRequestDetail,
} from '../../../core/services/portal.service';
import { SalesService, ProductResponse } from '../../../core/services/sales.service';

type BadgeClass = 'chip-gray' | 'chip-orange' | 'chip-blue' | 'chip-green' | 'chip-red';

const REQUEST_BADGE: Record<string, BadgeClass> = {
  NOUVEAU:    'chip-orange',
  EN_ETUDE:   'chip-blue',
  DEVIS_CREE: 'chip-green',
  REFUSE:     'chip-red',
};

const REQUEST_LABEL: Record<string, string> = {
  NOUVEAU:    'Nouveau',
  EN_ETUDE:   'En étude',
  DEVIS_CREE: 'Devis créé',
  REFUSE:     'Refusé',
};

interface ClientOption { id: string; label: string; }

@Component({
  selector: 'app-devis-requests',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, DatePipe, ReactiveFormsModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatButtonToggleModule, MatTooltipModule, MatDividerModule,
  ],
  styles: [`
    .detail-panel {
      background: #f8fafc;
      border: 1px solid var(--clr-border);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin: .25rem 0 .75rem;
      animation: slideDown .15s ease both;
    }
    @keyframes slideDown {
      from { opacity:0; transform:translateY(-6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .375rem .75rem;
      margin-bottom: 1rem;
    }
    .detail-label { font-size:.75rem; color:var(--clr-muted); }
    .detail-value { font-size:.875rem; font-weight:500; color:var(--clr-text); }
    .items-mini-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .8125rem;
      margin-bottom: 1rem;
    }
    .items-mini-table th, .items-mini-table td {
      padding: .375rem .625rem;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .items-mini-table th { background: #f1f5f9; font-weight: 600; color:var(--clr-text-2); }
    .action-row {
      display: flex;
      gap: .625rem;
      flex-wrap: wrap;
      align-items: center;
      margin-top: .75rem;
    }
    .note-form {
      background: #fff;
      border: 1px solid var(--clr-border);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      margin-top: .75rem;
      animation: slideDown .15s ease both;
    }
    .convert-form {
      background: #fff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 1.25rem;
      margin-top: 1rem;
      animation: slideDown .15s ease both;
    }
    .convert-title {
      font-size: .9375rem;
      font-weight: 600;
      color: #1e40af;
      margin: 0 0 1rem;
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .convert-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .5rem 1rem;
    }
    .line-row {
      display: grid;
      grid-template-columns: 2fr 90px 90px 36px;
      gap: .5rem;
      align-items: start;
      margin-bottom: .25rem;
    }
    .filter-bar {
      display: flex;
      gap: .75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .status-counts {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
      margin-left: auto;
    }
    .count-chip {
      font-size: .75rem;
      padding: .15rem .6rem;
      border-radius: 12px;
      font-weight: 600;
    }
    .expanded-row td { padding: 0 !important; border-bottom: none !important; }
  `],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>inbox</mat-icon> Demandes de devis</h1>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <mat-button-toggle-group [(ngModel)]="statusFilter" (change)="onFilterChange()" aria-label="Statut">
          <mat-button-toggle value="ALL">Toutes</mat-button-toggle>
          <mat-button-toggle value="NOUVEAU">Nouvelles</mat-button-toggle>
          <mat-button-toggle value="EN_ETUDE">En étude</mat-button-toggle>
          <mat-button-toggle value="DEVIS_CREE">Traitées</mat-button-toggle>
          <mat-button-toggle value="REFUSE">Refusées</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="filteredRequests" multiTemplateDataRows class="w-full">

            <ng-container matColumnDef="clientName">
              <th mat-header-cell *matHeaderCellDef>Client</th>
              <td mat-cell *matCellDef="let r">
                <div style="font-weight:600">{{ r.clientName }}</div>
                <div style="font-size:.75rem;color:var(--clr-muted)">{{ r.clientEmail }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="projectType">
              <th mat-header-cell *matHeaderCellDef>Type de projet</th>
              <td mat-cell *matCellDef="let r" style="font-weight:500">{{ r.projectType }}</td>
            </ng-container>

            <ng-container matColumnDef="itemCount">
              <th mat-header-cell *matHeaderCellDef style="text-align:center">Éléments</th>
              <td mat-cell *matCellDef="let r" style="text-align:center;color:var(--clr-text-2)">
                {{ r.itemCount }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let r">
                <span [class]="statusBadge(r.status)">{{ statusLabel(r.status) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2);font-size:.8125rem">
                {{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <button mat-icon-button
                        [matTooltip]="expandedId === r.id ? 'Réduire' : 'Voir le détail'"
                        (click)="toggleExpand(r)">
                  <mat-icon>{{ expandedId === r.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </td>
            </ng-container>

            <!-- Expanded detail row -->
            <ng-container matColumnDef="expandedDetail">
              <td mat-cell *matCellDef="let r" [attr.colspan]="columns.length">
                @if (expandedId === r.id) {
                  <div class="detail-panel">
                    @if (detailLoading) {
                      <div style="text-align:center;padding:1rem">
                        <mat-spinner diameter="28" style="display:inline-block"/>
                      </div>
                    } @else if (detail) {
                      <!-- Contact info -->
                      <div style="font-size:.8125rem;font-weight:700;color:var(--clr-text-2);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.06em">
                        Coordonnées
                      </div>
                      <div class="detail-grid">
                        <div>
                          <div class="detail-label">Nom</div>
                          <div class="detail-value">{{ detail.clientName }}</div>
                        </div>
                        <div>
                          <div class="detail-label">Email</div>
                          <div class="detail-value">{{ detail.clientEmail }}</div>
                        </div>
                        @if (detail.clientPhone) {
                          <div>
                            <div class="detail-label">Téléphone</div>
                            <div class="detail-value">{{ detail.clientPhone }}</div>
                          </div>
                        }
                        @if (detail.clientAddress) {
                          <div style="grid-column:1/-1">
                            <div class="detail-label">Adresse de chantier</div>
                            <div class="detail-value">{{ detail.clientAddress }}</div>
                          </div>
                        }
                      </div>

                      <!-- Project info -->
                      <div style="font-size:.8125rem;font-weight:700;color:var(--clr-text-2);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.06em">
                        Projet
                      </div>
                      <div class="detail-grid" style="margin-bottom:.75rem">
                        <div>
                          <div class="detail-label">Type de menuiserie</div>
                          <div class="detail-value">{{ detail.projectType }}</div>
                        </div>
                        @if (detail.description) {
                          <div style="grid-column:1/-1">
                            <div class="detail-label">Description</div>
                            <div class="detail-value" style="white-space:pre-line">{{ detail.description }}</div>
                          </div>
                        }
                      </div>

                      <!-- Items table -->
                      <div style="font-size:.8125rem;font-weight:700;color:var(--clr-text-2);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.06em">
                        Éléments ({{ detail.items.length }})
                      </div>
                      <div style="overflow-x:auto;margin-bottom:.75rem">
                        <table class="items-mini-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Qté</th>
                              <th>L × H (mm)</th>
                              <th>Série profilé</th>
                              <th>Ouverture</th>
                              <th>Vitrage</th>
                              <th>Couleur</th>
                              <th>Accessoires</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of detail.items; track item.id; let j = $index) {
                              <tr>
                                <td>{{ j + 1 }}</td>
                                <td>{{ item.quantity }}</td>
                                <td>{{ item.widthMm }} × {{ item.heightMm }}</td>
                                <td>{{ item.profileSeries || '–' }}</td>
                                <td>{{ item.openingType || '–' }}</td>
                                <td>{{ item.glassType || '–' }}</td>
                                <td>{{ item.color || '–' }}</td>
                                <td>{{ item.accessories || '–' }}</td>
                                <td>{{ item.notes || '–' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>

                      <!-- Internal notes -->
                      @if (detail.notes) {
                        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:.625rem .875rem;margin-bottom:.75rem;font-size:.875rem">
                          <strong>Note interne :</strong> {{ detail.notes }}
                        </div>
                      }

                      <!-- Linked devis -->
                      @if (detail.convertedDevisId) {
                        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:.625rem .875rem;margin-bottom:.75rem;font-size:.875rem;color:#166534">
                          <mat-icon style="font-size:1rem;vertical-align:middle;margin-right:.25rem">check_circle</mat-icon>
                          Devis lié : <strong>{{ detail.convertedDevisId }}</strong>
                        </div>
                      }

                      <!-- Action buttons -->
                      <mat-divider style="margin:.75rem 0"/>
                      <div class="action-row">
                        @if (detail.status === 'NOUVEAU') {
                          <button mat-raised-button color="primary"
                                  [disabled]="actionLoading"
                                  (click)="takeCharge()">
                            <mat-icon>engineering</mat-icon>
                            Prendre en charge
                          </button>
                        }
                        @if (detail.status === 'NOUVEAU' || detail.status === 'EN_ETUDE') {
                          <button mat-stroked-button color="warn"
                                  [disabled]="actionLoading"
                                  (click)="showRefuseForm = !showRefuseForm; showConvertForm = false">
                            <mat-icon>cancel</mat-icon>
                            Refuser
                          </button>
                        }
                        @if ((detail.status === 'NOUVEAU' || detail.status === 'EN_ETUDE') && !detail.convertedDevisId) {
                          <button mat-raised-button
                                  style="background:#2563eb;color:#fff"
                                  [disabled]="actionLoading"
                                  (click)="onShowConvertForm()">
                            <mat-icon>receipt_long</mat-icon>
                            Créer le devis
                          </button>
                        }
                        @if (actionLoading) {
                          <mat-spinner diameter="20" style="display:inline-block"/>
                        }
                      </div>

                      <!-- Refuse form -->
                      @if (showRefuseForm) {
                        <div class="note-form">
                          <p style="font-weight:600;margin:0 0 .5rem;color:#b91c1c">Refuser cette demande</p>
                          <mat-form-field appearance="outline" style="width:100%">
                            <mat-label>Motif du refus *</mat-label>
                            <textarea matInput [(ngModel)]="refuseNote" rows="2"
                                      placeholder="Expliquez brièvement le motif du refus..."></textarea>
                          </mat-form-field>
                          <div style="display:flex;gap:.5rem">
                            <button mat-raised-button color="warn"
                                    [disabled]="!refuseNote.trim() || actionLoading"
                                    (click)="refuse()">Confirmer le refus</button>
                            <button mat-stroked-button (click)="showRefuseForm = false">Annuler</button>
                          </div>
                        </div>
                      }

                      <!-- Convert to devis form -->
                      @if (showConvertForm) {
                        <div class="convert-form">
                          <p class="convert-title">
                            <mat-icon>receipt_long</mat-icon>
                            Créer un devis à partir de cette demande
                          </p>
                          <!-- Request summary for reference -->
                          <div style="background:#eff6ff;border-radius:6px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.8125rem;color:#1e40af">
                            <strong>Référence :</strong> {{ detail.clientName }} · {{ detail.projectType }} · {{ detail.items.length }} élément(s)
                          </div>

                          <form [formGroup]="convertForm" (ngSubmit)="createDevis()">
                            <div class="convert-grid">
                              <mat-form-field appearance="outline">
                                <mat-label>Client (CRM) *</mat-label>
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
                                <mat-label>Notes du devis</mat-label>
                                <textarea matInput formControlName="notes" rows="2"
                                          placeholder="Notes, conditions, référence à la demande…"></textarea>
                              </mat-form-field>
                            </div>

                            <!-- Lines -->
                            <div style="display:flex;justify-content:space-between;align-items:center;margin:.75rem 0 .5rem">
                              <span style="font-weight:600;font-size:.875rem">Lignes produits *</span>
                              <button mat-stroked-button type="button" (click)="addConvertLine()" style="font-size:.8125rem">
                                <mat-icon>add</mat-icon> Ajouter ligne
                              </button>
                            </div>

                            @if (productsLoading) {
                              <div style="text-align:center;padding:.5rem;color:var(--clr-muted);font-size:.875rem">
                                <mat-spinner diameter="16" style="display:inline-block;margin-right:4px;vertical-align:middle"/>
                                Chargement produits…
                              </div>
                            }

                            <div formArrayName="lines">
                              @for (line of convertLines.controls; track line; let k = $index) {
                                <div [formGroupName]="k" class="line-row">
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
                                    <input matInput formControlName="quantity" type="number" min="1" step="1">
                                    <mat-error>≥ 1</mat-error>
                                  </mat-form-field>
                                  <mat-form-field appearance="outline">
                                    <mat-label>Remise %</mat-label>
                                    <input matInput formControlName="discountPct" type="number" min="0" max="100">
                                  </mat-form-field>
                                  <button mat-icon-button color="warn" type="button"
                                          [disabled]="convertLines.length <= 1"
                                          (click)="removeConvertLine(k)"
                                          style="margin-top:.25rem">
                                    <mat-icon>delete</mat-icon>
                                  </button>
                                </div>
                              }
                            </div>

                            <div style="display:flex;gap:.5rem;margin-top:.75rem">
                              <button mat-raised-button color="primary" type="submit"
                                      [disabled]="convertForm.invalid || convertSaving">
                                @if (convertSaving) {
                                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;vertical-align:middle"/>
                                } @else {
                                  <mat-icon>save</mat-icon>
                                }
                                Créer et lier le devis
                              </button>
                              <button mat-stroked-button type="button" (click)="showConvertForm = false">Annuler</button>
                            </div>
                          </form>
                        </div>
                      }

                    }
                  </div>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let r; columns: columns"
                style="cursor:pointer"
                (click)="toggleExpand(r)"></tr>
            <tr mat-row *matRowDef="let r; columns: ['expandedDetail']"
                class="expanded-row"></tr>
          </table>

          @if (!filteredRequests.length) {
            <div class="erp-empty">
              <mat-icon>inbox</mat-icon>
              <p class="empty-title">Aucune demande trouvée</p>
              <span class="empty-sub">Les nouvelles demandes de devis apparaîtront ici.</span>
            </div>
          }

          <mat-paginator [length]="total" [pageSize]="pageSize"
                         [pageSizeOptions]="[10, 20, 50]"
                         (page)="onPage($event)"/>
        </div>
      }
    </div>
  `,
})
export class DevisRequestsComponent implements OnInit {
  private readonly portalSvc = inject(PortalService);
  private readonly salesSvc  = inject(SalesService);
  private readonly http      = inject(HttpClient);
  private readonly fb        = inject(FormBuilder);
  private readonly snack     = inject(MatSnackBar);

  requests:          DevisRequestSummary[] = [];
  filteredRequests:  DevisRequestSummary[] = [];
  loading     = true;
  total       = 0;
  pageSize    = 20;
  statusFilter = 'ALL';

  expandedId:   string | null = null;
  detail:       DevisRequestDetail | null = null;
  detailLoading = false;
  actionLoading = false;

  showRefuseForm  = false;
  showConvertForm = false;
  refuseNote      = '';

  clients:        ClientOption[] = [];
  products:       ProductResponse[] = [];
  clientsLoading  = false;
  productsLoading = false;
  convertSaving   = false;

  columns = ['clientName', 'projectType', 'itemCount', 'status', 'createdAt', 'actions'];

  convertForm = this.fb.group({
    clientId:   ['', Validators.required],
    validUntil: [''],
    notes:      [''],
    lines:      this.fb.array([this.newLine()]),
  });

  get convertLines(): FormArray { return this.convertForm.get('lines') as FormArray; }

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading = true;
    this.portalSvc.getAllRequests(page, this.pageSize).subscribe({
      next: p => {
        this.requests  = p.content;
        this.total     = p.totalElements;
        this.loading   = false;
        this.applyFilter();
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilter() {
    this.filteredRequests = this.statusFilter === 'ALL'
      ? this.requests
      : this.requests.filter(r => r.status === this.statusFilter);
  }

  onFilterChange() { this.applyFilter(); }

  onPage(e: PageEvent) { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  toggleExpand(r: DevisRequestSummary) {
    if (this.expandedId === r.id) {
      this.expandedId = null;
      this.detail     = null;
      this.resetActions();
      return;
    }
    this.expandedId   = r.id;
    this.detail       = null;
    this.detailLoading = true;
    this.resetActions();

    this.portalSvc.getRequestById(r.id).subscribe({
      next: d => {
        this.detail = d;
        this.detailLoading = false;
        this.prefillConvertNotes(d);
        if (d.status === 'EN_ETUDE') {
          this.loadClients();
          this.loadProducts();
        }
      },
      error: () => { this.detailLoading = false; },
    });
  }

  private resetActions() {
    this.showRefuseForm  = false;
    this.showConvertForm = false;
    this.refuseNote      = '';
    this.convertForm.reset({ clientId: '', validUntil: '', notes: '' });
    this.convertLines.clear();
    this.convertLines.push(this.newLine());
  }

  private prefillConvertNotes(d: DevisRequestDetail) {
    const noteText = [
      `Demande portail : ${d.projectType}`,
      d.description ? `Description : ${d.description}` : '',
      `Client : ${d.clientName} <${d.clientEmail}>`,
    ].filter(Boolean).join(' | ');
    this.convertForm.patchValue({ notes: noteText });
  }

  takeCharge() {
    if (!this.detail) return;
    this.actionLoading = true;
    this.portalSvc.updateRequestStatus(this.detail.id, 'Prise en charge par l\'équipe', 'EN_ETUDE').subscribe({
      next: d => {
        this.detail = d;
        this.actionLoading = false;
        this.refreshRowStatus(d.id, d.status);
        this.snack.open('Demande prise en charge', 'OK', { duration: 3000 });
        // Load clients and products for conversion
        this.loadClients();
        this.loadProducts();
      },
      error: () => {
        this.actionLoading = false;
        this.snack.open('Impossible de mettre à jour le statut', 'Fermer', { duration: 4000 });
      },
    });
  }

  refuse() {
    if (!this.detail || !this.refuseNote.trim()) return;
    this.actionLoading = true;
    this.portalSvc.updateRequestStatus(this.detail.id, this.refuseNote.trim(), 'REFUSE').subscribe({
      next: d => {
        this.detail = d;
        this.actionLoading = false;
        this.showRefuseForm = false;
        this.refuseNote = '';
        this.refreshRowStatus(d.id, d.status);
        this.snack.open('Demande refusée', 'OK', { duration: 3000 });
      },
      error: () => {
        this.actionLoading = false;
        this.snack.open('Impossible de refuser la demande', 'Fermer', { duration: 4000 });
      },
    });
  }

  private refreshRowStatus(id: string, status: string) {
    const row = this.requests.find(r => r.id === id);
    if (row) { row.status = status; }
    this.applyFilter();
  }

  // ── Convert form ──────────────────────────────────────────────────────────

  private newLine() {
    return this.fb.group({
      productId:   ['', Validators.required],
      quantity:    [1, [Validators.required, Validators.min(1)]],
      discountPct: [0],
    });
  }

  addConvertLine() { this.convertLines.push(this.newLine()); }
  removeConvertLine(i: number) {
    if (this.convertLines.length > 1) this.convertLines.removeAt(i);
  }

  private loadClients() {
    if (this.clients.length) return;
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
    if (this.products.length) return;
    this.productsLoading = true;
    this.salesSvc.getActiveProducts().subscribe({
      next: list => { this.products = list; this.productsLoading = false; },
      error: () => { this.productsLoading = false; },
    });
  }

  createDevis() {
    if (!this.detail || this.convertForm.invalid) return;
    this.convertSaving = true;
    const v = this.convertForm.value;
    const devisPayload = {
      clientId:   v.clientId,
      validUntil: v.validUntil || null,
      notes:      v.notes      || null,
      lines: (v.lines as any[]).map(l => ({
        productId:   l.productId,
        quantity:    l.quantity,
        discountPct: l.discountPct ?? 0,
      })),
    };

    this.salesSvc.createDevis(devisPayload).subscribe({
      next: devis => {
        // Link the new devis back to this request
        const requestId = this.detail?.id ?? '';
        this.portalSvc.linkDevis(requestId, devis.id).subscribe({
          next: d => {
            this.detail = d;
            this.convertSaving   = false;
            this.showConvertForm = false;
            this.refreshRowStatus(d.id, d.status);
            this.snack.open('Devis créé et lié à la demande', 'OK', { duration: 4000 });
          },
          error: () => {
            this.convertSaving = false;
            this.snack.open('Devis créé mais liaison échouée. ID : ' + devis.id, 'Fermer', { duration: 6000 });
          },
        });
      },
      error: () => {
        this.convertSaving = false;
        this.snack.open('Erreur lors de la création du devis', 'Fermer', { duration: 4000 });
      },
    });
  }

  // Also load clients/products when showing convert form
  onShowConvertForm() {
    this.showConvertForm = !this.showConvertForm;
    this.showRefuseForm = false;
    if (this.showConvertForm) {
      this.loadClients();
      this.loadProducts();
    }
  }

  statusBadge(s: string): BadgeClass { return REQUEST_BADGE[s] ?? 'chip-gray'; }
  statusLabel(s: string): string     { return REQUEST_LABEL[s] ?? s; }
}
