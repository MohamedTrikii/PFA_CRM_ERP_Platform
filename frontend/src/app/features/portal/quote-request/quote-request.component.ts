import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { take } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../../core/services/portal.service';
import { AiService } from '../../../core/services/ai.service';
import { ReferenceService, RefValue } from '../../../core/services/reference.service';

@Component({
  selector: 'app-quote-request',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatStepperModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
  ],
  styles: [`
    .step-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem 0 .75rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .5rem 1rem;
    }
    .form-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: .5rem 1rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .5rem 1rem;
    }
    .item-card {
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: var(--r-md, 8px);
      padding: 1rem 1.25rem 1.25rem;
      background: var(--clr-bg, #f8fafc);
      margin-bottom: .75rem;
    }
    .item-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .875rem;
    }
    .item-number {
      font-size: .8125rem;
      font-weight: 700;
      color: var(--clr-primary, #2563eb);
      background: #eff6ff;
      padding: .15rem .625rem;
      border-radius: 12px;
    }
    .ai-suggestion {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-wrap: wrap;
      margin-top: .5rem;
      padding-top: .5rem;
      border-top: 1px dashed var(--clr-border, #e2e8f0);
    }
    .ai-chip {
      font-size: .8125rem;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 6px;
      padding: .25rem .75rem;
      display: flex;
      gap: .625rem;
      align-items: center;
    }
    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
    }
    .summary-card {
      background: var(--clr-surface, #fff);
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: var(--r-md, 8px);
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .summary-card h3 {
      font-size: .875rem;
      font-weight: 700;
      color: var(--clr-text, #0f172a);
      margin: 0 0 .625rem;
      padding-bottom: .5rem;
      border-bottom: 1px solid var(--clr-border, #e2e8f0);
    }
    .summary-row {
      display: flex;
      gap: .25rem;
      font-size: .875rem;
      margin-bottom: .25rem;
      color: var(--clr-text, #0f172a);
    }
    .summary-label { color: var(--clr-muted, #64748b); min-width: 120px; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .8125rem;
      margin-top: .5rem;
    }
    .items-table th, .items-table td {
      padding: .375rem .5rem;
      border: 1px solid var(--clr-border, #e2e8f0);
      text-align: left;
    }
    .items-table th {
      background: var(--clr-bg, #f8fafc);
      font-weight: 600;
      color: var(--clr-text-2, #475569);
      font-size: .75rem;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .success-banner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .75rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      background: var(--clr-surface, #fff);
      border: 1px solid #bbf7d0;
      border-radius: var(--r-md, 8px);
    }
    .success-banner mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #16a34a;
    }
    .success-banner h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #15803d;
      margin: 0;
    }
    .success-banner p {
      margin: 0;
      color: var(--clr-text-2, #475569);
      font-size: .875rem;
    }
  `],
  template: `
    <div class="erp-page">

      <div class="erp-page-header">
        <h1>
          <mat-icon>request_quote</mat-icon>
          Nouvelle demande de devis
        </h1>
        <div class="page-actions">
          <button mat-stroked-button routerLink="/portal/dashboard">
            <mat-icon>arrow_back</mat-icon>
            Mon espace client
          </button>
        </div>
      </div>

      @if (submitted) {
        <div class="success-banner">
          <mat-icon>check_circle</mat-icon>
          <h3>Demande envoyée avec succès !</h3>
          <p>Notre équipe va étudier votre demande et vous contactera dans les 24h à l'adresse <strong>{{ contactForm.value.clientEmail }}</strong>.</p>
          <button mat-raised-button color="primary" routerLink="/portal/dashboard">
            <mat-icon>open_in_new</mat-icon>
            Suivre ma demande
          </button>
        </div>
      } @else {

        <mat-stepper [linear]="true" #stepper orientation="horizontal">

          <!-- ── Étape 1 : Coordonnées ───────────────────────────── -->
          <mat-step [stepControl]="contactForm" label="Coordonnées">
            <form [formGroup]="contactForm">
              <div class="step-content">
                <div class="form-row-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Nom complet *</mat-label>
                    <input matInput formControlName="clientName" placeholder="Jean Dupont"/>
                    <mat-icon matSuffix style="opacity:.4">person</mat-icon>
                    <mat-error>Nom requis (2 caractères min.)</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Email *</mat-label>
                    <input matInput type="email" formControlName="clientEmail"/>
                    <mat-icon matSuffix style="opacity:.4">email</mat-icon>
                    <mat-error>Email valide requis</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Téléphone</mat-label>
                    <input matInput formControlName="clientPhone" placeholder="+212 6XX XXX XXX"/>
                    <mat-icon matSuffix style="opacity:.4">phone</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Adresse de chantier</mat-label>
                    <input matInput formControlName="clientAddress" placeholder="Rue, ville, code postal…"/>
                    <mat-icon matSuffix style="opacity:.4">location_on</mat-icon>
                  </mat-form-field>
                </div>
                <div class="step-actions">
                  <span></span>
                  <button mat-raised-button color="primary" matStepperNext
                          [disabled]="contactForm.invalid">
                    Suivant
                    <mat-icon iconSuffix>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- ── Étape 2 : Type de projet ───────────────────────── -->
          <mat-step [stepControl]="projectForm" label="Projet">
            <form [formGroup]="projectForm">
              <div class="step-content">
                <mat-form-field appearance="outline">
                  <mat-label>Type de menuiserie *</mat-label>
                  <mat-select formControlName="projectType">
                    @for (v of projectTypes; track v.id) {
                      <mat-option [value]="v.code">{{ v.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Sélection requise</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Description du projet</mat-label>
                  <textarea matInput formControlName="description" rows="4"
                            placeholder="Décrivez votre projet, contraintes spécifiques, délais souhaités…"></textarea>
                </mat-form-field>
                <div class="step-actions">
                  <button mat-stroked-button matStepperPrevious>
                    <mat-icon iconPrefix>chevron_left</mat-icon>
                    Précédent
                  </button>
                  <button mat-raised-button color="primary" matStepperNext
                          [disabled]="projectForm.invalid">
                    Suivant
                    <mat-icon iconSuffix>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- ── Étape 3 : Éléments ─────────────────────────────── -->
          <mat-step label="Éléments">
            <div class="step-content">
              <form [formGroup]="mainForm">
                <div formArrayName="items">
                  @for (ctrl of itemsArray.controls; track i; let i = $index) {
                    <div [formGroupName]="i" class="item-card">

                      <div class="item-card-header">
                        <span class="item-number">Élément {{ i + 1 }}</span>
                        @if (itemsArray.length > 1) {
                          <button mat-icon-button color="warn" type="button" (click)="removeItem(i)">
                            <mat-icon>delete_outline</mat-icon>
                          </button>
                        }
                      </div>

                      <!-- Quantité + dimensions -->
                      <div class="form-row-3">
                        <mat-form-field appearance="outline">
                          <mat-label>Quantité *</mat-label>
                          <input matInput type="number" formControlName="quantity" min="1"/>
                          <mat-error>Min. 1</mat-error>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Largeur (mm) *</mat-label>
                          <input matInput type="number" formControlName="widthMm" min="100"/>
                          <mat-error>Min. 100 mm</mat-error>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Hauteur (mm) *</mat-label>
                          <input matInput type="number" formControlName="heightMm" min="100"/>
                          <mat-error>Min. 100 mm</mat-error>
                        </mat-form-field>
                      </div>

                      <!-- Spécifications -->
                      <div class="form-row-2">
                        <mat-form-field appearance="outline">
                          <mat-label>Série profilé</mat-label>
                          <mat-select formControlName="profileSeries">
                            <mat-option value="">Non défini</mat-option>
                            @for (v of profileSeries; track v.id) {
                              <mat-option [value]="v.code">{{ v.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Type d'ouverture</mat-label>
                          <mat-select formControlName="openingType">
                            <mat-option value="">Non défini</mat-option>
                            @for (v of openingTypes; track v.id) {
                              <mat-option [value]="v.code">{{ v.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Vitrage</mat-label>
                          <mat-select formControlName="glassType">
                            <mat-option value="">Non défini</mat-option>
                            @for (v of glassTypes; track v.id) {
                              <mat-option [value]="v.code">{{ v.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Couleur / finition</mat-label>
                          <mat-select formControlName="color">
                            <mat-option value="">Non défini</mat-option>
                            @for (v of colors; track v.id) {
                              <mat-option [value]="v.code">{{ v.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Accessoires</mat-label>
                          <input matInput formControlName="accessories"
                                 placeholder="Volets, grilles, serrure…"/>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Notes sur cet élément</mat-label>
                          <input matInput formControlName="itemNotes"
                                 placeholder="Précisions supplémentaires…"/>
                        </mat-form-field>
                      </div>

                      <!-- Estimation IA -->
                      <div class="ai-suggestion">
                        <button mat-stroked-button type="button"
                                (click)="suggestForItem(i)"
                                [disabled]="!itemGroup(i).get('widthMm')?.value || !itemGroup(i).get('heightMm')?.value">
                          <mat-icon style="color:#7c3aed">psychology</mat-icon>
                          Estimation IA
                        </button>
                        @if (suggestions[i]; as s) {
                          <div class="ai-chip">
                            <span style="color:var(--clr-muted)">Unitaire HT :</span>
                            <strong style="color:#7c3aed">{{ s.unit_price_ht | number:'1.0-2' }} TND</strong>
                            <span style="color:var(--clr-muted);font-size:.75rem">confiance {{ (s.confidence * 100) | number:'1.0-0' }}%</span>
                          </div>
                        }
                      </div>

                    </div>
                  }
                </div>
              </form>

              <button mat-stroked-button color="primary" type="button" (click)="addItem()">
                <mat-icon>add</mat-icon>
                Ajouter un élément
              </button>

              <div class="step-actions">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon iconPrefix>chevron_left</mat-icon>
                  Précédent
                </button>
                <button mat-raised-button color="primary" matStepperNext>
                  Suivant
                  <mat-icon iconSuffix>chevron_right</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <!-- ── Étape 4 : Récapitulatif ────────────────────────── -->
          <mat-step label="Récapitulatif">
            <div class="step-content">

              <!-- Contact summary -->
              <div class="summary-card">
                <h3>Coordonnées</h3>
                <div class="summary-row">
                  <span class="summary-label">Nom</span>
                  <span>{{ contactForm.value.clientName }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Email</span>
                  <span>{{ contactForm.value.clientEmail }}</span>
                </div>
                @if (contactForm.value.clientPhone) {
                  <div class="summary-row">
                    <span class="summary-label">Téléphone</span>
                    <span>{{ contactForm.value.clientPhone }}</span>
                  </div>
                }
                @if (contactForm.value.clientAddress) {
                  <div class="summary-row">
                    <span class="summary-label">Adresse</span>
                    <span>{{ contactForm.value.clientAddress }}</span>
                  </div>
                }
              </div>

              <!-- Project summary -->
              <div class="summary-card">
                <h3>Projet</h3>
                <div class="summary-row">
                  <span class="summary-label">Type</span>
                  <span>{{ projectForm.value.projectType }}</span>
                </div>
                @if (projectForm.value.description) {
                  <div class="summary-row">
                    <span class="summary-label">Description</span>
                    <span style="white-space:pre-line">{{ projectForm.value.description }}</span>
                  </div>
                }
              </div>

              <!-- Items table -->
              <div class="summary-card">
                <h3>Éléments ({{ itemsArray.length }})</h3>
                <div style="overflow-x:auto">
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Qté</th>
                        <th>L × H (mm)</th>
                        <th>Série</th>
                        <th>Ouverture</th>
                        <th>Vitrage</th>
                        <th>Couleur</th>
                        <th>Accessoires</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of itemsArray.value; track j; let j = $index) {
                        <tr>
                          <td>{{ j + 1 }}</td>
                          <td>{{ item.quantity }}</td>
                          <td>{{ item.widthMm }} × {{ item.heightMm }}</td>
                          <td>{{ item.profileSeries || '–' }}</td>
                          <td>{{ item.openingType || '–' }}</td>
                          <td>{{ item.glassType || '–' }}</td>
                          <td>{{ item.color || '–' }}</td>
                          <td>{{ item.accessories || '–' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="step-actions">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon iconPrefix>chevron_left</mat-icon>
                  Précédent
                </button>
                <button mat-raised-button color="primary"
                        (click)="submit()"
                        [disabled]="submitting">
                  @if (submitting) {
                    <ng-container>
                      <mat-icon style="animation:spin 1s linear infinite">sync</mat-icon>
                      Envoi en cours…
                    </ng-container>
                  } @else {
                    <ng-container>
                      <mat-icon>send</mat-icon>
                      Envoyer la demande
                    </ng-container>
                  }
                </button>
              </div>

            </div>
          </mat-step>

        </mat-stepper>

      }

    </div>
  `,
})
export class QuoteRequestComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly portal = inject(PortalService);
  private readonly ai     = inject(AiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly oidc   = inject(OidcSecurityService);
  private readonly refSvc = inject(ReferenceService);

  projectTypes:  RefValue[] = [];
  openingTypes:  RefValue[] = [];
  glassTypes:    RefValue[] = [];
  colors:        RefValue[] = [];
  profileSeries: RefValue[] = [];
  submitting    = false;
  submitted     = false;
  suggestions: Record<number, { unit_price_ht: number; confidence: number } | null> = {};

  contactForm = this.fb.group({
    clientName:    ['', [Validators.required, Validators.minLength(2)]],
    clientEmail:   ['', [Validators.required, Validators.email]],
    clientPhone:   [''],
    clientAddress: [''],
  });

  projectForm = this.fb.group({
    projectType:  ['', Validators.required],
    description:  [''],
  });

  mainForm = this.fb.group({
    items: this.fb.array([this.makeItemGroup()]),
  });

  get itemsArray(): FormArray { return this.mainForm.get('items') as FormArray; }

  ngOnInit(): void {
    // Auto-fill contact fields from the authenticated user's Keycloak profile
    this.oidc.userData$.pipe(take(1)).subscribe(({ userData }) => {
      if (!userData) return;
      const fullName = [userData['given_name'], userData['family_name']]
        .filter(Boolean).join(' ') || userData['preferred_username'] || '';
      this.contactForm.patchValue({
        clientName:  fullName,
        clientEmail: userData['email'] ?? '',
        clientPhone: userData['phone_number'] ?? userData['phoneNumber'] ?? '',
      });
    });

    // Load all reference lists dynamically
    forkJoin({
      projectTypes:  this.refSvc.getValues('CATEGORIE_PRODUIT'),
      openingTypes:  this.refSvc.getValues('TYPE_OUVERTURE'),
      glassTypes:    this.refSvc.getValues('TYPE_VITRAGE'),
      colors:        this.refSvc.getValues('COULEUR'),
      profileSeries: this.refSvc.getValues('GAMME_PROFILE'),
    }).subscribe({
      next: refs => {
        this.projectTypes  = refs.projectTypes;
        this.openingTypes  = refs.openingTypes;
        this.glassTypes    = refs.glassTypes;
        this.colors        = refs.colors;
        this.profileSeries = refs.profileSeries;
      },
    });
  }

  makeItemGroup(): FormGroup {
    return this.fb.group({
      quantity:      [1,    [Validators.required, Validators.min(1)]],
      widthMm:       [null, [Validators.required, Validators.min(100)]],
      heightMm:      [null, [Validators.required, Validators.min(100)]],
      profileSeries: [''],
      openingType:   [''],
      glassType:     [''],
      color:         [''],
      accessories:   [''],
      itemNotes:     [''],
    });
  }

  addItem()             { this.itemsArray.push(this.makeItemGroup()); }
  removeItem(i: number) { this.itemsArray.removeAt(i); delete this.suggestions[i]; }
  itemGroup(i: number)  { return this.itemsArray.at(i) as FormGroup; }

  suggestForItem(i: number) {
    const g = this.itemGroup(i).value;
    this.ai.suggestPrice({
      width_mm:     g.widthMm,
      height_mm:    g.heightMm,
      glass_type:   g.glassType   || undefined,
      opening_type: g.openingType || undefined,
      quantity:     g.quantity    ?? 1,
    }).subscribe({
      next:  r  => { this.suggestions = { ...this.suggestions, [i]: r }; },
      error: () => { this.snack.open('Estimation IA indisponible', '', { duration: 2000 }); },
    });
  }

  submit() {
    if (this.contactForm.invalid || this.projectForm.invalid) return;
    this.submitting = true;

    const payload = {
      ...this.contactForm.value,
      ...this.projectForm.value,
      items: this.itemsArray.value.map((it: any) => ({
        quantity:      it.quantity,
        widthMm:       it.widthMm,
        heightMm:      it.heightMm,
        profileSeries: it.profileSeries || null,
        openingType:   it.openingType   || null,
        glassType:     it.glassType     || null,
        color:         it.color         || null,
        accessories:   it.accessories   || null,
        notes:         it.itemNotes     || null,
      })),
    };

    this.portal.submitRequest(payload as any).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted  = true;
        this.snack.open('Demande envoyée avec succès !', 'OK', { duration: 4000 });
        setTimeout(() => this.router.navigate(['/portal/dashboard']), 3500);
      },
      error: () => {
        this.submitting = false;
        this.snack.open('Erreur lors de l\'envoi. Veuillez réessayer.', 'Fermer', { duration: 5000 });
      },
    });
  }
}
