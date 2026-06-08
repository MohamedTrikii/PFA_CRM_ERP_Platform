import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe }   from '@angular/common';
import { MatTableModule }     from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule }    from '@angular/material/select';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatTooltipModule }   from '@angular/material/tooltip';
import { FormsModule }        from '@angular/forms';
import {
  IdentityService, AuditEntry, AuditAction
} from '../../../core/services/identity.service';
import { AuthContextService } from '../../../core/services/auth-context.service';

type BadgeClass = 'chip-green' | 'chip-blue' | 'chip-red' | 'chip-violet' | 'chip-gray' | 'chip-orange';

const ACTION_BADGE: Partial<Record<AuditAction, BadgeClass>> = {
  CREATE:           'chip-green',
  UPDATE:           'chip-blue',
  DELETE:           'chip-red',
  LOGIN:            'chip-violet',
  LOGOUT:           'chip-gray',
  IMPERSONATE:      'chip-orange',
  EXPORT:           'chip-blue',
  PERMISSION_CHANGE:'chip-orange',
};

@Component({
  selector: 'erp-audit-log',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule,
    MatTableModule, MatPaginatorModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1><mat-icon>history</mat-icon> Journal d'audit</h1>
        <div class="page-actions">
          <mat-select [(ngModel)]="selectedAction" (ngModelChange)="load()"
                      placeholder="Filtrer par action"
                      style="width:11rem;font-size:.875rem">
            <mat-option [value]="null">Toutes les actions</mat-option>
            <mat-option *ngFor="let a of actions" [value]="a">{{ a }}</mat-option>
          </mat-select>
        </div>
      </div>

      <div class="erp-table-wrap">
                <div *ngIf="loading()" class="erp-loading" style="display:flex;justify-content:center;padding:1rem">
                  <mat-spinner diameter="40"></mat-spinner>
                </div>
                <table mat-table [dataSource]="entries()" class="w-full">

          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let e" style="color:var(--clr-muted);font-size:.8125rem">
              {{ e.id }}
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Horodatage</th>
            <td mat-cell *matCellDef="let e" style="color:var(--clr-text-2)">
              {{ e.createdAt | date:'dd/MM/yy HH:mm' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="tenant">
            <th mat-header-cell *matHeaderCellDef>Tenant</th>
            <td mat-cell *matCellDef="let e">
              <span style="font-weight:600;font-size:.875rem">{{ resolveTenant(e.tenantId) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Action</th>
            <td mat-cell *matCellDef="let e">
              <span [class]="actionBadge(e.action)">{{ e.action }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="entity">
            <th mat-header-cell *matHeaderCellDef>Entité</th>
            <td mat-cell *matCellDef="let e" style="font-size:.875rem">
              <span style="font-weight:500">{{ e.entityType ?? '–' }}</span>
              <span *ngIf="e.entityId"
                    style="color:var(--clr-muted);margin-left:.375rem;font-size:.75rem;font-family:ui-monospace,monospace">
                {{ e.entityId }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actor">
            <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
            <td mat-cell *matCellDef="let e">
              <ng-container *ngIf="resolveActor(e.actorId) as name; else noActor">
                <span style="font-weight:500">{{ name }}</span>
              </ng-container>
              <ng-template #noActor>
                <span style="font-family:ui-monospace,monospace;font-size:.8125rem;color:var(--clr-muted)"
                      [matTooltip]="e.actorId ?? ''">
                  {{ e.actorId ? (e.actorId.slice(0, 8) + '…') : 'système' }}
                </span>
              </ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="ip">
            <th mat-header-cell *matHeaderCellDef>IP</th>
            <td mat-cell *matCellDef="let e" style="color:var(--clr-muted);font-size:.8125rem">
              {{ e.ipAddress ?? '–' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="hash">
            <th mat-header-cell *matHeaderCellDef>Hash</th>
            <td mat-cell *matCellDef="let e"
                style="font-family:ui-monospace,monospace;font-size:.75rem;color:var(--clr-muted)"
                [matTooltip]="e.hash ?? ''">
              {{ e.hash ? e.hash.slice(0, 10) + '…' : '–' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row       *matRowDef="let row; columns: columns;"></tr>
        </table>

        <div *ngIf="!entries().length" class="erp-empty">
          <mat-icon>history</mat-icon>
          <p class="empty-title">Aucune entrée d'audit</p>
        </div>

        <mat-paginator [length]="total()" [pageSize]="pageSize"
                       [pageSizeOptions]="[20, 50, 100]"
                       (page)="onPage($event)"/>
      </div>
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  private readonly svc     = inject(IdentityService);
  private readonly authCtx = inject(AuthContextService);

  columns = ['id', 'createdAt', 'tenant', 'action', 'entity', 'actor', 'ip', 'hash'];
  actions: AuditAction[] = [
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'IMPERSONATE', 'EXPORT', 'PERMISSION_CHANGE',
  ];

  entries       = signal<AuditEntry[]>([]);
  total         = signal(0);
  loading       = signal(false);
  pageSize      = 50;
  page          = 0;
  selectedAction: AuditAction | null = null;

  private tenantMap = new Map<string, string>();  // tenantId → name (slug)
  private actorMap  = new Map<string, string>();  // keycloakId → displayName

  ngOnInit() {
    // Build tenant lookup from the already-loaded tenants list
    this.authCtx.tenants().forEach(t => this.tenantMap.set(t.id, `${t.name} (${t.slug})`));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAuditLog(this.page, this.pageSize, this.selectedAction ?? undefined)
      .pipe(
        catchError(err => { console.error('Audit load error', err); return of({ content: [], totalElements: 0 }); }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(p => {
        this.entries.set(p.content);
        this.total.set(p.totalElements);
        this.resolveActorNames(p.content);
      });
  }

  private resolveActorNames(entries: AuditEntry[]) {
    if (!this.authCtx.isSuperAdmin()) return;
    const ids = [...new Set(entries.map(e => e.actorId).filter((id): id is string => !!id && !this.actorMap.has(id)))];
    if (!ids.length) return;
    this.svc.resolveActors(ids)
      .pipe(catchError(err => { console.warn('Actor resolution failed', err); return of([]); }))
      .subscribe(users =>
        users.forEach(u => this.actorMap.set(u.keycloakId, u.displayName || u.email))
      );
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  resolveTenant(tenantId: string): string {
    return this.tenantMap.get(tenantId) ?? tenantId?.slice(0, 8) + '…';
  }

  resolveActor(actorId: string | undefined): string | null {
    if (!actorId) return null;
    return this.actorMap.get(actorId) ?? null;
  }

  actionBadge(action: AuditAction): BadgeClass { return ACTION_BADGE[action] ?? 'chip-gray'; }

  trackByAction(_i: number, a: AuditAction) { return a; }
}
