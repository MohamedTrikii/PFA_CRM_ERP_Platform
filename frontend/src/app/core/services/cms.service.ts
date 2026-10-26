import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Public-site content types ─────────────────────────────────────────────────

export interface GalleryItem { fid: string; url: string; caption: string; alt: string; }
export interface ServiceItem { title: string; description: string; icon: string; }
export interface StatItem    { label: string; value: string; }

export interface BrandingResponse {
  id:             string;
  companyName:    string;
  tagline:        string;
  logoUrl:        string | null;
  faviconUrl:     string | null;
  primaryColor:   string;
  secondaryColor: string;
  fontFamily:     string;
  customCss:      string | null;
  updatedAt:      string;
  // Public site content
  heroTitle?:      string | null;
  heroSubtitle?:   string | null;
  heroCtaText?:    string | null;
  aboutTitle?:     string | null;
  aboutText?:      string | null;
  siteDescription?: string | null;
  services?:       ServiceItem[];
  gallery?:        GalleryItem[];
  stats?:          StatItem[];
  contactEmail?:   string | null;
  contactPhone?:   string | null;
  contactAddress?: string | null;
  socialFacebook?:  string | null;
  socialLinkedin?:  string | null;
  socialInstagram?: string | null;
  socialTwitter?:   string | null;
}

export interface BrandingUpdateRequest {
  companyName?:    string;
  tagline?:        string;
  primaryColor?:   string;
  secondaryColor?: string;
  fontFamily?:     string;
  customCss?:      string;
  tenantId?:       string;
  // Public site content
  heroTitle?:      string;
  heroSubtitle?:   string;
  heroCtaText?:    string;
  aboutTitle?:     string;
  aboutText?:      string;
  siteDescription?: string;
  servicesJson?:   string;
  statsJson?:      string;
  contactEmail?:   string;
  contactPhone?:   string;
  contactAddress?: string;
  socialFacebook?:  string;
  socialLinkedin?:  string;
  socialInstagram?: string;
  socialTwitter?:   string;
}

export type NoticeSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface NoticeResponse {
  id:        string;
  title:     string;
  body:      string | null;
  severity:  NoticeSeverity;
  active:    boolean;
  startsAt:  string | null;
  endsAt:    string | null;
  createdAt: string;
}

export interface NoticeCreateRequest {
  title:     string;
  body?:     string;
  severity?: NoticeSeverity;
  startsAt?: string;
  endsAt?:   string;
}

export interface PlatformStats      { totalTenants: number; activeTenants: number; totalUsers: number; }
export interface TenantUserCount    { id: string; name: string; slug: string; active: boolean; userCount: number; }

const CMS      = '/api/v1/cms';
const IDENTITY = '/api/v1/identity';

@Injectable({ providedIn: 'root' })
export class CmsService {
  private http = inject(HttpClient);

  // ── Branding (authenticated) ──────────────────────────────────────────────

  getBranding(tenantId?: string): Observable<BrandingResponse> {
    const params = tenantId ? new HttpParams().set('tenantId', tenantId) : undefined;
    return this.http.get<BrandingResponse>(`${CMS}/branding`, { params });
  }

  /** Public endpoint — no auth token required. */
  getPublicBranding(tenantId: string): Observable<BrandingResponse> {
    const params = new HttpParams().set('tenantId', tenantId);
    return this.http.get<BrandingResponse>(`${CMS}/branding/public`, { params });
  }

  updateBranding(req: BrandingUpdateRequest): Observable<BrandingResponse> {
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

  // ── Gallery ───────────────────────────────────────────────────────────────

  uploadGalleryImage(file: File, caption = '', alt = ''): Observable<BrandingResponse> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    fd.append('alt', alt);
    return this.http.post<BrandingResponse>(`${CMS}/branding/gallery`, fd);
  }

  deleteGalleryImage(fid: string): Observable<BrandingResponse> {
    const params = new HttpParams().set('fid', fid);
    return this.http.delete<BrandingResponse>(`${CMS}/branding/gallery`, { params });
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
