import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ReferenceService, RefCategory, RefValue,
} from '../../../core/services/reference.service';

@Component({
  selector: 'app-reference-admin',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatSnackBarModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  styles: [`
    .ref-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1.5rem;
      min-height: calc(100vh - 120px);
    }

    /* ── Categories panel ── */
    .cat-panel {
      background: var(--clr-surface, #fff);
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: fit-content;
      position: sticky;
      top: 1rem;
      max-height: calc(100vh - 140px);
    }

    .cat-panel-header {
      padding: 1rem 1.125rem .75rem;
      border-bottom: 1px solid var(--clr-border, #e2e8f0);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .cat-panel-title {
      font-size: .875rem;
      font-weight: 700;
      color: var(--clr-text, #0f172a);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .cat-list {
      flex: 1;
      overflow-y: auto;
      padding: .375rem 0;
    }

    .cat-item {
      display: flex;
      align-items: center;
      gap: .625rem;
      padding: .625rem 1.125rem;
      cursor: pointer;
      transition: background .12s;
      border-left: 3px solid transparent;
    }
    .cat-item:hover { background: var(--clr-bg, #f8fafc); }
    .cat-item.active {
      background: #eff6ff;
      border-left-color: #2563eb;
    }
    .cat-item mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #64748b; flex-shrink: 0; }
    .cat-item.active mat-icon { color: #2563eb; }
    .cat-item-name {
      flex: 1;
      font-size: .8375rem;
      font-weight: 500;
      color: var(--clr-text, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cat-count {
      font-size: .75rem;
      background: #f1f5f9;
      color: #64748b;
      padding: .1rem .45rem;
      border-radius: 20px;
      flex-shrink: 0;
    }
    .cat-item.active .cat-count { background: #dbeafe; color: #2563eb; }
    .sys-badge {
      font-size: .65rem;
      background: #fef3c7;
      color: #92400e;
      padding: 0 .35rem;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* ── Values panel ── */
    .val-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .val-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .75rem;
    }

    .val-title { font-size: 1.125rem; font-weight: 700; color: var(--clr-text, #0f172a); }
    .val-subtitle { font-size: .8125rem; color: var(--clr-text-2, #64748b); }

    .val-table-wrap {
      background: var(--clr-surface, #fff);
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
    }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: .75rem 1rem;
      text-align: left;
      font-size: .75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--clr-text-2, #64748b);
      background: #f8fafc;
      border-bottom: 2px solid var(--clr-border, #e2e8f0);
    }
    tbody tr { border-bottom: 1px solid var(--clr-border, #e2e8f0); transition: background .1s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #f8fafc; }
    tbody td { padding: .75rem 1rem; font-size: .875rem; color: var(--clr-text, #0f172a); }

    .code-badge {
      font-family: ui-monospace, monospace;
      font-size: .775rem;
      background: #f1f5f9;
      padding: .15rem .5rem;
      border-radius: 4px;
      color: #475569;
    }

    .color-dot {
      display: inline-block;
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,0,0,.12);
      vertical-align: middle;
      margin-right: .35rem;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      padding: .2rem .6rem;
      border-radius: 20px;
      font-size: .75rem;
      font-weight: 600;
    }
    .chip-active   { background: #dcfce7; color: #166534; }
    .chip-inactive { background: #f1f5f9; color: #64748b; }
    .chip-default  { background: #dbeafe; color: #1e40af; margin-left: .4rem; }

    .actions-cell { display: flex; gap: .25rem; align-items: center; }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--clr-text-2, #64748b);
    }
    .empty-state mat-icon { font-size: 3rem; width: 3rem; height: 3rem; opacity: .35; margin-bottom: .75rem; }

    /* ── Modals ── */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15,23,42,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .modal {
      background: #fff; border-radius: 16px; padding: 1.75rem;
      width: 100%; max-width: 520px;
      box-shadow: 0 24px 64px rgba(0,0,0,.18);
      max-height: 90vh; overflow-y: auto;
    }
    .modal h3 { font-size: 1.125rem; font-weight: 700; margin: 0 0 1.25rem; color: #0f172a; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .875rem; }
    .form-grid .full { grid-column: 1 / -1; }
    label { display: flex; flex-direction: column; gap: .3rem; font-size: .8125rem; font-weight: 500; color: #374151; }
    input, select, textarea {
      padding: .5rem .75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: .875rem;
      font-family: inherit;
      outline: none;
      transition: border-color .15s;
    }
    input:focus, select:focus, textarea:focus { border-color: #2563eb; }
    .hint { font-size: .75rem; color: #94a3b8; margin-top: .2rem; }
    .modal-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.5rem; }
    .color-preview {
      display: flex; align-items: center; gap: .5rem;
    }
    .color-preview input[type=color] {
      width: 36px; height: 36px; padding: 0;
      border: 1.5px solid #e2e8f0; border-radius: 6px; cursor: pointer;
    }
    .color-preview input[type=text] { flex: 1; }

    @media (max-width: 768px) {
      .ref-layout { grid-template-columns: 1fr; }
      .cat-panel { position: static; max-height: 300px; }
    }
  `],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>tune</mat-icon> Référentiels métiers</h1>
        <p class="erp-page-subtitle">
          Gérez dynamiquement tous les choix des formulaires sans redéploiement
        </p>
      </div>

      <div class="ref-layout">

        <!-- ── Catégories ───────────────────────────────────────────────────── -->
        <aside class="cat-panel">
          <div class="cat-panel-header">
            <span class="cat-panel-title">Catégories</span>
            <button mat-icon-button color="primary" (click)="openCatModal()"
                    matTooltip="Nouvelle catégorie">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div class="cat-list">
            @if (loadingCats()) {
              <div style="padding:1.5rem;text-align:center">
                <mat-spinner diameter="28" />
              </div>
            } @else {
              @for (cat of categories(); track cat.id) {
                <div class="cat-item" [class.active]="selectedCat()?.id === cat.id"
                     (click)="selectCat(cat)">
                  <mat-icon>{{ cat.icon || 'list' }}</mat-icon>
                  <span class="cat-item-name" [matTooltip]="cat.name">{{ cat.name }}</span>
                  @if (cat.system) { <span class="sys-badge">SYS</span> }
                  <span class="cat-count">{{ cat.valueCount }}</span>
                </div>
              }
            }
          </div>
        </aside>

        <!-- ── Valeurs ──────────────────────────────────────────────────────── -->
        <div class="val-panel">

          @if (!selectedCat()) {
            <div class="empty-state">
              <mat-icon>tune</mat-icon>
              <p>Sélectionnez une catégorie pour gérer ses valeurs</p>
            </div>
          } @else {
            <div class="val-header">
              <div>
                <div class="val-title">
                  <mat-icon style="vertical-align:middle;font-size:1.1rem;margin-right:.4rem">
                    {{ selectedCat()!.icon || 'list' }}
                  </mat-icon>
                  {{ selectedCat()!.name }}
                </div>
                <div class="val-subtitle">
                  Code : <code>{{ selectedCat()!.code }}</code>
                  &nbsp;·&nbsp; {{ values().length }} valeur(s)
                  @if (selectedCat()!.description) {
                    &nbsp;·&nbsp; {{ selectedCat()!.description }}
                  }
                </div>
              </div>
              <div style="display:flex;gap:.5rem;align-items:center">
                @if (!selectedCat()!.system) {
                  <button mat-stroked-button color="warn" (click)="deleteCat(selectedCat()!)"
                          matTooltip="Supprimer la catégorie">
                    <mat-icon>delete</mat-icon> Supprimer
                  </button>
                  <button mat-stroked-button (click)="openCatModal(selectedCat()!)">
                    <mat-icon>edit</mat-icon> Modifier
                  </button>
                }
                <button mat-flat-button color="primary" (click)="openValModal()">
                  <mat-icon>add</mat-icon> Ajouter une valeur
                </button>
              </div>
            </div>

            <div class="val-table-wrap">
              @if (loadingVals()) {
                <div style="padding:2rem;text-align:center"><mat-spinner diameter="32" /></div>
              } @else if (values().length === 0) {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>Aucune valeur — cliquez sur « Ajouter une valeur »</p>
                </div>
              } @else {
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Code</th>
                      <th>Libellé</th>
                      <th>Traductions</th>
                      <th>Couleur</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (v of values(); track v.id; let i = $index) {
                      <tr>
                        <td style="color:#94a3b8;font-size:.8rem;width:40px">{{ v.sortOrder }}</td>
                        <td><span class="code-badge">{{ v.code }}</span></td>
                        <td>
                          {{ v.label }}
                          @if (v.defaultValue) {
                            <span class="chip-default status-chip">défaut</span>
                          }
                        </td>
                        <td style="font-size:.8rem;color:#64748b">
                          @if (v.labelFr || v.labelAr || v.labelEn) {
                            {{ v.labelFr || '–' }} / {{ v.labelAr || '–' }} / {{ v.labelEn || '–' }}
                          } @else {
                            <span style="color:#cbd5e1">—</span>
                          }
                        </td>
                        <td>
                          @if (v.color) {
                            <span class="color-dot" [style.background]="v.color"></span>
                            <span style="font-size:.8rem;font-family:monospace">{{ v.color }}</span>
                          } @else {
                            <span style="color:#cbd5e1">—</span>
                          }
                        </td>
                        <td>
                          <span class="status-chip" [class]="v.active ? 'chip-active' : 'chip-inactive'">
                            <mat-icon style="font-size:.875rem;width:.875rem;height:.875rem">
                              {{ v.active ? 'check_circle' : 'cancel' }}
                            </mat-icon>
                            {{ v.active ? 'Actif' : 'Inactif' }}
                          </span>
                        </td>
                        <td>
                          <div class="actions-cell">
                            <button mat-icon-button (click)="openValModal(v)"
                                    matTooltip="Modifier">
                              <mat-icon style="font-size:1.1rem">edit</mat-icon>
                            </button>
                            <button mat-icon-button (click)="toggleVal(v)"
                                    [matTooltip]="v.active ? 'Désactiver' : 'Réactiver'">
                              <mat-icon style="font-size:1.1rem">
                                {{ v.active ? 'toggle_on' : 'toggle_off' }}
                              </mat-icon>
                            </button>
                            <button mat-icon-button color="warn" (click)="deleteVal(v)"
                                    matTooltip="Supprimer">
                              <mat-icon style="font-size:1.1rem">delete</mat-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }

        </div><!-- /val-panel -->

      </div><!-- /ref-layout -->
    </div><!-- /erp-page -->

    <!-- ── Modal : Catégorie ───────────────────────────────────────────────── -->
    @if (showCatModal()) {
      <div class="modal-backdrop" (click)="closeCatModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingCat() ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}</h3>
          <form [formGroup]="catForm" (ngSubmit)="saveCat()">
            <div class="form-grid">
              @if (!editingCat()) {
                <label class="full">
                  Code *
                  <input formControlName="code" placeholder="TYPE_SERRURE">
                  <span class="hint">Majuscules, underscores, sans espaces. Ex : TYPE_SERRURE</span>
                </label>
              }
              <label class="full">
                Nom *
                <input formControlName="name" placeholder="Type de serrure">
              </label>
              <label class="full">
                Description
                <input formControlName="description" placeholder="Description optionnelle">
              </label>
              <label>
                Icône Material
                <input formControlName="icon" placeholder="lock">
                <span class="hint">Nom d'icône Material Icons</span>
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeCatModal()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="catForm.invalid || saving()">
                {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ── Modal : Valeur ─────────────────────────────────────────────────── -->
    @if (showValModal()) {
      <div class="modal-backdrop" (click)="closeValModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingVal() ? 'Modifier la valeur' : 'Nouvelle valeur' }}</h3>
          <form [formGroup]="valForm" (ngSubmit)="saveVal()">
            <div class="form-grid">
              @if (!editingVal()) {
                <label class="full">
                  Code *
                  <input formControlName="code" placeholder="SERRURE_5_POINTS">
                  <span class="hint">Code unique dans la catégorie. Ex : SERRURE_5_POINTS</span>
                </label>
              }
              <label class="full">
                Libellé *
                <input formControlName="label" placeholder="Serrure 5 points">
              </label>
              <label>
                Libellé FR
                <input formControlName="labelFr" placeholder="Serrure 5 points">
              </label>
              <label>
                Libellé AR
                <input formControlName="labelAr" placeholder="قفل 5 نقاط" dir="rtl">
              </label>
              <label class="full">
                Libellé EN
                <input formControlName="labelEn" placeholder="5-point lock">
              </label>
              <label class="full">
                Couleur
                <div class="color-preview">
                  <input type="color" [value]="valForm.get('color')?.value || '#94a3b8'"
                         (input)="valForm.get('color')?.setValue($any($event.target).value)">
                  <input formControlName="color" placeholder="#94a3b8">
                </div>
              </label>
              <label>
                Icône
                <input formControlName="icon" placeholder="lock">
              </label>
              <label>
                Ordre d'affichage
                <input formControlName="sortOrder" type="number" min="0" step="10">
              </label>
              <label style="flex-direction:row;align-items:center;gap:.5rem;cursor:pointer">
                <input type="checkbox" formControlName="defaultValue">
                Valeur par défaut
              </label>
              <label style="flex-direction:row;align-items:center;gap:.5rem;cursor:pointer">
                <input type="checkbox" formControlName="active">
                Active
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeValModal()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="valForm.invalid || saving()">
                {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ReferenceAdminComponent implements OnInit {
  private refSvc = inject(ReferenceService);
  private fb     = inject(FormBuilder);
  private snack  = inject(MatSnackBar);

  // ── State ─────────────────────────────────────────────────────────────────
  categories  = signal<RefCategory[]>([]);
  selectedCat = signal<RefCategory | null>(null);
  values      = signal<RefValue[]>([]);
  loadingCats = signal(false);
  loadingVals = signal(false);
  saving      = signal(false);
  showCatModal = signal(false);
  showValModal = signal(false);
  editingCat  = signal<RefCategory | null>(null);
  editingVal  = signal<RefValue | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────────────
  catForm = this.fb.group({
    code:        ['', Validators.required],
    name:        ['', Validators.required],
    description: [''],
    icon:        [''],
  });

  valForm = this.fb.group({
    code:         ['', Validators.required],
    label:        ['', Validators.required],
    labelFr:      [''],
    labelAr:      [''],
    labelEn:      [''],
    color:        [''],
    icon:         [''],
    sortOrder:    [0],
    defaultValue: [false],
    active:       [true],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.loadingCats.set(true);
    this.refSvc.getCategories().subscribe({
      next: cats => { this.categories.set(cats); this.loadingCats.set(false); },
      error: ()   => { this.loadingCats.set(false); this.snack.open('Erreur chargement catégories', 'OK', { duration: 4000 }); },
    });
  }

  selectCat(cat: RefCategory): void {
    this.selectedCat.set(cat);
    this.loadValues(cat.id);
  }

  loadValues(categoryId: string): void {
    this.loadingVals.set(true);
    this.refSvc.getCategoryValues(categoryId, false).subscribe({
      next: vals => { this.values.set(vals); this.loadingVals.set(false); },
      error: ()   => { this.loadingVals.set(false); this.snack.open('Erreur chargement valeurs', 'OK', { duration: 4000 }); },
    });
  }

  // ── Category CRUD ─────────────────────────────────────────────────────────

  openCatModal(cat?: RefCategory): void {
    this.editingCat.set(cat ?? null);
    this.catForm.reset({
      code:        cat?.code        ?? '',
      name:        cat?.name        ?? '',
      description: cat?.description ?? '',
      icon:        cat?.icon        ?? '',
    });
    if (cat) {
      this.catForm.get('code')?.disable();
    } else {
      this.catForm.get('code')?.enable();
    }
    this.showCatModal.set(true);
  }

  closeCatModal(): void { this.showCatModal.set(false); }

  saveCat(): void {
    if (this.catForm.invalid) return;
    this.saving.set(true);
    const v = this.catForm.getRawValue();
    const req = { code: v.code!, name: v.name!, description: v.description || undefined, icon: v.icon || undefined };
    const editing = this.editingCat();
    const obs = editing
      ? this.refSvc.updateCategory(editing.id, req)
      : this.refSvc.createCategory(req);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeCatModal();
        this.loadCategories();
        this.snack.open(editing ? 'Catégorie mise à jour' : 'Catégorie créée', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message || 'Erreur lors de la sauvegarde', 'Fermer', { duration: 4000 });
      },
    });
  }

  deleteCat(cat: RefCategory): void {
    if (!confirm(`Supprimer la catégorie "${cat.name}" et toutes ses valeurs ?`)) return;
    this.refSvc.deleteCategory(cat.id).subscribe({
      next: () => {
        this.selectedCat.set(null);
        this.values.set([]);
        this.loadCategories();
        this.snack.open('Catégorie supprimée', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Erreur lors de la suppression', 'Fermer', { duration: 4000 });
      },
    });
  }

  // ── Value CRUD ────────────────────────────────────────────────────────────

  openValModal(val?: RefValue): void {
    this.editingVal.set(val ?? null);
    this.valForm.reset({
      code:         val?.code         ?? '',
      label:        val?.label        ?? '',
      labelFr:      val?.labelFr      ?? '',
      labelAr:      val?.labelAr      ?? '',
      labelEn:      val?.labelEn      ?? '',
      color:        val?.color        ?? '',
      icon:         val?.icon         ?? '',
      sortOrder:    val?.sortOrder    ?? (this.values().length + 1) * 10,
      defaultValue: val?.defaultValue ?? false,
      active:       val?.active       ?? true,
    });
    if (val) {
      this.valForm.get('code')?.disable();
    } else {
      this.valForm.get('code')?.enable();
    }
    this.showValModal.set(true);
  }

  closeValModal(): void { this.showValModal.set(false); }

  saveVal(): void {
    if (this.valForm.invalid || !this.selectedCat()) return;
    this.saving.set(true);
    const v = this.valForm.getRawValue();
    const editing = this.editingVal();

    if (editing) {
      const req = {
        label:        v.label!,
        labelFr:      v.labelFr  || undefined,
        labelAr:      v.labelAr  || undefined,
        labelEn:      v.labelEn  || undefined,
        color:        v.color    || undefined,
        icon:         v.icon     || undefined,
        sortOrder:    v.sortOrder ?? undefined,
        active:       v.active   ?? undefined,
        defaultValue: v.defaultValue ?? undefined,
      };
      this.refSvc.updateValue(editing.id, req).subscribe({
        next: () => this.afterValSave('Valeur mise à jour'),
        error: (err) => this.valSaveError(err),
      });
    } else {
      const req = {
        code:         v.code!,
        label:        v.label!,
        labelFr:      v.labelFr  || undefined,
        labelAr:      v.labelAr  || undefined,
        labelEn:      v.labelEn  || undefined,
        color:        v.color    || undefined,
        icon:         v.icon     || undefined,
        sortOrder:    v.sortOrder ?? undefined,
        active:       v.active   ?? undefined,
        defaultValue: v.defaultValue ?? undefined,
      };
      this.refSvc.createValue(this.selectedCat()!.id, req).subscribe({
        next: () => this.afterValSave('Valeur créée'),
        error: (err) => this.valSaveError(err),
      });
    }
  }

  private afterValSave(msg: string): void {
    this.saving.set(false);
    this.closeValModal();
    this.refSvc.invalidate(this.selectedCat()!.code);
    this.loadValues(this.selectedCat()!.id);
    this.loadCategories();
    this.snack.open(msg, 'OK', { duration: 3000 });
  }

  private valSaveError(err: any): void {
    this.saving.set(false);
    this.snack.open(err?.error?.message || 'Erreur lors de la sauvegarde', 'Fermer', { duration: 4000 });
  }

  toggleVal(val: RefValue): void {
    this.refSvc.toggleValue(val.id).subscribe({
      next: updated => {
        this.refSvc.invalidate(this.selectedCat()!.code);
        this.values.update(list => list.map(v => v.id === updated.id ? updated : v));
        this.snack.open(updated.active ? 'Valeur activée' : 'Valeur désactivée', 'OK', { duration: 2500 });
      },
      error: () => this.snack.open('Erreur lors du changement de statut', 'Fermer', { duration: 4000 }),
    });
  }

  deleteVal(val: RefValue): void {
    if (!confirm(`Supprimer la valeur "${val.label}" ?`)) return;
    this.refSvc.deleteValue(val.id).subscribe({
      next: () => {
        this.refSvc.invalidate(this.selectedCat()!.code);
        this.values.update(list => list.filter(v => v.id !== val.id));
        this.loadCategories();
        this.snack.open('Valeur supprimée', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Erreur lors de la suppression', 'Fermer', { duration: 4000 }),
    });
  }
}
