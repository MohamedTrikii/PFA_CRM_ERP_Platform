import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FournisseurSummary { id: string; code: string; nom: string; telephone: string; actif: boolean; }
export interface FournisseurResponse extends FournisseurSummary { adresse: string; email: string; ice: string; rc: string; rib: string; delaiPaiementJours: number; createdAt: string; }
export interface FournisseurCreateRequest { code: string; nom: string; adresse?: string; telephone?: string; email?: string; ice?: string; rc?: string; rib?: string; delaiPaiementJours?: number; }
export interface FournisseurUpdateRequest { nom: string; adresse?: string; telephone?: string; email?: string; ice?: string; rc?: string; rib?: string; delaiPaiementJours?: number; actif: boolean; }

export type BonCommandeStatus = 'BROUILLON' | 'ENVOYE' | 'PARTIELLEMENT_RECU' | 'RECU' | 'ANNULE';
export type BonReceptionStatus = 'EN_COURS' | 'CONFIRME' | 'ANNULE';

export interface BonCommandeLigneRequest { productId?: string; designation: string; reference: string; quantite: number; prixUnitaire: number; remisePct?: number; taxPct?: number; position: number; }
export interface BonCommandeCreateRequest { fournisseurId: string; reference: string; dateLivraison: string; notes?: string; lignes: BonCommandeLigneRequest[]; }
export interface BonCommandeLigneResponse { id: string; productId: string; designation: string; reference: string; quantite: number; prixUnitaire: number; remisePct: number; taxPct: number; montantHt: number; montantTtc: number; position: number; }
export interface BonCommandeResponse { id: string; reference: string; status: BonCommandeStatus; fournisseur: FournisseurSummary; dateLivraison: string; totalHt: number; totalTva: number; totalTtc: number; notes: string; createdAt: string; lignes: BonCommandeLigneResponse[]; }
export interface BonCommandeSummary { id: string; reference: string; status: BonCommandeStatus; fournisseurNom: string; dateLivraison: string; totalTtc: number; createdAt: string; }

export interface BonReceptionLigneRequest { bonCommandeLigneId?: string; productId: string; designation: string; quantiteRecue: number; quantiteCommandee?: number; locationId?: string; position: number; }
export interface BonReceptionCreateRequest { bonCommandeId: string; reference: string; dateReception: string; notes?: string; lignes: BonReceptionLigneRequest[]; }
export interface BonReceptionLigneResponse { id: string; bonCommandeLigneId: string; productId: string; designation: string; quantiteCommandee: number; quantiteRecue: number; locationId: string; position: number; }
export interface BonReceptionResponse { id: string; bonCommandeId: string; reference: string; status: BonReceptionStatus; dateReception: string; notes: string; createdAt: string; lignes: BonReceptionLigneResponse[]; }
export interface BonReceptionSummary { id: string; reference: string; status: BonReceptionStatus; bonCommandeId: string; dateReception: string; createdAt: string; }

export interface AgingBucket { label: string; count: number; amount: number; }
export interface AgingReport { current: AgingBucket; days1_30: AgingBucket; days31_60: AgingBucket; days61_90: AgingBucket; over90: AgingBucket; totalOutstanding: number; }

export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; }

const BASE = '/api/v1/achats';
const SALES = '/api/v1/sales';

@Injectable({ providedIn: 'root' })
export class AchatService {
  private http = inject(HttpClient);

  // ── Fournisseurs ──────────────────────────────────────────────────────────

  getFournisseurs(page = 0, size = 20): Observable<Page<FournisseurResponse>> {
    return this.http.get<Page<FournisseurResponse>>(`${BASE}/fournisseurs`, { params: { page, size } });
  }

  getFournisseursActifs(page = 0, size = 100): Observable<Page<FournisseurResponse>> {
    return this.http.get<Page<FournisseurResponse>>(`${BASE}/fournisseurs/active`, { params: { page, size } });
  }

  getFournisseur(id: string): Observable<FournisseurResponse> {
    return this.http.get<FournisseurResponse>(`${BASE}/fournisseurs/${id}`);
  }

  createFournisseur(req: FournisseurCreateRequest): Observable<FournisseurResponse> {
    return this.http.post<FournisseurResponse>(`${BASE}/fournisseurs`, req);
  }

  updateFournisseur(id: string, req: FournisseurUpdateRequest): Observable<FournisseurResponse> {
    return this.http.put<FournisseurResponse>(`${BASE}/fournisseurs/${id}`, req);
  }

  // ── Bons de commande ──────────────────────────────────────────────────────

  getBonsCommande(page = 0, size = 20, status?: BonCommandeStatus): Observable<Page<BonCommandeSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return this.http.get<Page<BonCommandeSummary>>(`${BASE}/bons-commande`, { params });
  }

  getBonCommande(id: string): Observable<BonCommandeResponse> {
    return this.http.get<BonCommandeResponse>(`${BASE}/bons-commande/${id}`);
  }

  createBonCommande(req: BonCommandeCreateRequest): Observable<BonCommandeResponse> {
    return this.http.post<BonCommandeResponse>(`${BASE}/bons-commande`, req);
  }

  transitionBonCommande(id: string, targetStatus: BonCommandeStatus): Observable<BonCommandeResponse> {
    return this.http.patch<BonCommandeResponse>(`${BASE}/bons-commande/${id}/transition`, { targetStatus });
  }

  // ── Bons de réception ─────────────────────────────────────────────────────

  getBonsReception(page = 0, size = 20): Observable<Page<BonReceptionSummary>> {
    return this.http.get<Page<BonReceptionSummary>>(`${BASE}/bons-reception`, { params: { page, size } });
  }

  getBonReception(id: string): Observable<BonReceptionResponse> {
    return this.http.get<BonReceptionResponse>(`${BASE}/bons-reception/${id}`);
  }

  getBonsReceptionByBonCommande(bcId: string): Observable<BonReceptionSummary[]> {
    return this.http.get<BonReceptionSummary[]>(`${BASE}/bons-reception/by-bon-commande/${bcId}`);
  }

  createBonReception(req: BonReceptionCreateRequest): Observable<BonReceptionResponse> {
    return this.http.post<BonReceptionResponse>(`${BASE}/bons-reception`, req);
  }

  confirmBonReception(id: string): Observable<BonReceptionResponse> {
    return this.http.patch<BonReceptionResponse>(`${BASE}/bons-reception/${id}/confirm`, {});
  }

  cancelBonReception(id: string): Observable<BonReceptionResponse> {
    return this.http.patch<BonReceptionResponse>(`${BASE}/bons-reception/${id}/cancel`, {});
  }

  // ── Aging ─────────────────────────────────────────────────────────────────

  getAgingSummary(): Observable<AgingReport> {
    return this.http.get<AgingReport>(`${SALES}/factures/aging/summary`);
  }
}
