import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole         = 'SUPER_ADMIN' | 'EMPLOYER' | 'EMPLOYEE' | 'CLIENT';
export type EmployeeFunction = 'SALES' | 'WAREHOUSE' | 'BUYER' | 'ACCOUNTANT' | 'SUPPORT' | 'MANAGER';
export type AuditAction      = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPERSONATE' | 'EXPORT' | 'PERMISSION_CHANGE';

export interface UserResponse {
  id: string;
  tenantId: string;
  keycloakId: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeFunction?: EmployeeFunction;
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  keycloakId: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeFunction?: EmployeeFunction;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  employeeFunction?: EmployeeFunction;
  active?: boolean;
}

export interface TenantResponse {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface CreateTenantRequest {
  slug: string;
  name: string;
}

export interface AuditEntry {
  id: number;
  tenantId: string;
  actorId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  prevHash?: string;
  hash?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity`;

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(page = 0, size = 20): Observable<Page<UserResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<UserResponse>>(`${this.base}/users`, { params });
  }

  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.base}/users/${id}`);
  }

  createUser(req: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.base}/users`, req);
  }

  updateUser(id: string, req: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.base}/users/${id}`, req);
  }

  deactivateUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  /** SUPER_ADMIN: resolve Keycloak subject IDs to UserResponse (cross-tenant, for audit log). */
  resolveActors(keycloakIds: string[]): Observable<UserResponse[]> {
    const params = keycloakIds.reduce(
      (httpParams, id) => httpParams.append('ids', id),
      new HttpParams()
    );
    return this.http.get<UserResponse[]>(`${this.base}/users/by-keycloak`, { params });
  }

  // ── Tenants ────────────────────────────────────────────────────────────────
  getTenants(page = 0, size = 20): Observable<Page<TenantResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<TenantResponse>>(`${this.base}/tenants`, { params });
  }

  createTenant(req: CreateTenantRequest): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(`${this.base}/tenants`, req);
  }

  setTenantActive(id: string, active: boolean): Observable<TenantResponse> {
    const endpoint = active ? 'activate' : 'deactivate';
    return this.http.patch<TenantResponse>(`${this.base}/tenants/${id}/${endpoint}`, {});
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  getAuditLog(page = 0, size = 50, action?: AuditAction): Observable<Page<AuditEntry>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (action) params = params.set('action', action);
    return this.http.get<Page<AuditEntry>>(`${this.base}/audit`, { params });
  }
}
