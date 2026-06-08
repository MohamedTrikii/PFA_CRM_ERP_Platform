import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule }    from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatInputModule }    from '@angular/material/input';
import { MatCardModule }     from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { IdentityService, TenantResponse } from '../../../core/services/identity.service';

@Component({
  selector: 'erp-tenant-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatInputModule, MatCardModule, MatSnackBarModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>business</mat-icon> Tenants</h1>
        <div class="page-actions">
          <button mat-raised-button color="primary" (click)="showCreate = !showCreate">
            <mat-icon>add</mat-icon> Nouveau tenant
          </button>
        </div>
      </div>

      @if (showCreate) {
        <mat-card class="anim-fade-up">
          <mat-card-content style="padding:1.25rem">
            <form [formGroup]="form" (ngSubmit)="onCreate()"
                  style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:flex-end">
              <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Slug</mat-label>
                <input matInput formControlName="slug" placeholder="ma-societe" />
              </mat-form-field>
              <mat-form-field class="w-60" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <div style="display:flex;gap:.5rem">
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="form.invalid">Enregistrer</button>
                <button mat-button type="button" (click)="showCreate = false">Annuler</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <div class="erp-table-wrap">
        <table mat-table [dataSource]="tenants()" class="w-full">

          <ng-container matColumnDef="slug">
            <th mat-header-cell *matHeaderCellDef>Slug</th>
            <td mat-cell *matCellDef="let t">
              <span style="font-family:ui-monospace,monospace;font-size:.8125rem;font-weight:600">{{ t.slug }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let t" style="font-weight:500">{{ t.name }}</td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Actif</th>
            <td mat-cell *matCellDef="let t">
              <span [class]="t.active ? 'chip-green' : 'chip-gray'">
                {{ t.active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Créé</th>
            <td mat-cell *matCellDef="let t" style="color:var(--clr-muted)">
              {{ t.createdAt | date:'dd/MM/yyyy' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let t">
              <button mat-icon-button (click)="toggle(t)"
                      [title]="t.active ? 'Désactiver' : 'Activer'"
                      [style.color]="t.active ? 'var(--clr-danger)' : 'var(--clr-success)'">
                <mat-icon>{{ t.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row       *matRowDef="let row; columns: columns;"></tr>
        </table>

        @if (!tenants().length) {
          <div class="erp-empty">
            <mat-icon>business</mat-icon>
            <p class="empty-title">Aucun tenant trouvé</p>
          </div>
        }

        <mat-paginator [length]="total()" [pageSize]="pageSize"
                       (page)="onPage($event)"/>
      </div>
    </div>
  `,
})
export class TenantManagementComponent implements OnInit {
  private readonly svc   = inject(IdentityService);
  private readonly fb    = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  columns   = ['slug', 'name', 'active', 'created', 'actions'];
  tenants   = signal<TenantResponse[]>([]);
  total     = signal(0);
  pageSize  = 20;
  page      = 0;
  showCreate = false;

  form = this.fb.group({
    slug: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]],
    name: ['', Validators.required],
  });

  ngOnInit() { this.load(); }

  load() {
    this.svc.getTenants(this.page, this.pageSize).subscribe(p => {
      this.tenants.set(p.content);
      this.total.set(p.totalElements);
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.load(); }

  onCreate() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    this.svc.createTenant(v).subscribe({
      next: () => {
        this.snack.open('Tenant créé', 'OK', { duration: 3000 });
        this.showCreate = false;
        this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Erreur', 'OK', { duration: 4000 }),
    });
  }

  toggle(t: TenantResponse) {
    this.svc.setTenantActive(t.id, !t.active).subscribe({
      next: () => this.load(),
      error: e => this.snack.open(e.error?.message ?? 'Erreur', 'OK', { duration: 4000 }),
    });
  }
}
