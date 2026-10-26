import {
  Component, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule }         from '@angular/forms';
import { DecimalPipe }   from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatSelectModule }     from '@angular/material/select';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }    from '@angular/material/divider';

import {
  AiService,
  SuggestPriceRequest,
  SuggestPriceResponse,
} from '../../../core/services/ai.service';
import { ReferenceService } from '../../../core/services/reference.service';

@Component({
  selector: 'erp-price-suggestion-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, DecimalPipe,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-indigo-600">psychology</mat-icon>
      Suggestion de prix IA
    </h2>

    <mat-dialog-content class="!pt-2 min-w-[340px]">
      <div class="grid grid-cols-2 gap-3">

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Largeur (mm)</mat-label>
          <input matInput type="number" min="100" max="5000"
                 [(ngModel)]="req.width_mm" placeholder="1200">
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Hauteur (mm)</mat-label>
          <input matInput type="number" min="100" max="5000"
                 [(ngModel)]="req.height_mm" placeholder="1400">
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Série profilé</mat-label>
          <mat-select [(ngModel)]="req.profile_series">
            <mat-option value="">– Inconnu –</mat-option>
            @for (v of profileSeries(); track v.id) {
              <mat-option [value]="v.code">{{ v.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Type de vitrage</mat-label>
          <mat-select [(ngModel)]="req.glass_type">
            <mat-option value="">– Inconnu –</mat-option>
            @for (v of glassTypes(); track v.id) {
              <mat-option [value]="v.code">{{ v.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Ouvrant</mat-label>
          <mat-select [(ngModel)]="req.opening_type">
            <mat-option value="">– Inconnu –</mat-option>
            @for (v of openingTypes(); track v.id) {
              <mat-option [value]="v.code">{{ v.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-1">
          <mat-label>Quantité</mat-label>
          <input matInput type="number" min="1" [(ngModel)]="req.quantity">
        </mat-form-field>
      </div>

      <!-- Result -->
      @if (loading()) {
        <div class="flex justify-center my-4">
          <mat-spinner diameter="36"/>
        </div>
      }

      @if (result()) {
        <mat-divider class="my-4"/>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Surface</span>
            <span class="font-mono">{{ result()!.surface_m2 | number:'1.2-4' }} m²</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Prix de base / m²</span>
            <span class="font-mono">{{ result()!.base_price_per_m2 | number:'1.0-0' }} TND</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Facteur vitrage</span>
            <span class="font-mono">× {{ result()!.glass_factor }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Surcoût ouvrant</span>
            <span class="font-mono">+ {{ result()!.opening_surcharge | number:'1.0-0' }} TND</span>
          </div>
          <mat-divider/>
          <div class="flex justify-between text-base font-semibold">
            <span>Prix unitaire HT</span>
            <span class="text-indigo-700">{{ result()!.unit_price_ht | number:'1.2-2' }} TND</span>
          </div>
          <div class="flex justify-between text-lg font-bold">
            <span>Total HT (× {{ req.quantity }})</span>
            <span class="text-green-700">{{ result()!.total_ht | number:'1.2-2' }} TND</span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs text-gray-400">Confiance IA :</span>
            <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full rounded-full"
                   [class]="confidenceBarClass(result()!.confidence)"
                   [style.width.%]="result()!.confidence * 100">
              </div>
            </div>
            <span class="text-xs font-mono">{{ result()!.confidence * 100 | number:'1.0-0' }}%</span>
          </div>
        </div>
      }

      @if (errorMsg()) {
        <p class="text-red-600 text-sm mt-3">{{ errorMsg() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-stroked-button (click)="calculate()"
              [disabled]="!canCalculate() || loading()">
        <mat-icon>calculate</mat-icon> Calculer
      </button>
      @if (result()) {
        <button mat-raised-button color="primary" (click)="usePrice()">
          <mat-icon>check</mat-icon> Utiliser ce prix
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class PriceSuggestionDialogComponent {
  private readonly ai     = inject(AiService);
  private readonly dialog = inject(MatDialogRef<PriceSuggestionDialogComponent>);
  private readonly refSvc = inject(ReferenceService);

  readonly profileSeries = toSignal(this.refSvc.getValues('GAMME_PROFILE'), { initialValue: [] });
  readonly glassTypes    = toSignal(this.refSvc.getValues('TYPE_VITRAGE'),   { initialValue: [] });
  readonly openingTypes  = toSignal(this.refSvc.getValues('TYPE_OUVERTURE'), { initialValue: [] });

  req: SuggestPriceRequest = {
    width_mm:  1200,
    height_mm: 1400,
    quantity:  1,
    profile_series: 'T60',
    glass_type: 'DV_4_16_4',
    opening_type: 'BATTANT',
  };

  readonly result   = signal<SuggestPriceResponse | null>(null);
  readonly loading  = signal(false);
  readonly errorMsg = signal('');

  canCalculate(): boolean {
    return this.req.width_mm > 0 && this.req.height_mm > 0 && this.req.quantity > 0;
  }

  calculate(): void {
    if (!this.canCalculate()) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.result.set(null);

    this.ai.suggestPrice(this.req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Erreur lors du calcul. Vérifiez que le service IA est disponible.');
        this.loading.set(false);
      },
    });
  }

  usePrice(): void {
    this.dialog.close(this.result());
  }

  confidenceBarClass(c: number): string {
    if (c >= 0.85) return 'bg-green-500';
    if (c >= 0.7) return 'bg-yellow-400';
    return 'bg-orange-400';
  }
}
