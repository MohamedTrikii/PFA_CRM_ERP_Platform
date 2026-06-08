import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StockItemResponse {
  id: string; productId: string; productReference: string; productName: string;
  locationId: string; quantity: number; reservedQuantity: number; availableQuantity: number; updatedAt: string;
}
export interface StockMovementResponse {
  id: string; productId: string; productReference: string; locationId: string;
  movementType: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
  quantity: number; referenceType: string; referenceId: string; notes: string; occurredAt: string;
}
export interface LocationResponse {
  id: string; code: string; name: string; description: string; active: boolean;
}
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; }

const BASE = '/api/v1/inventory';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);

  getItems(page = 0, size = 20): Observable<Page<StockItemResponse>> {
    return this.http.get<Page<StockItemResponse>>(`${BASE}/items`, { params: { page, size } });
  }
  getLowStock(threshold = 5): Observable<StockItemResponse[]> {
    return this.http.get<StockItemResponse[]>(`${BASE}/items/low-stock`, { params: { threshold } });
  }
  getMovements(page = 0, size = 50): Observable<Page<StockMovementResponse>> {
    return this.http.get<Page<StockMovementResponse>>(`${BASE}/movements`, { params: { page, size } });
  }
  getMovementsByProduct(productId: string): Observable<StockMovementResponse[]> {
    return this.http.get<StockMovementResponse[]>(`${BASE}/movements/by-product/${productId}`);
  }
  getLocations(): Observable<LocationResponse[]> {
    return this.http.get<LocationResponse[]>(`${BASE}/locations`);
  }
  createLocation(dto: object): Observable<LocationResponse> {
    return this.http.post<LocationResponse>(`${BASE}/locations`, dto);
  }
  adjustStock(dto: object): Observable<StockMovementResponse> {
    return this.http.post<StockMovementResponse>(`${BASE}/movements/adjust`, dto);
  }
}
