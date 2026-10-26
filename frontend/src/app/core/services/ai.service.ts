import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { OidcSecurityService } from 'angular-auth-oidc-client';

// ── Request / Response models ─────────────────────────────────────────────────

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

// ── Dashboard / insights ──────────────────────────────────────────────────────

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  count: number;
}

export interface StockRiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface QuoteConversion {
  month: string;
  total: number;
  accepted: number;
  rate: number;
}

export interface RevenueForecastPoint {
  date: string;
  predicted_amount: number;
}

export interface DashboardInsightsResponse {
  tenant_id: string;
  monthly_revenue: MonthlyRevenue[];
  revenue_forecast: RevenueForecastPoint[];
  stock_risk: StockRiskDistribution;
  quote_conversion: QuoteConversion[];
  docs_indexed: number;
  upcoming_due_invoices?: {
    reference: string;
    client_name?: string;
    montant: number;
    due_date?: string;
    days_to_due?: number | null;
  }[];
  quote_acceptance_rate?: number;
  payment_risk_level?: 'faible' | 'modéré' | 'élevé';
}

// ── Forecast ──────────────────────────────────────────────────────────────────

export interface SalesForecastRequest {
  tenant_id?: string;
  horizon_days?: number;
}

export interface SalesForecastPoint {
  date: string;
  predicted_amount: number;
}

export interface SalesForecastResponse {
  tenant_id: string;
  predictions: SalesForecastPoint[];
}

export interface CashflowForecastRequest {
  tenant_id?: string;
  horizon_days?: number;
}

export interface CashflowPoint {
  date: string;
  net_cashflow: number;
}

export interface CashflowForecastResponse {
  tenant_id: string;
  predictions: CashflowPoint[];
}

// ── Classification ────────────────────────────────────────────────────────────

export interface ClassificationRequest {
  tenant_id?: string;
  devis_id?: string;
  facture_id?: string;
}

export interface ClassificationResponse {
  tenant_id: string;
  probability: number;
  label: string;
  confidence: string;
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

export interface AnomalyRequest {
  tenant_id?: string;
}

export interface AnomalyItem {
  product_id: string;
  product_reference: string;
  anomaly_score: number;
  is_anomaly: boolean;
  reason?: string;
}

export interface AnomalyResponse {
  tenant_id: string;
  anomalies: AnomalyItem[];
}

// ── Purchase recommendations ──────────────────────────────────────────────────

export interface RecommendationRequest {
  tenant_id?: string;
}

export interface RecommendationItem {
  product_id: string;
  suggested_qty: number;
  reason: string;
}

export interface RecommendationResponse {
  tenant_id: string;
  recommendations: RecommendationItem[];
}

// ── Training ──────────────────────────────────────────────────────────────────

export interface TrainingTaskResponse {
  task_id: string;
  tenant_id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  started_at: string;
  finished_at?: string;
  error?: string;
  result?: unknown;
}

export interface ModelRegistryItem {
  id: string;
  tenant_id: string;
  name: string;
  version?: string;
  artifact_path?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ── Streaming assistant ───────────────────────────────────────────────────────

export type StreamEventType = 'chunk' | 'sources' | 'conversation_id' | 'done' | 'error';

export interface StreamAssistantEvent {
  type: StreamEventType;
  /** Text token (type=chunk), JSON sources array (type=sources), UUID (type=conversation_id), or error message */
  data: string;
}

// ── Conversations ─────────────────────────────────────────────────────────────

export interface ConversationSummary {
  conversation_id: string;
  created_at: string;
  preview: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

const BASE    = '/api/v1/ai';
const BASE_AI = '/api/ai';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  // Demo mode: when true, service returns generated fake responses for the UI.
  // Toggle at runtime with `setDemoMode()`; default enabled for local demo.
  private demoMode = true;

  private readonly demoAssistantResponses = [
    {
      patterns: ['stock critique', 'rupture de stock', 'état de stock', 'niveau de stock', 'stock des profils', 'stock critique'],
      reply: 'Sur les 28 références suivies, 2 articles sont en rupture, 3 articles sont en stock critique, et 7 autres articles approchent du seuil d’alerte. Les profils T60 et les châssis aluminium doivent être réapprovisionnés en priorité.',
      sources: [
        { document_id: 'stock-1', title: 'Suivi des stocks critiques', excerpt: 'Profils T60 et châssis aluminium en stocks faibles.', distance: 0.07 },
      ],
    },
    {
      patterns: ['top client', 'meilleurs clients', 'clients les plus', 'clients actifs', 'clients importants', "chiffre d'affaires"],
      reply: 'Les trois clients les plus performants sur les 30 derniers jours sont Aluminium Pro SARL, Menuiserie Dubois et Atelier Fenêtre. Aluminium Pro SARL représente 34 % du chiffre d’affaires total et 18 % du volume de commandes.',
      sources: [
        { document_id: 'client-1', title: 'Performance clients', excerpt: 'Aluminium Pro SARL est le client le plus important ce trimestre.', distance: 0.1 },
      ],
    },
    {
      patterns: ['produit le plus vendu', 'article le plus vendu', 'meilleur produit', 'best-seller', 'produits les plus vendus'],
      reply: 'Le meilleur produit vendu est la fenêtre coulissante aluminium 1600×2100 avec vitrage isolant. Il est suivi par le volet roulant aluminium 1200×1400 et le châssis fixe T60.',
      sources: [
        { document_id: 'product-1', title: 'Tendance des ventes', excerpt: 'Fenêtre coulissante aluminium 1600×2100 en tête des ventes.', distance: 0.12 },
      ],
    },
    {
      patterns: ['devis en attente', 'devis en cours', 'devis non signés'],
      reply: 'Il y a 7 devis en attente de validation, dont 4 émis la semaine dernière. Les projets les plus urgents concernent des fenêtres sur-mesure et des fermetures de terrasse.',
      sources: [
        { document_id: 'devis-1', title: 'Synthèse des devis', excerpt: '7 devis en attente, 4 dossiers récents.', distance: 0.11 },
      ],
    },
    {
      patterns: ['factures impayées', 'facture impayée', 'montant total', 'relance'],
      reply: 'Le total des factures impayées s’élève à 42 300 €, avec 2 factures en retard de plus de 30 jours et plusieurs clients à relancer en priorité.',
      sources: [
        { document_id: 'invoices-1', title: 'Relance factures', excerpt: '42 300 € de factures impayées, 2 en retard de plus de 30 jours.', distance: 0.13 },
      ],
    },
  ];

  setDemoMode(enabled: boolean) { this.demoMode = enabled; }

  private _getDemoAssistantAnswer(message: string): { reply: string; sources?: SourceDocument[] } {
    const normalized = (message || '').toLowerCase();
    const matched = this.demoAssistantResponses.find(item => item.patterns.some(pattern => normalized.includes(pattern)));
    if (matched) {
      return { reply: matched.reply, sources: matched.sources };
    }
    return {
      reply: 'Voici une synthèse des données disponibles pour votre demande : ' + message,
      sources: [
        { document_id: 'general-1', title: 'Données ERP', excerpt: 'Synthèse des ventes, des stocks et des devis basés sur les données employeur.', distance: 0.15 },
      ],
    };
  }

  // ── Legacy / price ──────────────────────────────────────────────────────────

  suggestPrice(req: SuggestPriceRequest): Observable<SuggestPriceResponse> {
    return this.http.post<SuggestPriceResponse>(`${BASE}/suggest-price`, req);
  }

  stockForecast(tenantId: string, items: StockItemInput[]): Observable<StockForecastResponse> {
    if (this.demoMode) {
      const forecasts: StockForecastItem[] = (items || []).map((i, idx) => {
        const avgDaily = i.daily_consumptions?.slice(-7).reduce((a,b)=>a+b,0) / Math.max(1, (i.daily_consumptions?.slice(-7).length||0)) || 1;
        let risk_score = 0.15 as number;
        let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (idx % 5 === 0) {
          risk_score = 0.82;
          risk_level = 'CRITICAL';
        } else if (idx % 3 === 0) {
          risk_score = 0.5;
          risk_level = 'HIGH';
        }
        return {
          product_id: i.product_id,
          product_reference: i.product_reference,
          current_quantity: i.current_quantity,
          avg_daily_consumption: avgDaily,
          estimated_days_to_stockout: Math.max(0, Math.floor(i.current_quantity / avgDaily)),
          risk_score,
          risk_level,
        };
      });
      const sample: StockForecastResponse = { tenant_id: tenantId ?? 'demo-tenant', forecasts, critical_count: forecasts.filter(f=>f.risk_level==='CRITICAL').length, high_count: forecasts.filter(f=>f.risk_level==='HIGH').length };
      return of(sample).pipe(delay(250));
    }
    return this.http.post<StockForecastResponse>(`${BASE_AI}/forecast/stock`, { tenant_id: tenantId, items });
  }

  chat(req: ChatRequest): Observable<ChatResponse> {
    if (this.demoMode) {
      const answer = this._getDemoAssistantAnswer(req.message);
      const sample: ChatResponse = {
        reply: answer.reply,
        model: 'mistral-7b',
        prompt_tokens: 18,
        completion_tokens: 42,
      };
      return of(sample).pipe(delay(300));
    }
    return this.http.post<ChatResponse>(`${BASE}/chat`, req);
  }

  assistant(req: AssistantRequest): Observable<AssistantResponse> {
    if (this.demoMode) {
      const answer = this._getDemoAssistantAnswer(req.message);
      const sample: AssistantResponse = {
        conversation_id: req.conversation_id ?? 'conv-1',
        reply: answer.reply,
        model: req.model ?? 'mistral-7b',
        sources: answer.sources,
      };
      return of(sample).pipe(delay(350));
    }
    return this.http.post<AssistantResponse>(`${BASE}/assistant`, req);
  }

  modelStatus(): Observable<ModelStatusResponse> {
    return this.http.get<ModelStatusResponse>(`${BASE}/model-status`);
  }

  dashboardInsights(): Observable<DashboardInsightsResponse> {
    if (this.demoMode) {
      const sample: DashboardInsightsResponse = {
        tenant_id: 'demo-tenant',
        monthly_revenue: [
          { month: '2026-01', revenue: 45200, count: 12 },
          { month: '2026-02', revenue: 38400, count: 9 },
          { month: '2026-03', revenue: 49800, count: 15 },
        ],
        revenue_forecast: [
          { date: '2026-06-01', predicted_amount: 5200 },
          { date: '2026-06-02', predicted_amount: 5300 },
          { date: '2026-06-03', predicted_amount: 5400 },
          { date: '2026-06-04', predicted_amount: 5600 },
        ],
        stock_risk: { critical: 2, high: 3, medium: 5, low: 40 },
        quote_conversion: [
          { month: '2026-05', total: 18, accepted: 11, rate: 0.61 },
          { month: '2026-06', total: 12, accepted: 7, rate: 0.58 },
        ],
        docs_indexed: 24,
        upcoming_due_invoices: [
          { reference: 'FAC-2026-001', client_name: 'Aluminium Pro SARL', montant: 12400, due_date: '2026-06-10', days_to_due: 3 },
        ],
        quote_acceptance_rate: 0.6,
        payment_risk_level: 'modéré',
      };
      return of(sample).pipe(delay(250));
    }
    return this.http.get<DashboardInsightsResponse>(`${BASE}/dashboard-insights`);
  }

  indexAll(): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(`${BASE_AI}/index/all`, {});
  }

  // ── Streaming SSE ───────────────────────────────────────────────────────────

  /**
   * Opens an SSE connection to /api/v1/ai/chat/stream and emits each text token.
   * Uses native fetch() with the OIDC bearer token so HttpClient interceptors are bypassed
   * (EventSource does not support custom headers).
   */
  streamAssistant(req: ChatRequest): Observable<string> {
    return new Observable<string>(subscriber => {
      let aborted = false;
      const controller = new AbortController();

      this.oidc.getAccessToken().subscribe({
        next: async token => {
          try {
            const response = await fetch(`${BASE}/chat/stream`, {
              method: 'POST',
              cache: 'no-store',
              headers: {
                Accept: 'text/event-stream',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(req),
              signal: controller.signal,
            });

            if (!response.ok) {
              const bodyText = await response.text().catch(() => '');
              const errorText = bodyText ? `HTTP ${response.status}: ${bodyText}` : `HTTP ${response.status}`;
              subscriber.error(new Error(errorText));
              return;
            }
            if (!response.body) {
              subscriber.error(new Error('Streaming unsupported by browser or proxy.'));
              return;
            }

            await this._readSseStream(response.body, aborted, chunk => subscriber.next(chunk));
            subscriber.complete();
          } catch (err) {
            if (!aborted) subscriber.error(err);
          }
        },
        error: err => subscriber.error(err),
      });

      return () => { aborted = true; controller.abort(); };
    });
  }

  /**
   * Full-featured streaming assistant: RAG + conversation history + role-based system prompt.
   * Emits typed StreamAssistantEvent objects so the component can handle chunks, sources,
   * conversation_id, and done/error events separately.
   */
  streamAssistantRag(req: AssistantRequest): Observable<StreamAssistantEvent> {
    if (this.demoMode) {
      return new Observable<StreamAssistantEvent>(subscriber => {
        const cid = req.conversation_id ?? 'conv-1';
        const answer = this._getDemoAssistantAnswer(req.message);
        subscriber.next({ type: 'conversation_id', data: cid });

        const tokens = answer.reply.match(/[^.!?]+[.!?]*/g) ?? [answer.reply];
        const timers: any[] = [];
        tokens.forEach((token, index) => {
          timers.push(setTimeout(() => subscriber.next({ type: 'chunk', data: token.trim() }), 220 * (index + 1)));
        });

        if (answer.sources?.length) {
          timers.push(setTimeout(() => subscriber.next({ type: 'sources', data: JSON.stringify(answer.sources) }), 220 * (tokens.length + 1)));
        }

        timers.push(setTimeout(() => { subscriber.next({ type: 'done', data: 'true' }); subscriber.complete(); }, 220 * (tokens.length + 2)));
        return () => timers.forEach(t => clearTimeout(t));
      });
    }

    return new Observable<StreamAssistantEvent>(subscriber => {
      let aborted = false;
      const controller = new AbortController();

      this.oidc.getAccessToken().subscribe({
        next: async token => {
          try {
            console.debug('[ai.service] Opening SSE stream', `${BASE}/assistant/stream`, { token: token ? 'yes' : 'no' });
            const response = await fetch(`${BASE}/assistant/stream`, {
              method: 'POST',
              cache: 'no-store',
              headers: {
                Accept: 'text/event-stream',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(req),
              signal: controller.signal,
            });

            console.debug('[ai.service] SSE response status', response.status, response.statusText, response.headers.get('content-type'));
            if (!response.ok) {
              const bodyText = await response.text().catch(() => '');
              const errorText = bodyText ? `HTTP ${response.status}: ${bodyText}` : `HTTP ${response.status}`;
              subscriber.error(new Error(errorText));
              return;
            }
            if (!response.body) {
              subscriber.error(new Error('Streaming unsupported by browser or proxy.'));
              return;
            }

            await this._readAssistantStream(response.body, aborted, ev => subscriber.next(ev));
            subscriber.complete();
          } catch (err) {
            if (!aborted) subscriber.error(err);
          }
        },
        error: err => subscriber.error(err),
      });

      return () => { aborted = true; controller.abort(); };
    });
  }

  private async _readAssistantStream(
    body: ReadableStream<Uint8Array>,
    aborted: boolean,
    emit: (ev: StreamAssistantEvent) => void,
  ): Promise<void> {
    const reader  = body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';
    let   lastEventType = 'data';

    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lastEventType = this._processLines(lines, lastEventType, emit);
    }
  }

  private _processLines(
    lines: string[],
    currentEventType: string,
    emit: (ev: StreamAssistantEvent) => void,
  ): string {
    let eventType = currentEventType;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('event:')) { eventType = trimmed.slice(6).trim(); continue; }
      if (!trimmed.startsWith('data:')) continue;
      const raw = trimmed.slice(5).trim();
      if (raw) { this._dispatchAssistantEvent(eventType, raw, emit); eventType = 'data'; }
    }
    return eventType;
  }

  private _dispatchAssistantEvent(
    eventType: string,
    raw: string,
    emit: (ev: StreamAssistantEvent) => void,
  ): void {
    if (eventType === 'conversation_id') {
      emit({ type: 'conversation_id', data: this._tryParseString(raw) });
      return;
    }
    if (eventType === 'sources') {
      emit({ type: 'sources', data: raw });
      return;
    }
    if (eventType === 'done') {
      emit({ type: 'done', data: 'true' });
      return;
    }
    if (eventType === 'error') {
      emit({ type: 'error', data: this._tryParseString(raw) });
      return;
    }
    // Default: chunk token
    if (raw === 'true' || raw === '[DONE]') return;
    const token = this._tryParseString(raw);
    if (token) emit({ type: 'chunk', data: token });
  }

  private _tryParseString(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      return raw;
    } catch {
      return raw;
    }
  }

  private async _readSseStream(
    body: ReadableStream<Uint8Array>,
    aborted: boolean,
    emit: (chunk: string) => void,
  ): Promise<void> {
    const reader  = body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        this._parseSseLine(line, emit);
      }
    }
  }

  private _parseSseLine(line: string, emit: (chunk: string) => void): void {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('event:')) return;
    if (!trimmed.startsWith('data:')) return;

    const data = trimmed.slice(5).trim();
    if (!data || data === 'true' || data === '[DONE]') return;

    try {
      const parsed = JSON.parse(data);
      const token  = parsed?.message?.content ?? parsed?.content ?? parsed;
      if (typeof token === 'string' && token) emit(token);
    } catch {
      emit(data);
    }
  }

  // ── Forecast ────────────────────────────────────────────────────────────────

  forecastSales(req: SalesForecastRequest = {}): Observable<SalesForecastResponse> {
    return this.http.post<SalesForecastResponse>(`${BASE_AI}/forecast/sales`, req);
  }

  forecastCashflow(req: CashflowForecastRequest = {}): Observable<CashflowForecastResponse> {
    return this.http.post<CashflowForecastResponse>(`${BASE_AI}/forecast/cashflow`, req);
  }

  // ── Classification ──────────────────────────────────────────────────────────

  classifyQuote(req: ClassificationRequest): Observable<ClassificationResponse> {
    return this.http.post<ClassificationResponse>(`${BASE_AI}/classification/quote-success`, req);
  }

  classifyPaymentRisk(req: ClassificationRequest): Observable<ClassificationResponse> {
    return this.http.post<ClassificationResponse>(`${BASE_AI}/classification/payment-risk`, req);
  }

  // ── Anomaly detection ───────────────────────────────────────────────────────

  detectAnomalies(req: AnomalyRequest = {}): Observable<AnomalyResponse> {
    if (this.demoMode) {
      const sample: AnomalyResponse = {
        tenant_id: req.tenant_id ?? 'demo-tenant',
        anomalies: [
          { product_id: 'prod-042', product_reference: 'Profil T60 - 60mm', anomaly_score: 0.92, is_anomaly: true, reason: 'Consommation inhabituelle détectée sur les dernières 24h.' },
          { product_id: 'prod-103', product_reference: 'Fermeture de terrasse 1200×2100', anomaly_score: 0.84, is_anomaly: true, reason: 'Écart de stock positif par rapport aux mouvements attendus.' },
        ],
      };
      return of(sample).pipe(delay(280));
    }
    return this.http.post<AnomalyResponse>(`${BASE}/anomalies`, req);
  }

  // ── Purchase recommendations ────────────────────────────────────────────────

  recommendPurchase(req: RecommendationRequest = {}): Observable<RecommendationResponse> {
    if (this.demoMode) {
      const sample: RecommendationResponse = {
        tenant_id: req.tenant_id ?? 'demo-tenant',
        recommendations: [
          { product_id: 'prod-021', suggested_qty: 18, reason: 'Stock bas et forte demande sur les portes coulissantes aluminium.' },
          { product_id: 'prod-055', suggested_qty: 12, reason: 'Réapprovisionnement recommandé pour les châssis fixes T60.' },
        ],
      };
      return of(sample).pipe(delay(240));
    }
    return this.http.post<RecommendationResponse>(`${BASE}/recommendations/purchase`, req);
  }

  // ── Training ────────────────────────────────────────────────

  trainAll(tenantId?: string): Observable<TrainingTaskResponse[]> {
    return this.http.post<TrainingTaskResponse[]>(`${BASE}/train/all`, tenantId ? { tenant_id: tenantId } : {});
  }

  trainingStatus(taskId: string): Observable<TrainingTaskResponse> {
    return this.http.get<TrainingTaskResponse>(`${BASE}/train/status/${taskId}`);
  }

  listModels(): Observable<ModelRegistryItem[]> {
    if (this.demoMode) {
      const sample: ModelRegistryItem[] = [
        { id: 'm1', tenant_id: 'demo-tenant', name: 'stock-risk-forest', version: '1.0', created_at: new Date().toISOString() },
        { id: 'm2', tenant_id: 'demo-tenant', name: 'quote-acceptance-xgb', version: '1.1', created_at: new Date().toISOString() },
        { id: 'm3', tenant_id: 'demo-tenant', name: 'payment-risk-xgb', version: '1.1', created_at: new Date().toISOString() },
      ];
      return of(sample).pipe(delay(220));
    }
    return this.http.get<ModelRegistryItem[]>(`${BASE}/models`);
  }

  listTrainingTasks(): Observable<TrainingTaskResponse[]> {
    if (this.demoMode) {
      const now = new Date();
      const sample: TrainingTaskResponse[] = [
        { task_id: 't1', tenant_id: 'demo-tenant', name: 'Prévision des ventes', status: 'done', started_at: new Date(now.getTime() - 7200000).toISOString(), finished_at: new Date(now.getTime() - 3600000).toISOString() },
        { task_id: 't2', tenant_id: 'demo-tenant', name: 'Acceptation devis', status: 'pending', started_at: new Date(now.getTime() - 3600000).toISOString() },
        { task_id: 't3', tenant_id: 'demo-tenant', name: 'Risque paiement', status: 'pending', started_at: new Date(now.getTime() - 1800000).toISOString() },
        { task_id: 't4', tenant_id: 'demo-tenant', name: 'Anomalies stock', status: 'running', started_at: new Date(now.getTime() - 1200000).toISOString() },
      ];
      return of(sample).pipe(delay(260));
    }
    return this.http.get<TrainingTaskResponse[]>(`${BASE}/train/tasks`);
  }

  // ── Conversations ───────────────────────────────────────────────────────────

  listConversations(): Observable<ConversationSummary[]> {
    if (this.demoMode) {
      const sample: ConversationSummary[] = [
        { conversation_id: 'demo-conv-1', created_at: new Date().toISOString(), preview: 'Demonstration conversation about pricing and stock.' },
        { conversation_id: 'demo-conv-2', created_at: new Date().toISOString(), preview: 'Chat: how to reduce stock-outs for T60 profiles.' },
      ];
      return of(sample).pipe(delay(200));
    }
    return this.http.get<ConversationSummary[]>(`${BASE}/conversations`);
  }
}
