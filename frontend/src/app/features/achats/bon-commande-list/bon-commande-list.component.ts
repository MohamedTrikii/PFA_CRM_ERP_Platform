import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AchatService, BonCommandeSummary, BonCommandeResponse,
  BonCommandeStatus, FournisseurResponse
} from '../../../core/services/achat.service';
import { SalesService, ProductResponse } from '../../../core/services/sales.service';

const STATUS_LABELS: Record<BonCommandeStatus, string> = {
  BROUILLON: 'Brouillon', ENVOYE: 'Envoyé',
  PARTIELLEMENT_RECU: 'Part. reçu', RECU: 'Reçu', ANNULE: 'Annulé',
};
const STATUS_CSS: Record<BonCommandeStatus, string> = {
  BROUILLON: 'chip-gray', ENVOYE: 'chip-blue',
  PARTIELLEMENT_RECU: 'chip-orange', RECU: 'chip-green', ANNULE: 'chip-red',
};

@Component({
  selector: 'app-bon-commande-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page-header">
      <h2>Bons de commande</h2>
      <button class="btn-primary" (click)="openCreate()">+ Nouveau BC</button>
    </div>

    <div class="filter-bar">
      @for (s of statuses; track s) {
        <button [class]="filterStatus === s ? 'chip-active' : 'chip'" (click)="setFilter(s)">
          {{ STATUS_LABELS[s] }}
        </button>
      }
      <button [class]="!filterStatus ? 'chip-active' : 'chip'" (click)="setFilter(null)">Tous</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Réf.</th><th>Fournisseur</th><th>Statut</th><th>Livraison prévue</th><th>Total TTC</th><th></th></tr>
        </thead>
        <tbody>
          @for (bc of bonsCommande; track bc.id) {
            <tr>
              <td>{{ bc.reference }}</td>
              <td>{{ bc.fournisseurNom }}</td>
              <td><span [class]="STATUS_CSS[bc.status]">{{ STATUS_LABELS[bc.status] }}</span></td>
              <td>{{ bc.dateLivraison | date:'dd/MM/yyyy' }}</td>
              <td class="text-right">{{ bc.totalTtc | number:'1.2-2' }} TND</td>
              <td>
                <button class="btn-sm" (click)="viewDetail(bc.id)">Détail</button>
                @if (bc.status === 'BROUILLON') {
                  <button class="btn-sm btn-success" (click)="transition(bc.id, 'ENVOYE')">Envoyer</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (totalPages > 1) {
        <div class="pagination">
          <button [disabled]="currentPage === 0" (click)="loadPage(currentPage - 1)">‹</button>
          <span>{{ currentPage + 1 }} / {{ totalPages }}</span>
          <button [disabled]="currentPage >= totalPages - 1" (click)="loadPage(currentPage + 1)">›</button>
        </div>
      }
    </div>

    @if (detailBc) {
      <div class="modal-backdrop" (click)="closeDetail()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ detailBc.reference }}</h3>
            <span [class]="STATUS_CSS[detailBc.status]">{{ STATUS_LABELS[detailBc.status] }}</span>
          </div>
          <p>Fournisseur : {{ detailBc.fournisseur.nom }}</p>
          <table>
            <thead><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>TVA%</th><th>Total TTC</th></tr></thead>
            <tbody>
              @for (l of detailBc.lignes; track l.id) {
                <tr>
                  <td>{{ l.designation }}</td>
                  <td class="text-right">{{ l.quantite }}</td>
                  <td class="text-right">{{ l.prixUnitaire | number:'1.2-2' }}</td>
                  <td class="text-right">{{ l.taxPct }}%</td>
                  <td class="text-right">{{ l.montantTtc | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr><td colspan="4" class="text-right"><strong>Total TTC</strong></td><td class="text-right"><strong>{{ detailBc.totalTtc | number:'1.2-2' }} TND</strong></td></tr>
            </tfoot>
          </table>
          <button class="btn-secondary" (click)="closeDetail()">Fermer</button>
        </div>
      </div>
    }

    @if (showCreateForm) {
      <div class="modal-backdrop" (click)="closeCreate()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <h3>Nouveau bon de commande</h3>
          <form [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <div class="form-row">
              <label>Référence *
                <input formControlName="reference" placeholder="BC-2026-001">
              </label>
              <label>Fournisseur *
                <select formControlName="fournisseurId">
                  <option value="">— Sélectionner —</option>
                  @for (f of fournisseursActifs; track f.id) {
                    <option [value]="f.id">{{ f.nom }}</option>
                  }
                </select>
              </label>
              <label>Livraison prévue *
                <input formControlName="dateLivraison" type="date">
              </label>
            </div>
            <label>Notes
              <textarea formControlName="notes" rows="2"></textarea>
            </label>

            <h4>Lignes</h4>
            <div formArrayName="lignes">
              @for (lg of lignesArray.controls; track lg; let i = $index) {
                <div [formGroupName]="i" class="ligne-row">
                  <select formControlName="productId" (change)="onProductSelect($event, i)" style="flex:2;min-width:160px">
                    <option value="">— Saisie libre —</option>
                    @for (p of produits; track p.id) {
                      <option [value]="p.id">{{ p.reference }} — {{ p.name }}</option>
                    }
                  </select>
                  <input formControlName="designation" placeholder="Désignation" style="flex:2">
                  <input formControlName="quantite" type="number" min="0.001" step="0.001" placeholder="Qté" style="flex:1">
                  <input formControlName="prixUnitaire" type="number" min="0" step="0.01" placeholder="PU HT" style="flex:1">
                  <input formControlName="taxPct" type="number" min="0" max="100" placeholder="TVA%" style="flex:0 0 70px">
                  <button type="button" class="btn-danger-sm" (click)="removeLigne(i)">✕</button>
                </div>
              }
            </div>
            <button type="button" class="btn-secondary" (click)="addLigne()">+ Ligne</button>

            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="closeCreate()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="createForm.invalid || saving">
                {{ saving ? 'Enregistrement…' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class BonCommandeListComponent implements OnInit {
  private achatService = inject(AchatService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_CSS    = STATUS_CSS;
  readonly statuses: BonCommandeStatus[] = ['BROUILLON', 'ENVOYE', 'PARTIELLEMENT_RECU', 'RECU', 'ANNULE'];

  bonsCommande: BonCommandeSummary[] = [];
  currentPage = 0;
  totalPages  = 1;
  filterStatus: BonCommandeStatus | null = null;
  detailBc: BonCommandeResponse | null = null;
  showCreateForm = false;
  fournisseursActifs: FournisseurResponse[] = [];
  produits: ProductResponse[] = [];
  saving = false;

  createForm = this.fb.group({
    reference:      ['', Validators.required],
    fournisseurId:  ['', Validators.required],
    dateLivraison:  ['', Validators.required],
    notes:          [''],
    lignes: this.fb.array([]),
  });

  get lignesArray() { return this.createForm.get('lignes') as FormArray; }

  ngOnInit() { this.loadPage(0); }

  loadPage(page: number) {
    this.achatService.getBonsCommande(page, 20, this.filterStatus ?? undefined).subscribe(p => {
      this.bonsCommande = p.content;
      this.currentPage  = p.number;
      this.totalPages   = p.totalPages;
    });
  }

  setFilter(s: BonCommandeStatus | null) { this.filterStatus = s; this.loadPage(0); }

  viewDetail(id: string) {
    this.achatService.getBonCommande(id).subscribe(bc => this.detailBc = bc);
  }

  closeDetail() { this.detailBc = null; }

  transition(id: string, status: BonCommandeStatus) {
    this.achatService.transitionBonCommande(id, status).subscribe(() => this.loadPage(this.currentPage));
  }

  openCreate() {
    this.lignesArray.clear();
    this.addLigne();
    this.createForm.reset({ reference: '', fournisseurId: '', dateLivraison: '', notes: '' });
    this.achatService.getFournisseursActifs().subscribe(p => this.fournisseursActifs = p.content);
    this.salesService.getActiveProducts().subscribe(list => this.produits = list);
    this.showCreateForm = true;
  }

  addLigne() {
    this.lignesArray.push(this.fb.group({
      productId:    [''],
      designation:  ['', Validators.required],
      quantite:     [1, [Validators.required, Validators.min(0.001)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
      taxPct:       [20],
    }));
  }

  onProductSelect(event: Event, i: number) {
    const id = (event.target as HTMLSelectElement).value;
    const p = this.produits.find(x => x.id === id);
    if (!p) return;
    this.lignesArray.at(i).patchValue({
      designation:  p.name,
      prixUnitaire: p.unitPrice,
      taxPct:       p.tvaRate,
    });
  }

  removeLigne(i: number) { if (this.lignesArray.length > 1) this.lignesArray.removeAt(i); }

  submitCreate() {
    if (this.createForm.invalid) return;
    this.saving = true;
    const v = this.createForm.value;
    const req = {
      fournisseurId: v.fournisseurId!,
      reference:     v.reference!,
      dateLivraison: v.dateLivraison!,
      notes:         v.notes || undefined,
      lignes: (v.lignes as any[]).map((l, i) => ({
        productId:    l.productId || undefined,
        designation:  l.designation,
        reference:    l.designation,
        quantite:     +l.quantite,
        prixUnitaire: +l.prixUnitaire,
        taxPct:       +l.taxPct,
        position:     i,
      })),
    };
    this.achatService.createBonCommande(req).subscribe({
      next: () => { this.saving = false; this.closeCreate(); this.loadPage(0); },
      error: () => { this.saving = false; },
    });
  }

  closeCreate() { this.showCreateForm = false; }
}
