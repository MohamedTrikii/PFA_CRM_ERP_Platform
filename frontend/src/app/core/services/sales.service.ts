import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductResponse {
  id: string; reference: string; name: string; description: string;
  unit: string; unitPrice: number; tvaRate: number; active: boolean; createdAt: string;
}
export interface DevisLineResponse {
  id: string; productId: string; productReference: string; productName: string;
  quantity: number; unitPrice: number; tvaRate: number; discountPct: number;
  totalHt: number; totalTva: number; totalTtc: number;
}
export interface DevisSummary {
  id: string; clientId: string; reference: string; status: string;
  validUntil: string; totalTtc: number; createdAt: string;
}
export interface DevisResponse extends DevisSummary { notes: string; totalHt: number; totalTva: number; lines: DevisLineResponse[]; }

export interface CommandeResponse {
  id: string; devisId: string; reference: string; status: string;
  expectedDeliveryDate: string; notes: string; createdAt: string;
}
export interface LivraisonSummary {
  id: string; commandeId: string; reference: string; status: string;
  deliveryDate: string; createdAt: string;
}
export interface LivraisonLineResponse {
  id: string; productId: string; productReference: string;
  quantityOrdered: number; quantityDelivered: number;
}
export interface LivraisonResponse extends LivraisonSummary { lines: LivraisonLineResponse[]; }
export interface FactureSummary {
  id: string; clientId: string; reference: string; status: string;
  dueDate: string; totalTtc: number; amountPaid: number; createdAt: string;
}
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; }

const BASE = '/api/v1/sales';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);

  // Products
  getProducts(page = 0, size = 20): Observable<Page<ProductResponse>> {
    return this.http.get<Page<ProductResponse>>(`${BASE}/products`, { params: { page, size } });
  }
  getActiveProducts(): Observable<ProductResponse[]> {
    return this.http.get<ProductResponse[]>(`${BASE}/products/active`);
  }
  createProduct(dto: object): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${BASE}/products`, dto);
  }
  updateProduct(id: string, dto: object): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${BASE}/products/${id}`, dto);
  }
  deactivateProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/products/${id}`);
  }

  // Devis
  getDevis(page = 0, size = 20): Observable<Page<DevisSummary>> {
    return this.http.get<Page<DevisSummary>>(`${BASE}/devis`, { params: { page, size } });
  }
  getDevisById(id: string): Observable<DevisResponse> {
    return this.http.get<DevisResponse>(`${BASE}/devis/${id}`);
  }
  createDevis(payload: object): Observable<DevisResponse> {
    return this.http.post<DevisResponse>(`${BASE}/devis`, payload);
  }
  transitionDevis(id: string, targetStatus: string): Observable<DevisResponse> {
    return this.http.patch<DevisResponse>(`${BASE}/devis/${id}/status`, { targetStatus });
  }

  // Commandes
  getCommandes(page = 0, size = 20): Observable<Page<CommandeResponse>> {
    return this.http.get<Page<CommandeResponse>>(`${BASE}/commandes`, { params: { page, size } });
  }
  transitionCommande(id: string, targetStatus: string): Observable<CommandeResponse> {
    return this.http.patch<CommandeResponse>(`${BASE}/commandes/${id}/status`, { targetStatus });
  }

  // Livraisons
  getLivraisons(page = 0, size = 20): Observable<Page<LivraisonSummary>> {
    return this.http.get<Page<LivraisonSummary>>(`${BASE}/livraisons`, { params: { page, size } });
  }
  getLivraisonById(id: string): Observable<LivraisonResponse> {
    return this.http.get<LivraisonResponse>(`${BASE}/livraisons/${id}`);
  }
  /** Step 1: PLANIFIEE → EN_COURS with delivery quantities */
  deliverLivraison(id: string, body: { deliveryDate?: string; lines: { lineId: string; quantityDelivered: number }[] }): Observable<LivraisonResponse> {
    return this.http.patch<LivraisonResponse>(`${BASE}/livraisons/${id}/deliver`, body);
  }
  /** Step 2: EN_COURS → LIVREE — triggers stock SORTIE event */
  confirmLivraison(id: string): Observable<LivraisonResponse> {
    return this.http.post<LivraisonResponse>(`${BASE}/livraisons/${id}/confirm`, {});
  }

  // Factures
  getFactures(page = 0, size = 20): Observable<Page<FactureSummary>> {
    return this.http.get<Page<FactureSummary>>(`${BASE}/factures`, { params: { page, size } });
  }
  encaisserFacture(id: string, amount: number, paymentMethod: string, reference?: string): Observable<FactureSummary> {
    return this.http.post<FactureSummary>(`${BASE}/factures/${id}/encaisser`, { amount, paymentMethod, reference });
  }
}
