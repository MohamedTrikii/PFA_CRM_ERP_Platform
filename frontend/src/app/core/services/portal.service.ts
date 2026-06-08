import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DevisSummary, FactureSummary } from './sales.service';

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

const BASE = '/api/v1/sales';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private http = inject(HttpClient);

  myDevis(): Observable<DevisSummary[]> {
    return this.http.get<DevisSummary[]>(`${BASE}/portal/devis`);
  }
  myFactures(): Observable<FactureSummary[]> {
    return this.http.get<FactureSummary[]>(`${BASE}/portal/factures`);
  }
  myRequests(): Observable<DevisRequestSummary[]> {
    return this.http.get<DevisRequestSummary[]>(`${BASE}/portal/requests`);
  }
  submitRequest(payload: DevisRequestCreate): Observable<any> {
    return this.http.post(`${BASE}/portal/requests`, payload);
  }
  submitPublicRequest(payload: DevisRequestCreate): Observable<any> {
    return this.http.post(`${BASE}/requests/public`, payload);
  }
  downloadDevisPdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE}/portal/devis/${id}/pdf`, { responseType: 'blob' });
  }
  downloadFacturePdf(id: string): Observable<Blob> {
    return this.http.get(`${BASE}/portal/factures/${id}/pdf`, { responseType: 'blob' });
  }
}
