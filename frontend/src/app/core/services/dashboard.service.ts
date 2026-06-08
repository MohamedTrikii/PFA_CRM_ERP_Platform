import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FunnelStep  { stage: string; count: number; }

export interface EmployerSummary {
  openDevisCount: number;
  pendingRequestsCount: number;
  pendingLivraisonsCount: number;
  revenueMtd: number;
  revenueYtd: number;
  overdueFacturesCount: number;
  salesFunnel: FunnelStep[];
}

export interface EmployeeSummary {
  livraisonsEnPreparation: number;
  livraisonsPretes: number;
  requestsNouveaux: number;
  openCommandes: number;
}

export interface ClientSummary {
  totalDevis: number;
  acceptedDevis: number;
  pendingRequests: number;
  totalInvoiced: number;
  totalPaid: number;
}

const BASE = '/api/v1/sales/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private http = inject(HttpClient);

  employer(): Observable<EmployerSummary> {
    return this.http.get<EmployerSummary>(`${BASE}/employer`);
  }
  employee(): Observable<EmployeeSummary> {
    return this.http.get<EmployeeSummary>(`${BASE}/employee`);
  }
  client(): Observable<ClientSummary> {
    return this.http.get<ClientSummary>(`${BASE}/client`);
  }
}
