import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface RefCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  system: boolean;
  sortOrder: number;
  valueCount: number;
  updatedAt: string;
}

export interface RefValue {
  id: string;
  categoryId: string;
  categoryCode: string;
  code: string;
  label: string;
  labelFr: string | null;
  labelAr: string | null;
  labelEn: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  defaultValue: boolean;
  updatedAt: string;
}

export interface RefValueCreateRequest {
  code: string;
  label: string;
  labelFr?: string;
  labelAr?: string;
  labelEn?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
  defaultValue?: boolean;
}

export interface RefValueUpdateRequest {
  label: string;
  labelFr?: string;
  labelAr?: string;
  labelEn?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
  defaultValue?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private http = inject(HttpClient);

  // Per-category observable cache (session-level, invalidated on mutation)
  private readonly cache = new Map<string, Observable<RefValue[]>>();

  // ── Public reads (used by forms, including unauthenticated) ────────────────

  getValues(categoryCode: string): Observable<RefValue[]> {
    if (!this.cache.has(categoryCode)) {
      const obs$ = this.http
        .get<RefValue[]>(`/api/v1/cms/references/values/${categoryCode}`)
        .pipe(shareReplay(1));
      this.cache.set(categoryCode, obs$);
    }
    return this.cache.get(categoryCode)!;
  }

  // ── Admin reads ────────────────────────────────────────────────────────────

  getCategories(): Observable<RefCategory[]> {
    return this.http.get<RefCategory[]>('/api/v1/cms/references/categories');
  }

  getCategoryValues(categoryId: string, activeOnly = false): Observable<RefValue[]> {
    return this.http.get<RefValue[]>(
      `/api/v1/cms/references/categories/${categoryId}/values`,
      { params: { activeOnly: String(activeOnly) } }
    );
  }

  // ── Category mutations (SUPER_ADMIN) ──────────────────────────────────────

  createCategory(req: { code: string; name: string; description?: string; icon?: string }): Observable<RefCategory> {
    return this.http.post<RefCategory>('/api/v1/cms/references/categories', req);
  }

  updateCategory(id: string, req: { code: string; name: string; description?: string; icon?: string }): Observable<RefCategory> {
    return this.http.put<RefCategory>(`/api/v1/cms/references/categories/${id}`, req);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/cms/references/categories/${id}`);
  }

  // ── Value mutations (SUPER_ADMIN / EMPLOYER) ──────────────────────────────

  createValue(categoryId: string, req: RefValueCreateRequest): Observable<RefValue> {
    return this.http.post<RefValue>(`/api/v1/cms/references/categories/${categoryId}/values`, req);
  }

  updateValue(id: string, req: RefValueUpdateRequest): Observable<RefValue> {
    return this.http.put<RefValue>(`/api/v1/cms/references/values/${id}`, req);
  }

  toggleValue(id: string): Observable<RefValue> {
    return this.http.patch<RefValue>(`/api/v1/cms/references/values/${id}/toggle`, {});
  }

  deleteValue(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/cms/references/values/${id}`);
  }

  reorderValues(categoryId: string, orderedIds: string[]): Observable<void> {
    return this.http.patch<void>(
      `/api/v1/cms/references/categories/${categoryId}/values/reorder`,
      { orderedIds }
    );
  }

  // ── Cache management ──────────────────────────────────────────────────────

  invalidate(categoryCode?: string): void {
    if (categoryCode) {
      this.cache.delete(categoryCode);
    } else {
      this.cache.clear();
    }
  }
}
