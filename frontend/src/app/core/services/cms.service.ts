import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BrandingResponse {
  id: string;
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss: string | null;
  updatedAt: string;
}

export interface BrandingUpdateRequest {
  companyName?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCss?: string;
}

export type NoticeSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface NoticeResponse {
  id: string;
  title: string;
  body: string | null;
  severity: NoticeSeverity;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface NoticeCreateRequest {
  title: string;
  body?: string;
  severity?: NoticeSeverity;
  startsAt?: string;
  endsAt?: string;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
}

export interface TenantUserCount {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  userCount: number;
}

const CMS      = '/api/v1/cms';
const IDENTITY = '/api/v1/identity';

@Injectable({ providedIn: 'root' })
export class CmsService {
  private http = inject(HttpClient);

  // ── Branding ──────────────────────────────────────────────────────────────

  getBranding(tenantId?: string): Observable<BrandingResponse> {
    const params = tenantId ? new HttpParams().set('tenantId', tenantId) : undefined;
    return this.http.get<BrandingResponse>(`${CMS}/branding`, { params });
  }

  updateBranding(req: BrandingUpdateRequest & { tenantId?: string }): Observable<BrandingResponse> {
    return this.http.put<BrandingResponse>(`${CMS}/branding`, req);
  }

  uploadLogo(file: File): Observable<BrandingResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<BrandingResponse>(`${CMS}/branding/logo`, fd);
  }

  uploadFavicon(file: File): Observable<BrandingResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<BrandingResponse>(`${CMS}/branding/favicon`, fd);
  }

  // ── Notices ───────────────────────────────────────────────────────────────

  getActiveNotices(): Observable<NoticeResponse[]> {
    return this.http.get<NoticeResponse[]>(`${CMS}/notices/active`);
  }

  getAllNotices(): Observable<NoticeResponse[]> {
    return this.http.get<NoticeResponse[]>(`${CMS}/notices`);
  }

  createNotice(req: NoticeCreateRequest): Observable<NoticeResponse> {
    return this.http.post<NoticeResponse>(`${CMS}/notices`, req);
  }

  updateNotice(id: string, req: NoticeCreateRequest & { active: boolean }): Observable<NoticeResponse> {
    return this.http.put<NoticeResponse>(`${CMS}/notices/${id}`, req);
  }

  deleteNotice(id: string): Observable<void> {
    return this.http.delete<void>(`${CMS}/notices/${id}`);
  }

  // ── Platform stats (SUPER_ADMIN) ─────────────────────────────────────────

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${IDENTITY}/platform/stats`);
  }

  getTenantsWithUserCounts(): Observable<TenantUserCount[]> {
    return this.http.get<TenantUserCount[]>(`${IDENTITY}/platform/tenants`);
  }
}
