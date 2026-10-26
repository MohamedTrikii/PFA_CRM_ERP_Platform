import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DevisSummary, FactureSummary, Page } from './sales.service';

export interface DevisRequestItem {
  quantity: number;
  widthMm: number;
  heightMm: number;
  profileSeries?: string;
  openingType?: string;
  glassType?: string;
  color?: string;
  accessories?: string;
  notes?: string;
}

export interface DevisRequestCreate {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  projectType: string;
  description?: string;
  items: DevisRequestItem[];
}

export interface DevisRequestSummary {
  id: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  status: string;
  convertedDevisId: string | null;
  itemCount: number;
  createdAt: string;
}

export interface DevisRequestItemResponse {
  id: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  profileSeries?: string;
  openingType?: string;
  glassType?: string;
  color?: string;
  accessories?: string;
  notes?: string;
}

export interface DevisRequestDetail {
  id: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  projectType: string;
  description?: string;
  status: string;
  convertedDevisId: string | null;
  notes?: string;
  items: DevisRequestItemResponse[];
  createdAt: string;
  updatedAt: string;
}

const BASE = '/api/v1/sales';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private http = inject(HttpClient);

  // ── CLIENT portal ─────────────────────────────────────────────────────────
  myDevis(): Observable<DevisSummary[]> {
    return this.http.get<DevisSummary[]>(`${BASE}/portal/devis`);
  }
  myFactures(): Observable<FactureSummary[]> {
    return this.http.get<FactureSummary[]>(`${BASE}/portal/factures`);
  }
  myRequests(): Observable<DevisRequestSummary[]> {
    return this.http.get<DevisRequestSummary[]>(`${BASE}/portal/requests`);
  }
  submitRequest(payload: DevisRequestCreate): Observable<DevisRequestDetail> {
    return this.http.post<DevisRequestDetail>(`${BASE}/portal/requests`, payload);
  }
  submitPublicRequest(payload: DevisRequestCreate): Observable<DevisRequestDetail> {
    return this.http.post<DevisRequestDetail>(`${BASE}/requests/public`, payload);
  }
  downloadDevisPdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE}/portal/devis/${id}/pdf`, { responseType: 'blob' });
  }
  downloadFacturePdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE}/portal/factures/${id}/pdf`, { responseType: 'blob' });
  }

  // ── STAFF (SUPER_ADMIN / EMPLOYER / EMPLOYEE) ──────────────────────────────
  getAllRequests(page = 0, size = 20): Observable<Page<DevisRequestSummary>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<DevisRequestSummary>>(`${BASE}/requests`, { params });
  }
  getRequestById(id: string): Observable<DevisRequestDetail> {
    return this.http.get<DevisRequestDetail>(`${BASE}/requests/${id}`);
  }
  updateRequestStatus(id: string, notes: string, status: string): Observable<DevisRequestDetail> {
    return this.http.patch<DevisRequestDetail>(`${BASE}/requests/${id}/status`, { notes, status });
  }
  linkDevis(requestId: string, devisId: string): Observable<DevisRequestDetail> {
    return this.http.post<DevisRequestDetail>(`${BASE}/requests/${requestId}/link-devis/${devisId}`, {});
  }
}
