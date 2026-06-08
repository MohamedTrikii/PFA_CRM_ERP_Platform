import {
  Component, OnInit, inject, signal
} from '@angular/core';
import { NgFor, NgIf, DatePipe }    from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule }   from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }    from '@angular/material/icon';
import { MatInputModule }   from '@angular/material/input';
import { MatSelectModule }  from '@angular/material/select';
import { MatCardModule }    from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  IdentityService, UserResponse, UserRole, EmployeeFunction
} from '../../../core/services/identity.service';
import { AuthContextService } from '../../../core/services/auth-context.service';

type RoleBadge = 'chip-red' | 'chip-blue' | 'chip-green' | 'chip-gray';

const ROLE_BADGE: Record<UserRole, RoleBadge> = {
  SUPER_ADMIN: 'chip-red',
  EMPLOYER:    'chip-blue',
  EMPLOYEE:    'chip-green',
  CLIENT:      'chip-gray',
};

@Component({
  selector: 'erp-user-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatInputModule, MatSelectModule,
    MatCardModule, MatSnackBarModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>people</mat-icon> Utilisateurs</h1>
        <div class="page-actions">
          <button mat-raised-button color="primary" (click)="showCreate = !showCreate">
            <mat-icon>add</mat-icon> Nouvel utilisateur
          </button>
        </div>
      </div>

      <!-- Create form -->
      @if (showCreate) {
        <mat-card class="anim-fade-up">
          <mat-card-content style="padding:1.25rem">
            <form [formGroup]="createForm" (ngSubmit)="onCreate()"
                  style="display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end">

              <!-- Tenant picker: SUPER_ADMIN only -->
              @if (authCtx.isSuperAdmin()) {
                <mat-form-field class="w-56" appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Tenant *</mat-label>
                  <mat-select formControlName="tenantId">
                    @for (t of authCtx.tenants(); track t.id) {
                      <mat-option [value]="t.id">{{ t.name }} <span style="color:var(--clr-muted);font-size:.8em">({{ t.slug }})</span></mat-option>
                    }
                  </mat-select>
                  <mat-hint>Tenant cible pour cet utilisateur</mat-hint>
                </mat-form-field>
              }

              <mat-form-field class="w-48" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Keycloak ID</mat-label>
                <input matInput formControlName="keycloakId" />
              </mat-form-field>
              <mat-form-field class="w-52" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" />
              </mat-form-field>
              <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nom affiché</mat-label>
                <input matInput formControlName="displayName" />
              </mat-form-field>
              <mat-form-field class="w-36" appearance="outline" subscriptSizing="dynamic">
                <mat-label>Rôle</mat-label>
                <mat-select formControlName="role">
                  <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field class="w-40" appearance="outline" subscriptSizing="dynamic"
                              *ngIf="createForm.value.role === 'EMPLOYEE'">
                <mat-label>Fonction</mat-label>
                <mat-select formControlName="employeeFunction">
                  <mat-option *ngFor="let f of functions" [value]="f">{{ f }}</mat-option>
                </mat-select>
              </mat-form-field>
              <div style="display:flex;gap:.5rem">
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="createForm.invalid">Enregistrer</button>
                <button mat-button type="button" (click)="showCreate = false">Annuler</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Users table -->
      <div class="erp-table-wrap">
        <table mat-table [dataSource]="users()" class="w-full">

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u" style="font-weight:500">{{ u.email }}</td>
          </ng-container>

          <ng-container matColumnDef="displayName">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let u">{{ u.displayName }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rôle</th>
            <td mat-cell *matCellDef="let u">
              <span [class]="roleBadge(u.role)">{{ u.role }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="function">
            <th mat-header-cell *matHeaderCellDef>Fonction</th>
            <td mat-cell *matCellDef="let u" style="color:var(--clr-text-2)">
              {{ u.employeeFunction ?? '–' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Actif</th>
            <td mat-cell *matCellDef="let u">
              <mat-icon [style.color]="u.active ? 'var(--clr-success)' : 'var(--clr-muted)'">
                {{ u.active ? 'check_circle' : 'cancel' }}
              </mat-icon>
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Créé</th>
            <td mat-cell *matCellDef="let u" style="color:var(--clr-muted)">
              {{ u.createdAt | date:'dd/MM/yy' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <button mat-icon-button color="warn" (click)="onDeactivate(u)"
                      [disabled]="!u.active" title="Désactiver">
                <mat-icon>person_off</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row       *matRowDef="let row; columns: columns;"></tr>
        </table>

        @if (!users().length) {
          <div class="erp-empty">
            <mat-icon>people</mat-icon>
            <p class="empty-title">Aucun utilisateur trouvé</p>
          </div>
        }

        <mat-paginator [length]="total()" [pageSize]="pageSize"
                       [pageSizeOptions]="[10, 20, 50]"
                       (page)="onPage($event)"/>
      </div>
    </div>
  `,
})
export class UserManagementComponent implements OnInit {
  private readonly svc   = inject(IdentityService);
  private readonly fb    = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  readonly authCtx       = inject(AuthContextService);

  columns   = ['email', 'displayName', 'role', 'function', 'active', 'created', 'actions'];
  roles: UserRole[]             = ['SUPER_ADMIN', 'EMPLOYER', 'EMPLOYEE', 'CLIENT'];
  functions: EmployeeFunction[] = ['SALES', 'WAREHOUSE', 'BUYER', 'ACCOUNTANT', 'SUPPORT', 'MANAGER'];

  users     = signal<UserResponse[]>([]);
  total     = signal(0);
  pageSize  = 20;
  page      = 0;
  showCreate = false;

  createForm = this.fb.group({
    tenantId:         [null as string | null],
    keycloakId:       ['', Validators.required],
    email:            ['', [Validators.required, Validators.email]],
    displayName:      [''],
    role:             ['EMPLOYEE' as UserRole, Validators.required],
    employeeFunction: [null as EmployeeFunction | null],
  });

  ngOnInit() {
    this.load();
    // Make tenantId required for SUPER_ADMIN
    if (this.authCtx.isSuperAdmin()) {
      this.createForm.get('tenantId')!.addValidators(Validators.required);
      this.createForm.get('tenantId')!.updateValueAndValidity();
    }
  }

  load() {
    this.svc.getUsers(this.page, this.pageSize).subscribe(p => {
      this.users.set(p.content);
      this.total.set(p.totalElements);
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  onCreate() {
    if (this.createForm.invalid) return;
    const v = this.createForm.value as any;
    this.svc.createUser(v).subscribe({
      next: () => {
        this.snack.open('Utilisateur créé', 'OK', { duration: 3000 });
        this.showCreate = false;
        this.createForm.reset({ role: 'EMPLOYEE' });
        this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Erreur', 'OK', { duration: 4000 }),
    });
  }

  onDeactivate(u: UserResponse) {
    this.svc.deactivateUser(u.id).subscribe({
      next: () => { this.snack.open('Utilisateur désactivé', 'OK', { duration: 3000 }); this.load(); },
      error: e => this.snack.open(e.error?.message ?? 'Erreur', 'OK', { duration: 4000 }),
    });
  }

  roleBadge(role: UserRole): RoleBadge { return ROLE_BADGE[role] ?? 'chip-gray'; }
}
