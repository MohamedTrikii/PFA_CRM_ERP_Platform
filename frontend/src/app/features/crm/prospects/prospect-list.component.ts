import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthContextService } from '../../../core/services/auth-context.service';

interface ProspectSummary {
  id: string; name: string; company: string; email: string;
  status: string; createdAt: string;
}

type BadgeClass = 'chip-blue' | 'chip-green' | 'chip-gray' | 'chip-red' | 'chip-orange' | 'chip-violet';

const STATUS_BADGE: Record<string, BadgeClass> = {
  NOUVEAU:   'chip-blue',
  CONTACTE:  'chip-violet',
  QUALIFIE:  'chip-orange',
  PERDU:     'chip-red',
  CONVERTI:  'chip-green',
};

@Component({
  selector: 'app-prospect-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, RouterModule,
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
    .create-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .5rem 1rem;
      align-items: start;
    }
    .create-form-grid .full { grid-column: 1 / -1; }
    .form-actions {
      display: flex;
      align-items: center;
      gap: .75rem;
      grid-column: 1 / -1;
      margin-top: .5rem;
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
        <h1><mat-icon>contacts</mat-icon> CRM & Prospects</h1>
        <div class="page-actions">
          <button mat-raised-button color="primary" (click)="toggleCreate()">
            <mat-icon>{{ showCreate ? 'close' : 'add' }}</mat-icon>
            {{ showCreate ? 'Annuler' : 'Nouveau prospect' }}
          </button>
        </div>
      </div>

      @if (showCreate) {
        <div class="create-card">
          <p class="card-title">Nouveau prospect</p>
          <form [formGroup]="createForm" (ngSubmit)="onCreate()" class="create-form-grid">

            <!-- Tenant picker: SUPER_ADMIN only -->
            @if (authCtx.isSuperAdmin()) {
              <mat-form-field appearance="outline" class="full">
                <mat-label>Tenant *</mat-label>
                <mat-select formControlName="tenantId">
                  @for (t of authCtx.tenants(); track t.id) {
                    <mat-option [value]="t.id">{{ t.name }} <span style="font-size:.8em;color:var(--clr-muted)">({{ t.slug }})</span></mat-option>
                  }
                </mat-select>
                <mat-hint>Tenant cible pour ce prospect</mat-hint>
              </mat-form-field>
            }

            <mat-form-field appearance="outline">
              <mat-label>Nom complet *</mat-label>
              <input matInput formControlName="name" placeholder="Jean Dupont">
              <mat-error>Champ obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Société</mat-label>
              <input matInput formControlName="company" placeholder="SARL Aluminium Pro">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email *</mat-label>
              <input matInput formControlName="email" type="email" placeholder="contact@example.com">
              <mat-error>Email invalide</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="phone" placeholder="+212 6XX XXX XXX">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Source</mat-label>
              <input matInput formControlName="source" placeholder="Site web, recommandation…">
            </mat-form-field>

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

      @if (loading) {
        <div style="display:flex;justify-content:center;padding:3rem">
          <mat-spinner diameter="40"/>
        </div>
      } @else {
        <div class="erp-table-wrap">
          <table mat-table [dataSource]="prospects" class="w-full">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nom</th>
              <td mat-cell *matCellDef="let r">
                <span style="font-weight:600">{{ r.name }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="company">
              <th mat-header-cell *matHeaderCellDef>Société</th>
              <td mat-cell *matCellDef="let r">{{ r.company }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-text-2)">{{ r.email }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let r">
                <span [class]="statusBadge(r.status)">{{ r.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Créé le</th>
              <td mat-cell *matCellDef="let r" style="color:var(--clr-muted)">
                {{ r.createdAt | date:'dd/MM/yyyy' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let r; columns: columns"></tr>
          </table>

          @if (!prospects.length) {
            <div class="erp-empty">
              <mat-icon>contacts</mat-icon>
              <p class="empty-title">Aucun prospect trouvé</p>
              <span class="empty-sub">Cliquez sur "Nouveau prospect" pour commencer.</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProspectListComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly fb    = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  readonly authCtx       = inject(AuthContextService);

  prospects: ProspectSummary[] = [];
  loading    = true;
  saving     = false;
  showCreate = false;
  columns    = ['name', 'company', 'email', 'status', 'createdAt'];

  createForm = this.fb.group({
    tenantId: [null as string | null],
    name:     ['', Validators.required],
    company:  [''],
    email:    ['', [Validators.required, Validators.email]],
    phone:    [''],
    source:   [''],
  });

  ngOnInit() {
    this.load();
    if (this.authCtx.isSuperAdmin()) {
      this.createForm.get('tenantId')!.addValidators(Validators.required);
      this.createForm.get('tenantId')!.updateValueAndValidity();
    }
  }

  load() {
    this.loading = true;
    this.http.get<any>('/api/v1/crm/prospects?size=50').subscribe({
      next: page => { this.prospects = page.content ?? page; this.loading = false; },
      error:     () => { this.loading = false; },
    });
  }

  toggleCreate() {
    this.showCreate = !this.showCreate;
    if (!this.showCreate) this.createForm.reset();
  }

  onCreate() {
    if (this.createForm.invalid) return;
    this.saving = true;
    this.http.post<ProspectSummary>('/api/v1/crm/prospects', this.createForm.value).subscribe({
      next: () => {
        this.saving     = false;
        this.showCreate = false;
        this.createForm.reset();
        this.snack.open('Prospect créé avec succès', 'OK', { duration: 3000 });
        this.load();
      },
      error: () => {
        this.saving = false;
        this.snack.open('Erreur lors de la création', 'Fermer', { duration: 4000 });
      },
    });
  }

  statusBadge(status: string): BadgeClass {
    return STATUS_BADGE[status] ?? 'chip-gray';
  }
}
