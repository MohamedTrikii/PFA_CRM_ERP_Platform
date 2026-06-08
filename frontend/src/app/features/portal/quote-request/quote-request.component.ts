import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { PortalService } from '../../../core/services/portal.service';
import { AiService } from '../../../core/services/ai.service';
import { Router } from '@angular/router';

const PROJECT_TYPES = [
  { value: 'FENETRE',       label: 'Fenêtre' },
  { value: 'PORTE',         label: 'Porte d\'entrée' },
  { value: 'PORTE_FENETRE', label: 'Porte-fenêtre' },
  { value: 'BAIE_VITREE',   label: 'Baie vitrée' },
  { value: 'VERANDAS',      label: 'Véranda' },
  { value: 'GARDE_CORPS',   label: 'Garde-corps' },
  { value: 'AUTRE',         label: 'Autre' },
];

const OPENING_TYPES = [
  { value: 'FIXE',           label: 'Fixe' },
  { value: 'BATTANT',        label: 'Battant' },
  { value: 'COULISSANT',     label: 'Coulissant' },
  { value: 'OSCILLO_BATTANT',label: 'Oscillo-battant' },
  { value: 'PIVOTANT',       label: 'Pivotant' },
];

const GLASS_TYPES = [
  { value: 'SIMPLE_4',       label: 'Simple vitrage 4mm' },
  { value: 'DV_4_16_4',      label: 'Double vitrage 4/16/4' },
  { value: 'DV_SECURITE',    label: 'Double vitrage sécurité' },
  { value: 'FEUILLETE',      label: 'Verre feuilleté' },
  { value: 'ARGON',          label: 'Double vitrage argon' },
];

const COLORS = [
  { value: 'RAL 9016 Blanc',         label: 'Blanc (RAL 9016)' },
  { value: 'RAL 7016 Anthracite',    label: 'Gris anthracite (RAL 7016)' },
  { value: 'RAL 8014 Bois',          label: 'Imitation bois (RAL 8014)' },
  { value: 'Anodisé naturel',        label: 'Anodisé naturel' },
  { value: 'Anodisé champagne',      label: 'Anodisé champagne' },
  { value: 'Autre',                  label: 'Autre (préciser en notes)' },
];

@Component({
  selector: 'app-quote-request',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatStepperModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatCardModule,
  ],
  template: `
    <div class="max-w-3xl mx-auto p-6">
      <mat-card class="shadow-lg">
        <mat-card-header class="bg-blue-800 text-white rounded-t px-4 py-3">
          <mat-card-title class="text-xl font-bold text-white">
            Demande de devis – Menuiserie Aluminium
          </mat-card-title>
          <mat-card-subtitle class="text-blue-200">
            Remplissez le formulaire pour recevoir un devis personnalisé
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="pt-4">
          <mat-stepper [linear]="true" #stepper>

            <!-- Step 1 – Contact -->
            <mat-step [stepControl]="contactForm" label="Coordonnées">
              <form [formGroup]="contactForm" class="flex flex-col gap-4 py-4">
                <mat-form-field appearance="outline">
                  <mat-label>Nom complet *</mat-label>
                  <input matInput formControlName="clientName" placeholder="Jean Dupont"/>
                  <mat-error>Nom requis</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email *</mat-label>
                  <input matInput type="email" formControlName="clientEmail" placeholder="jean@exemple.com"/>
                  <mat-error>Email valide requis</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Téléphone</mat-label>
                  <input matInput formControlName="clientPhone" placeholder="+212 6XX XXX XXX"/>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Adresse de chantier</mat-label>
                  <textarea matInput formControlName="clientAddress" rows="2"
                            placeholder="Rue, ville, code postal..."></textarea>
                </mat-form-field>
                <div class="flex justify-end">
                  <button mat-raised-button color="primary" matStepperNext
                          [disabled]="contactForm.invalid">Suivant</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2 – Project type -->
            <mat-step [stepControl]="projectForm" label="Type de projet">
              <form [formGroup]="projectForm" class="flex flex-col gap-4 py-4">
                <mat-form-field appearance="outline">
                  <mat-label>Type de menuiserie *</mat-label>
                  <mat-select formControlName="projectType">
                    @for (t of projectTypes; track t.value) {
                      <mat-option [value]="t.value">{{ t.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Sélection requise</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Description du projet</mat-label>
                  <textarea matInput formControlName="description" rows="3"
                            placeholder="Décrivez votre projet, contraintes spécifiques..."></textarea>
                </mat-form-field>
                <div class="flex justify-between">
                  <button mat-button matStepperPrevious>Précédent</button>
                  <button mat-raised-button color="primary" matStepperNext
                          [disabled]="projectForm.invalid">Suivant</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 3 – Items (dimensions + specs) -->
            <mat-step label="Dimensions & spécifications">
              <div class="py-4">
                <form [formGroup]="mainForm">
                  <div formArrayName="items">
                    @for (item of itemsArray.controls; track i; let i = $index) {
                      <div [formGroupName]="i"
                           class="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                      <div class="flex justify-between items-center mb-3">
                        <span class="font-medium text-gray-700">Élément {{ i + 1 }}</span>
                        @if (itemsArray.length > 1) {
                          <button mat-icon-button color="warn" (click)="removeItem(i)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        }
                      </div>
                      <div class="grid grid-cols-3 gap-3">
                        <mat-form-field appearance="outline">
                          <mat-label>Quantité</mat-label>
                          <input matInput type="number" formControlName="quantity" min="1"/>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Largeur (mm)</mat-label>
                          <input matInput type="number" formControlName="widthMm" min="100"/>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Hauteur (mm)</mat-label>
                          <input matInput type="number" formControlName="heightMm" min="100"/>
                        </mat-form-field>
                      </div>
                      <div class="grid grid-cols-2 gap-3 mt-2">
                        <mat-form-field appearance="outline">
                          <mat-label>Type d'ouverture</mat-label>
                          <mat-select formControlName="openingType">
                            @for (o of openingTypes; track o.value) {
                              <mat-option [value]="o.value">{{ o.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Vitrage</mat-label>
                          <mat-select formControlName="glassType">
                            @for (g of glassTypes; track g.value) {
                              <mat-option [value]="g.value">{{ g.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Couleur / finition</mat-label>
                          <mat-select formControlName="color">
                            @for (c of colors; track c.value) {
                              <mat-option [value]="c.value">{{ c.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Accessoires</mat-label>
                          <input matInput formControlName="accessories"
                                 placeholder="Volets, grilles, serrure..."/>
                        </mat-form-field>
                      </div>
                      <!-- AI price suggestion -->
                      <div class="mt-3 flex items-center gap-3 flex-wrap">
                        <button mat-stroked-button type="button"
                                (click)="suggestForItem(i)"
                                [disabled]="!itemGroup(i).get('widthMm')?.value || !itemGroup(i).get('heightMm')?.value">
                          <mat-icon class="text-purple-500">psychology</mat-icon>
                          Estimation IA
                        </button>
                        @if (suggestions[i]; as s) {
                          <div class="text-sm bg-purple-50 border border-purple-200 rounded px-3 py-1.5 flex gap-4">
                            <span class="text-gray-600">Unitaire HT :</span>
                            <span class="font-semibold text-purple-700">{{ s.unit_price_ht | number:'1.0-2' }} TND</span>
                            <span class="text-gray-400">·</span>
                            <span class="text-gray-500 text-xs">confiance {{ (s.confidence * 100) | number:'1.0-0' }}%</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
                </form>
                <button mat-stroked-button color="primary" (click)="addItem()" class="mb-4">
                  <mat-icon>add</mat-icon> Ajouter un élément
                </button>
                <div class="flex justify-between">
                  <button mat-button matStepperPrevious>Précédent</button>
                  <button mat-raised-button color="primary" matStepperNext>Suivant</button>
                </div>
              </div>
            </mat-step>

            <!-- Step 4 – Summary & submit -->
            <mat-step label="Récapitulatif">
              <div class="py-4">
                <div class="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                  <h3 class="font-semibold text-blue-800 mb-2">Récapitulatif de votre demande</h3>
                  <p><strong>Nom :</strong> {{ contactForm.value.clientName }}</p>
                  <p><strong>Email :</strong> {{ contactForm.value.clientEmail }}</p>
                  <p><strong>Type :</strong> {{ projectForm.value.projectType }}</p>
                  <p><strong>Éléments :</strong> {{ itemsArray.length }}</p>
                </div>
                @if (submitted) {
                  <div class="bg-green-50 border border-green-300 rounded-lg p-4 text-green-800">
                    <mat-icon class="align-middle mr-2 text-green-600">check_circle</mat-icon>
                    Votre demande a été envoyée ! Nous vous contacterons dans les 24h.
                  </div>
                } @else {
                  <div class="flex justify-between">
                    <button mat-button matStepperPrevious>Précédent</button>
                    <button mat-raised-button color="primary" (click)="submit()"
                            [disabled]="submitting">
                      @if (submitting) { Envoi en cours... } @else { Envoyer la demande }
                    </button>
                  </div>
                }
              </div>
            </mat-step>

          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class QuoteRequestComponent {
  private readonly fb      = inject(FormBuilder);
  private readonly portal  = inject(PortalService);
  private readonly ai      = inject(AiService);
  private readonly snack   = inject(MatSnackBar);
  private readonly router  = inject(Router);

  projectTypes = PROJECT_TYPES;
  openingTypes = OPENING_TYPES;
  glassTypes   = GLASS_TYPES;
  colors       = COLORS;
  submitting   = false;
  submitted    = false;
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

  makeItemGroup(): FormGroup {
    return this.fb.group({
      quantity:     [1,    [Validators.required, Validators.min(1)]],
      widthMm:      [null, [Validators.required, Validators.min(100)]],
      heightMm:     [null, [Validators.required, Validators.min(100)]],
      openingType:  [''],
      glassType:    [''],
      color:        [''],
      accessories:  [''],
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
      error: () => { this.snack.open('Estimation indisponible', '', { duration: 2000 }); },
    });
  }

  submit() {
    if (this.contactForm.invalid || this.projectForm.invalid) return;
    this.submitting = true;

    const payload = {
      ...this.contactForm.value,
      ...this.projectForm.value,
      items: this.itemsArray.value.map((i: any) => ({
        quantity:    i.quantity,
        widthMm:     i.widthMm,
        heightMm:    i.heightMm,
        openingType: i.openingType || null,
        glassType:   i.glassType   || null,
        color:       i.color       || null,
        accessories: i.accessories || null,
      })),
    };

    this.portal.submitPublicRequest(payload as any).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted  = true;
        this.snack.open('Demande envoyée avec succès!', 'OK', { duration: 4000 });
      },
      error: () => {
        this.submitting = false;
        this.snack.open('Erreur lors de l\'envoi. Veuillez réessayer.', 'OK', { duration: 4000 });
      },
    });
  }
}
