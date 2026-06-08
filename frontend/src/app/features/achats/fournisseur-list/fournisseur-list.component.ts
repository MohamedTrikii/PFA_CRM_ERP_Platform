import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  AchatService, FournisseurResponse, FournisseurCreateRequest
} from '../../../core/services/achat.service';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h2>Fournisseurs</h2>
      <button class="btn-primary" (click)="openCreate()">+ Nouveau</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Code</th><th>Nom</th><th>Téléphone</th><th>Email</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (f of fournisseurs; track f.id) {
            <tr>
              <td><span class="badge">{{ f.code }}</span></td>
              <td>{{ f.nom }}</td>
              <td>{{ f.telephone || '—' }}</td>
              <td>{{ f.email || '—' }}</td>
              <td>
                <span [class]="f.actif ? 'chip-green' : 'chip-gray'">
                  {{ f.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <button class="btn-sm" (click)="editFournisseur(f)">Modifier</button>
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

    @if (showForm) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editId ? 'Modifier' : 'Nouveau' }} fournisseur</h3>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              @if (!editId) {
                <label>Code *
                  <input formControlName="code" placeholder="FOUR-001">
                </label>
              }
              <label>Nom *
                <input formControlName="nom" placeholder="Aluminium Pro">
              </label>
            </div>
            <div class="form-row">
              <label>Téléphone
                <input formControlName="telephone" placeholder="+212 6xx xxx xxx">
              </label>
              <label>Email
                <input formControlName="email" type="email" placeholder="contact@fournisseur.ma">
              </label>
            </div>
            <div class="form-row">
              <label>ICE
                <input formControlName="ice" placeholder="001234567000012">
              </label>
              <label>Délai paiement (jours)
                <input formControlName="delaiPaiementJours" type="number" min="0">
              </label>
            </div>
            <label>Adresse
              <textarea formControlName="adresse" rows="2"></textarea>
            </label>
            @if (editId) {
              <label class="checkbox-label">
                <input type="checkbox" formControlName="actif"> Actif
              </label>
            }
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="closeForm()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving">
                {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class FournisseurListComponent implements OnInit {
  private achatService = inject(AchatService);
  private fb = inject(FormBuilder);

  fournisseurs: FournisseurResponse[] = [];
  currentPage = 0;
  totalPages = 1;
  showForm = false;
  editId: string | null = null;
  saving = false;

  form = this.fb.group({
    code:               ['', Validators.required],
    nom:                ['', Validators.required],
    telephone:          [''],
    email:              ['', Validators.email],
    ice:                [''],
    rc:                 [''],
    rib:                [''],
    delaiPaiementJours: [30],
    adresse:            [''],
    actif:              [true],
  });

  ngOnInit() { this.loadPage(0); }

  loadPage(page: number) {
    this.achatService.getFournisseurs(page, 20).subscribe(p => {
      this.fournisseurs = p.content;
      this.currentPage  = p.number;
      this.totalPages   = p.totalPages;
    });
  }

  openCreate() {
    this.editId = null;
    this.form.reset({ code: '', nom: '', telephone: '', email: '', ice: '', rc: '', rib: '', delaiPaiementJours: 30, adresse: '', actif: true });
    this.form.get('code')?.enable();
    this.showForm = true;
  }

  editFournisseur(f: FournisseurResponse) {
    this.editId = f.id;
    this.form.patchValue({ nom: f.nom, telephone: f.telephone, email: f.email, ice: f.ice, rc: f.rc, rib: f.rib, delaiPaiementJours: f.delaiPaiementJours, adresse: f.adresse, actif: f.actif });
    this.form.get('code')?.disable();
    this.showForm = true;
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const obs = this.editId
      ? this.achatService.updateFournisseur(this.editId, { nom: v.nom!, telephone: v.telephone || undefined, email: v.email || undefined, ice: v.ice || undefined, rc: v.rc || undefined, rib: v.rib || undefined, delaiPaiementJours: v.delaiPaiementJours || undefined, actif: v.actif! })
      : this.achatService.createFournisseur({ code: v.code!, nom: v.nom!, telephone: v.telephone || undefined, email: v.email || undefined, ice: v.ice || undefined, rc: v.rc || undefined, rib: v.rib || undefined, delaiPaiementJours: v.delaiPaiementJours || undefined, adresse: v.adresse || undefined });

    obs.subscribe({
      next: () => { this.saving = false; this.closeForm(); this.loadPage(this.currentPage); },
      error: () => { this.saving = false; },
    });
  }

  closeForm() { this.showForm = false; }
}
