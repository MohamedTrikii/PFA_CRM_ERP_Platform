import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SuggestPriceRequest {
  profile_series?: string;
  width_mm: number;
  height_mm: number;
  glass_type?: string;
  opening_type?: string;
  quantity: number;
}

export interface SuggestPriceResponse {
  surface_m2: number;
  base_price_per_m2: number;
  glass_factor: number;
  opening_surcharge: number;
  unit_price_ht: number;
  total_ht: number;
  confidence: number;
  currency: string;
}

export interface StockItemInput {
  product_id: string;
  product_reference: string;
  current_quantity: number;
  reorder_point?: number;
  daily_consumptions: number[];
}

export interface StockForecastItem {
  product_id: string;
  product_reference: string;
  current_quantity: number;
  avg_daily_consumption: number;
  estimated_days_to_stockout: number | null;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface StockForecastResponse {
  tenant_id: string;
  forecasts: StockForecastItem[];
  critical_count: number;
  high_count: number;
}

export interface ChatRequest {
  message: string;
  context?: string;
  temperature?: number;
}

export interface ChatResponse {
  reply: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface SourceDocument {
  document_id: string;
  title?: string;
  excerpt: string;
  distance: number;
}

export interface AssistantRequest {
  message: string;
  conversation_id?: string;
  use_rag?: boolean;
  top_k?: number;
  model?: string;
  temperature?: number;
}

export interface AssistantResponse {
  conversation_id: string;
  reply: string;
  model: string;
  sources?: SourceDocument[];
}

export interface ModelStatusResponse {
  ollama_url: string;
  configured_model: string;
  model_available: boolean;
  available_models: string[];
}

const BASE = '/api/v1/ai';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);

  suggestPrice(req: SuggestPriceRequest): Observable<SuggestPriceResponse> {
    return this.http.post<SuggestPriceResponse>(`${BASE}/suggest-price`, req);
  }

  stockForecast(tenantId: string, items: StockItemInput[]): Observable<StockForecastResponse> {
    return this.http.post<StockForecastResponse>(`${BASE}/stock-forecast`, { tenant_id: tenantId, items });
  }

  chat(req: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${BASE}/chat`, req);
  }

  assistant(req: AssistantRequest): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(`${BASE}/assistant`, req);
  }

  modelStatus(): Observable<ModelStatusResponse> {
    return this.http.get<ModelStatusResponse>(`${BASE}/model-status`);
  }
}
