# AI Platform Integration – Architecture Design

**Date:** 2026-06-07  
**Phase:** 2 – Architecture & Design  
**Status:** 🏗️ IN PROGRESS – Design Phase  
**Based on:** [AI_EXISTING_SYSTEM_AUDIT.md](AI_EXISTING_SYSTEM_AUDIT.md)

---

## EXECUTIVE SUMMARY

This document defines the **Multi-Tenant AI Architecture** for the ERP/CRM platform. It reuses all existing components (ai-service, Ollama, pgvector, RLS) and extends them to deliver:

1. **AI Chat Assistant** (conversational ERP Q&A)
2. **Predictive Analytics Dashboard** (forecasting, classification, anomalies)
3. **RAG-Powered Document Engine** (devis, factures, SAV)
4. **ML Training Pipeline** (Prophet, XGBoost, Scikit-Learn)

### Architecture Stack (No New Tech)

```
┌─────────────────────────────────────────┐
│  Frontend (Angular 17 + Flutter)        │  ← Chat UI, Dashboard tiles
├─────────────────────────────────────────┤
│  Spring Cloud Gateway (JWT + Valkey)    │  ← Auth, routing, caching
├─────────────────────────────────────────┤
│  Spring Boot Services (8 modules)       │  ← CRM, Sales, Inventory
├─────────────────────────────────────────┤
│  FastAPI ai-service (Python)            │  ← AI orchestration, RAG, forecasts
├─────────────────────────────────────────┤
│  PostgreSQL 16 + pgvector + RLS         │  ← Data, embeddings, conversations
├─────────────────────────────────────────┤
│  Ollama + Mistral 7B (local LLM)        │  ← Chat engine
├─────────────────────────────────────────┤
│  RabbitMQ (event bus)                   │  ← Async tasks (indexing, training)
├─────────────────────────────────────────┤
│  SeaweedFS (model artifacts storage)    │  ← Trained model persistence
├─────────────────────────────────────────┤
│  Prometheus + Grafana + Loki            │  ← Observability
└─────────────────────────────────────────┘
```

**No new infrastructure required.** All components already deployed.

---

## 1. ARCHITECTURE LAYERS

### Layer 1: Presentation (Angular + Flutter)

**Responsibilities:**
- User interaction (chat UI, dashboard, forecasts)
- State management (NgRx, Riverpod)
- Real-time updates (SSE for streaming chat)

**Components to create (Phase 5 onwards):**
- `AiAssistantComponent` — ChatGPT-like interface
- `AiDashboardComponent` — forecast charts, KPIs
- `ConversationHistoryComponent` — chat history panel
- `RAGSourcesCitationsComponent` — show document references

**API Integration:**
- `POST /api/v1/ai/chat` (streaming)
- `GET /api/v1/ai/conversations` (history)
- `POST /api/v1/ai/conversations/{id}/clear`
- `GET /api/v1/ai/forecast/{type}` (sales, revenue, stock, cashflow)
- `GET /api/v1/ai/classification/{type}` (quote-success, payment-risk)
- `GET /api/v1/ai/recommendations/{type}` (purchase, stock)
- `GET /api/v1/ai/anomalies` (order, payment, stock)

---

### Layer 2: Gateway & Routing (Spring Cloud Gateway)

**Responsibilities:**
- JWT authentication (Keycloak)
- Tenant resolution (X-Tenant-Id header)
- Request routing to microservices
- Session caching (Valkey)
- Rate limiting (circuit breaker)

**Existing routes:**
- `/api/v1/identity/**` → identity-service:8082
- `/api/v1/crm/**` → crm-service:8083
- `/api/v1/sales/**` → sales-service:8084
- `/api/v1/inventory/**` → inventory-service:8085
- `/api/v1/achat/**` → achat-service:8086
- `/api/v1/cms/**` → cms-service:8087
- `/api/v1/ai/**` → ai-service:8000 ✅ (already routed)

**Gateway Configuration:**
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: ai-service
          uri: http://ai-service:8000
          predicates:
            - Path=/api/v1/ai/**
          filters:
            - TokenRelay  # Forwards JWT to ai-service
            - TenantHeaderGatewayFilter  # Adds X-Tenant-Id from JWT
```

**No changes needed.** Already in place.

---

### Layer 3: Microservices

#### 3.1 FastAPI AI Service (Core)

**Location:** `ai-service/` (Python)  
**Port:** 8000  
**Database:** PostgreSQL (async via asyncpg)

**Endpoints to implement:**

**A. Chat (RAG + LLM)**
```
POST /api/v1/ai/chat
Content-Type: application/json
Authorization: Bearer {JWT}

{
  "message": "Combien de devis avons-nous gagnés ce mois?",
  "context": {
    "entity_type": "OPPORTUNITY",  // optional domain context
    "filters": {"month": 6}
  },
  "stream": true  // optional: Server-Sent Events
}

Response (streaming):
data: {"chunk": "Selon les données du système,", "metadata": {...}}
data: {"chunk": " nous avons", "metadata": {...}}
...
data: {"done": true, "conversation_id": "...", "sources": [...]}
```

**Features:**
- Tenant-aware RAG retrieval (pgvector similarity search)
- Multi-turn conversation memory (ai_conversations table)
- Source citations (show retrieved documents)
- Streaming responses (SSE)
- Context injection (CRM, sales, inventory data)

**B. Conversation Management**
```
GET /api/v1/ai/conversations
→ List all conversations (paginated, tenant-scoped)

GET /api/v1/ai/conversations/{id}
→ Retrieve full conversation history with metadata

POST /api/v1/ai/conversations/{id}/clear
→ Delete conversation history (GDPR compliance)
```

**C. Forecasting Endpoints**
```
POST /api/v1/ai/forecast/sales
{
  "periods": 30,  // days ahead
  "granularity": "daily"  // daily|weekly|monthly
}
→ Prophet-based sales forecast

POST /api/v1/ai/forecast/revenue
→ Aggregate devis + factures → cash forecast

POST /api/v1/ai/forecast/cashflow
→ Revenue - Expenses + Payment delays

POST /api/v1/ai/forecast/stock
{
  "product_ids": ["uuid1", "uuid2"],
  "lookahead_days": 90
}
→ EMA-based stock-out risk (existing forecast.py)
```

**D. Classification Endpoints**
```
POST /api/v1/ai/classification/quote-success
{
  "devis_attributes": {
    "profile_series": "T60",
    "quantity": 5,
    "client_type": "PROFESSIONNEL",
    "client_age_days": 365
  }
}
→ XGBoost probability: 0.78 (acceptance likely)

POST /api/v1/ai/classification/payment-risk
{
  "client_id": "uuid",
  "facture_amount": 15000,
  "days_overdue": 30
}
→ Risk score + recommendation (follow-up action)
```

**E. Recommendations Endpoints**
```
POST /api/v1/ai/recommendations/purchase
{
  "location_id": "uuid",
  "min_reorder_point": 20
}
→ [{"product_id": "...", "recommended_qty": 100, "priority": "HIGH"}]

POST /api/v1/ai/recommendations/stock
→ Rebalancing suggestions across locations
```

**F. Anomaly Detection**
```
GET /api/v1/ai/anomalies?type=orders|payments|stock
→ [
    {"entity_type": "COMMANDE", "id": "...", "anomaly_score": 0.92, "reason": "..."},
    ...
  ]
```

**G. RAG Document Management**
```
POST /api/v1/ai/documents/index
{
  "source_type": "DEVIS",
  "force_reindex": false
}
→ Trigger async indexing job (Devis → documents → embeddings)

GET /api/v1/ai/documents/search
{
  "query": "profils aluminum 1200x1800",
  "k": 5
}
→ Vector similarity search (pgvector ivfflat)
```

---

#### 3.2 Spring Boot Services (Existing)

**No changes to existing modules.** They expose APIs consumed by ai-service:

- **identity-service:** User context, role info, audit logging
- **crm-service:** Prospects, Clients, Opportunities (lead scoring features)
- **sales-service:** Devis, Commandes, Factures (forecasting features)
- **inventory-service:** Stock movements (consumption patterns)
- **achat-service:** Suppliers, PO history (procurement optimization)

**Data access pattern:**
- ai-service connects directly to PostgreSQL (asyncpg)
- Queries respect RLS policies (set_config per connection)
- No inter-service HTTP calls for data (bypass gateway for efficiency)

---

### Layer 4: Data Layer

#### 4.1 PostgreSQL Multi-Tenant Schema

**Tenant isolation:**
- `current_tenant_id()` function (reads app.tenant_id setting)
- FORCE ROW LEVEL SECURITY on all tenant-scoped tables
- TenantContext (Java) + connection stamping (ai-service)

**AI-Specific Tables** (already created in migrations):

| Table | Purpose | RLS |
|-------|---------|-----|
| `ai_documents` | RAG text chunks (devis, factures, SAV) | ✅ Yes |
| `ai_embeddings` | Vector embeddings (1536-dim) | ✅ Yes |
| `ai_models` | Trained model metadata + artifacts | ✅ Yes |
| `ai_conversations` | Chat history (user messages + assistant replies) | ✅ Yes |

**Business Tables Used for AI:**

| Module | Tables | AI Purpose |
|--------|--------|-----------|
| CRM | prospects, clients, opportunities | Lead scoring, client segmentation |
| Sales | devis, commandes, factures, encaissements | Sales forecasting, payment risk, quote success |
| Inventory | stock_items, stock_movements | Stock forecasting, anomaly detection |
| Achat | fournisseurs, bons_commande | Supplier lead-time, reorder optimization |

**Indexes for AI Performance:**
```sql
-- Already exist in migrations
CREATE INDEX idx_ai_embeddings_vector ON ai_embeddings USING ivfflat (embedding) WITH (lists = 100);
CREATE INDEX idx_movements_tenant_product ON stock_movements (tenant_id, product_id, created_at DESC);
CREATE INDEX idx_devis_tenant_status ON devis (tenant_id, status);
CREATE INDEX idx_factures_tenant_status ON factures (tenant_id, status);
```

#### 4.2 Vector Database (pgvector)

**Embedding Dimension:** 1536 (OpenAI-compatible)

**Index Configuration:**
```sql
-- ivfflat: Inverted File with Flat Quantization
-- Good for < 5M vectors; tune `lists` parameter based on data volume
CREATE INDEX idx_ai_embeddings_vector 
ON ai_embeddings USING ivfflat (embedding) WITH (lists = 100);
```

**Query Pattern:**
```sql
-- Cosine similarity search (pgvector <=> operator)
SELECT document_id, title, content, (embedding <=> $1::vector) AS distance
FROM ai_embeddings
WHERE tenant_id = current_tenant_id()
ORDER BY distance ASC
LIMIT 5;
```

---

### Layer 5: LLM & Embedding Services

#### 5.1 Ollama (Local LLM)

**Service:** ollama (docker-compose, profile: ai)  
**Port:** 11434  
**Default Model:** Mistral 7B (MIT license)

**Usage:**
```python
# ai-service/app/ollama.py
async def chat(
    user_message: str,
    system_override: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> dict:
    """Call Ollama /api/chat endpoint (OpenAI-compatible)"""
```

**System Prompt (Domain-Specific):**
```
You are an AI assistant embedded in an ERP system for an aluminum joinery company 
(menuiserie aluminium). You help with:
- Drafting professional quotes (devis) and customer communications in French
- Summarizing purchase orders (bons de commande) and reception notes
- Explaining ERP data: invoices, stock levels, CRM prospects
- Answering business questions about the Moroccan aluminum joinery market

Always reply in the same language as the user's message.
Be concise and professional. Never invent prices or quantities.
```

**Model Alternatives (future):**
- Llama 2 70B (better quality, needs GPU)
- Mistral Large (via Mistral API, not local)
- Mixtral 8x7B (MoE variant, better inference)

---

#### 5.2 Embedding Service (To Be Decided)

**Current (POC):** Deterministic hash-based (indexer.py)  
**Required (Production):** Real embeddings

**Options:**

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **Ollama Embed API** | Local, free, consistent | Lower quality than OpenAI | Low (1-2 days) |
| **Sentence Transformers** | Local, good quality, no API | Memory overhead | Medium (2-3 days) |
| **OpenAI API** | Highest quality | Cost, external service | Low (1 day) |
| **Mistral Embed** | Quality, free tier | Rate limits | Low (1 day) |

**Recommended:** Start with **Ollama Embed API** or **Sentence Transformers** (local, free). Add OpenAI as fallback if needed.

---

### Layer 6: Async Task Queue (RabbitMQ)

**Purpose:** Background jobs (model training, batch indexing, report generation)

**Existing Setup:**
- RabbitMQ 3.13 running (docker-compose)
- Vhost: `erp`
- User: `erp` / `erp_secret`

**AI-Specific Queues:**
```
erp.ai.index.devis        → Devis document indexing
erp.ai.index.factures     → Invoice document indexing
erp.ai.train.prophet      → Sales forecast model retraining
erp.ai.train.xgboost      → Classification model retraining
erp.ai.anomaly.detect     → Anomaly detection scan
erp.ai.chat.summarize     → Conversation post-processing
```

**Message Format (standard):**
```json
{
  "task_id": "uuid",
  "task_type": "index_devis",
  "tenant_id": "uuid",
  "payload": {"limit": 100, "force_reindex": false},
  "created_at": "2026-06-07T10:00:00Z"
}
```

---

### Layer 7: ML Training Infrastructure

**Location:** `ai-service/ml/` (Python scripts)

**Framework:** scikit-learn, XGBoost, Prophet

**Artifacts Storage:** SeaweedFS (S3-compatible)

**Model Registry:** `ai_models` table + SeaweedFS

**Training Workflow:**

```
1. Feature Engineering
   ├─ Query PostgreSQL (respect RLS)
   ├─ Aggregate by tenant, time windows
   └─ Create train/test splits

2. Model Training
   ├─ Prophet (time-series) — 1-2 hours
   ├─ XGBoost (classification) — 30 min
   └─ Scikit-learn (anomalies) — 15 min

3. Evaluation
   ├─ Metrics (MAE, AUC, precision)
   ├─ Cross-validation
   └─ Validation on holdout set

4. Storage
   ├─ Serialize model (pickle, joblib)
   ├─ Upload to SeaweedFS
   └─ Register in ai_models table
```

**Schedule:** Nightly (every 24h), triggered by RabbitMQ or Kubernetes CronJob

---

## 2. DATA FLOW DIAGRAMS

### 2.1 Chat Request Flow (RAG + LLM)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Angular Component: User types "Combien de devis gagnés?" │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. HTTP POST /api/v1/ai/chat (with JWT)                     │
│    Body: {message, context, stream: true}                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Spring Cloud Gateway                                     │
│    - Verify JWT (Keycloak)                                  │
│    - Extract tenant_id from claim                           │
│    - Route to ai-service:8000                               │
│    - Forward Bearer token (TokenRelay)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. FastAPI ai-service                                       │
│    - Verify JWT (Keycloak public key)                       │
│    - Extract tenant_id from JWT claim                       │
│    - Set Postgres session: set_config('app.tenant_id', ...) │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RAG Retrieval (PostgreSQL + pgvector)                    │
│    - Embed user query ("Combien de devis...?")              │
│    - Search ai_embeddings (cosine similarity, k=5)          │
│    - RLS policy: tenant_id = current_tenant_id()            │
│    - Return top-k documents with content                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Augment Prompt with Retrieved Context                    │
│    Context: devis data + factures + stock info              │
│    Build: System Prompt + Retrieved Docs + User Question    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Ollama /api/chat (streaming)                             │
│    - Model: Mistral 7B                                      │
│    - Stream response tokens in real-time                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Store Conversation (PostgreSQL)                          │
│    - INSERT ai_conversations (messages JSONB)               │
│    - Include sources, metadata, tenant_id                   │
│    - RLS enforced                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Stream Response Back to Angular (SSE)                    │
│    data: {chunk: "...", metadata: {...}}                    │
│    ...                                                       │
│    data: {done: true, sources: [...]}                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Render in Chat Component                                │
│     - Display assistant message                             │
│     - Show source citations                                 │
│     - Enable follow-up questions                            │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Forecasting Request Flow

```
┌───────────────────────────────┐
│ Frontend: Request 30-day sales │
│ forecast                       │
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ POST /api/v1/ai/forecast/sales │
│ {periods: 30, granularity: "daily"}
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ FastAPI ai-service             │
│ - Check cached model (Valkey)   │
│ - If expired: retrain from RabbitMQ
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ Load Model from ai_models table │
│ or cache (Valkey)              │
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ Feature Generation (SQLAlchemy) │
│ SELECT SUM(total_ttc) FROM     │
│   factures / devis             │
│ WHERE created_at >= NOW() - 90d │
│ GROUP BY DATE_TRUNC('day', ...) │
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ Prophet.predict(periods=30)     │
│ Returns: yhat, yhat_lower,      │
│         yhat_upper              │
└──────────────┬────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ Format Response                 │
│ {                               │
│   "forecast": [                │
│     {date, value, lower, upper},│
│     ...                         │
│   ],                            │
│   "mape": 0.12,                │
│   "updated_at": "..."           │
│ }                               │
└────────────────────────────────┘
```

---

### 2.3 Background Indexing Job (RabbitMQ)

```
┌──────────────────────────────────────┐
│ Admin: POST /api/v1/ai/documents/index│
│ {source_type: "DEVIS"}               │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ FastAPI routes to async job queue    │
│ (RabbitMQ: erp.ai.index.devis)       │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Celery Worker / RabbitMQ Consumer    │
│ - Dequeue index_devis task           │
│ - Set tenant context                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Feature Extraction                   │
│ SELECT id, reference, total_ttc, ... │
│ FROM devis                           │
│ WHERE status IN ('ACCEPTE', 'REFUSE')│
│ ORDER BY created_at DESC LIMIT 100   │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Create ai_documents (text chunks)    │
│ for each devis row                   │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Generate Embeddings                  │
│ - Ollama Embed API or Sentence       │
│   Transformers                       │
│ - Result: vector(1536)               │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Batch Insert ai_embeddings           │
│ (pgvector ivfflat index updated)     │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Log completion in ai_models or job   │
│ metadata table                       │
└──────────────────────────────────────┘
```

---

## 3. IMPLEMENTATION ROADMAP

### Phase 2 (Current) — Architecture & Design ✅
- ✅ Define multi-tenant AI architecture
- ✅ Identify reusable components
- ✅ Plan data flows
- ✅ Specify APIs
- ⏳ **Deliverable:** This document (AI_ARCHITECTURE.md)

### Phase 3 — RAG & Chat Foundation (2 weeks)
**Objective:** Fully functional chat endpoint with RAG + Ollama

**Tasks:**
1. Replace deterministic embeddings with real embedder (Ollama Embed or Sentence Transformers)
2. Implement RAG retrieval endpoint (`/api/v1/ai/documents/search`)
3. Complete chat endpoint with streaming support (SSE)
4. Store conversation history in `ai_conversations` table
5. Add tenant context injection
6. Unit + integration tests (cross-tenant isolation)

**Deliverables:**
- `ai-service/app/embedder.py` — real embedding service
- `ai-service/app/chat.py` — chat logic with RAG retrieval
- Updated `indexer.py` — batch document indexing
- `ai-service/tests/test_chat_rag.py` — unit tests
- Updated `docs/AI_ARCHITECTURE.md` (implementation details)

---

### Phase 4 — Analytics & Forecasting (3 weeks)
**Objective:** Sales, revenue, stock, cashflow forecasting

**Tasks:**
1. Feature engineering: daily sales aggregations
2. Train Prophet model (sales forecast)
3. Implement `/api/v1/ai/forecast/sales` endpoint
4. Add revenue aggregation (devis + factures)
5. Implement `/api/v1/ai/forecast/revenue`
6. Implement `/api/v1/ai/forecast/stock` (use existing forecast.py)
7. Cashflow forecast (revenue - payment delays)
8. Model persistence (ai_models table + SeaweedFS)

**Deliverables:**
- `ai-service/ml/prophet_trainer.py` — training pipeline
- `ai-service/ml/features.py` — feature engineering
- Updated forecast endpoints in `main.py`
- Model artifacts (versioned in SeaweedFS)
- Prometheus metrics for forecast accuracy

---

### Phase 5 — Classification Models (2 weeks)
**Objective:** Quote success & payment risk prediction

**Tasks:**
1. Feature engineering: quote characteristics + client history
2. Train XGBoost for quote acceptance classification
3. Implement `/api/v1/ai/classification/quote-success`
4. Feature engineering: client payment patterns
5. Train XGBoost for payment risk classification
6. Implement `/api/v1/ai/classification/payment-risk`
7. Add recommendations based on predictions

**Deliverables:**
- `ai-service/ml/quote_success_trainer.py`
- `ai-service/ml/payment_risk_trainer.py`
- Classification endpoints
- Explanation feature importance charts

---

### Phase 6 — Anomaly Detection & Recommendations (2 weeks)
**Objective:** Identify outliers and suggest actions

**Tasks:**
1. Implement Isolation Forest for order anomalies
2. Implement DBSCAN for stock pattern clustering
3. Add payment behavior anomalies
4. Implement `/api/v1/ai/anomalies`
5. Generate purchase recommendations based on stock forecast
6. Implement `/api/v1/ai/recommendations/purchase`
7. Implement `/api/v1/ai/recommendations/stock`

**Deliverables:**
- `ai-service/ml/anomaly_detector.py`
- `ai-service/ml/recommendations.py`
- Anomaly detection endpoint
- Recommendations API

---

### Phase 7 — Frontend UI Components (3 weeks)
**Objective:** Chat interface and analytics dashboard

**Tasks:**
1. Create `AiAssistantComponent` (chat UI, message list, input)
2. Add streaming support (SSE consumption in Angular)
3. Implement conversation history panel
4. Create source citations component
5. Build `AiDashboardComponent` (forecast charts)
6. Add forecast visualization (Chart.js / D3.js)
7. Create classification result panels
8. Implement anomaly alerts dashboard
9. Add Flutter mobile AI chat (mirrored on mobile)

**Deliverables:**
- `frontend/src/app/features/ai/components/assistant.component.ts`
- `frontend/src/app/features/ai/components/dashboard.component.ts`
- `frontend/src/app/features/ai/services/ai.service.ts`
- Mobile Flutter equivalents
- E2E tests (Cypress)

---

### Phase 8 — ML Training Pipeline & Orchestration (2 weeks)
**Objective:** Automated retraining, model versioning, monitoring

**Tasks:**
1. Implement RabbitMQ consumer for training jobs
2. Create nightly training scheduler (Kubernetes CronJob or APScheduler)
3. Implement model versioning (ai_models table)
4. Add model artifact storage (SeaweedFS)
5. Create model performance dashboard (Grafana)
6. Implement model drift detection
7. Add MLflow integration (experiment tracking)
8. Create retraining alerts

**Deliverables:**
- `ai-service/ml/scheduler.py` (APScheduler)
- `ai-service/ml/model_registry.py` (ai_models CRUD)
- RabbitMQ consumer worker
- Grafana dashboards for model metrics
- CI/CD pipeline (GitHub Actions / GitLab CI)

---

### Phase 9 — Security Hardening & Optimization (1 week)
**Objective:** Production-ready security, performance tuning

**Tasks:**
1. Remove `DEV_AUTH_BYPASS` bypass (set to false)
2. Add rate limiting to AI endpoints
3. Implement request sanitization
4. Add prompt injection detection
5. Tune pgvector ivfflat parameters (based on data volume)
6. Implement caching strategy (Valkey)
7. Add distributed tracing (Zipkin)
8. Load testing (JMeter)
9. Security audit (OWASP Top 10)

**Deliverables:**
- Production docker-compose.yml (security settings)
- Rate limiting configuration
- Security test suite
- Performance benchmarks
- Hardening guide

---

## 4. API SPECIFICATION (Summary)

### Chat Endpoints

```
POST /api/v1/ai/chat
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "message": "string (required)",
  "context": {
    "entity_type": "OPPORTUNITY|DEVIS|COMMANDE|PRODUCT|SUPPLIER",
    "filters": { ...any valid filter... }
  },
  "conversation_id": "uuid (optional, starts new if omitted)",
  "stream": boolean (default: true)
}

Response (streaming via SSE):
event: chunk
data: {"chunk": "...", "sources": [...]}

event: done
data: {"conversation_id": "...", "message_count": N, "tokens": {"input": X, "output": Y}}
```

---

### Forecast Endpoints

```
POST /api/v1/ai/forecast/sales
{
  "periods": 30,
  "granularity": "daily" | "weekly" | "monthly",
  "confidence_level": 0.95
}
→ {
    "forecast": [
      {"date": "2026-07-07", "value": 45000, "lower": 42000, "upper": 48000},
      ...
    ],
    "mape": 0.12,
    "model_version": "prophet-v1",
    "trained_at": "2026-06-07T00:00:00Z"
  }

POST /api/v1/ai/forecast/revenue
{
  "periods": 90,
  "include_orders": true
}
→ Daily revenue + cumulative forecast

POST /api/v1/ai/forecast/cashflow
{
  "periods": 90,
  "include_supplier_payments": true,
  "payment_delay_days": 30
}
→ Cash position forecast

POST /api/v1/ai/forecast/stock
{
  "product_ids": ["uuid1", "uuid2"],
  "lookahead_days": 90
}
→ Stock-out risk per product
```

---

### Classification Endpoints

```
POST /api/v1/ai/classification/quote-success
{
  "devis_attributes": {
    "profile_series": "T60",
    "width_mm": 1200,
    "height_mm": 1800,
    "glass_type": "DV_4_16_4",
    "opening_type": "COULISSANT",
    "quantity": 5,
    "discount_pct": 5,
    "client_type": "PROFESSIONNEL",
    "client_age_days": 365
  }
}
→ {
    "probability": 0.78,
    "confidence": 0.92,
    "recommendation": "LIKELY_TO_ACCEPT",
    "features_importance": {...}
  }

POST /api/v1/ai/classification/payment-risk
{
  "client_id": "uuid",
  "invoice_amount": 15000,
  "days_overdue": 30,
  "client_history": {
    "avg_payment_delay_days": 15,
    "num_invoices": 25,
    "payment_success_rate": 0.96
  }
}
→ {
    "risk_score": 0.34,
    "risk_level": "LOW",
    "recommendation": "NO_ACTION",
    "follow_up_action": null
  }
```

---

### Document Management

```
POST /api/v1/ai/documents/index
{
  "source_type": "DEVIS" | "FACTURE" | "COMMANDE" | "SAV",
  "force_reindex": false,
  "limit": 100
}
→ {
    "task_id": "uuid",
    "status": "queued|processing|completed|failed",
    "message": "Indexing 50 documents..."
  }

GET /api/v1/ai/documents/search
{
  "query": "profils aluminum 1200x1800",
  "k": 5,
  "threshold": 0.7
}
→ {
    "results": [
      {
        "document_id": "uuid",
        "source_type": "DEVIS",
        "source_id": "uuid",
        "title": "Devis DV-001",
        "content": "...",
        "distance": 0.23,
        "metadata": {...}
      },
      ...
    ]
  }
```

---

## 5. SECURITY & COMPLIANCE

### Multi-Tenancy

✅ **Enforced at all layers:**
- JWT claim: `tenant_id`
- Gateway: X-Tenant-Id header injection
- PostgreSQL RLS: `current_tenant_id()` policy
- ai-service: Postgres session stamping (set_config)

### RBAC

✅ **Keycloak roles:**
- SUPER_ADMIN: Full access to admin AI endpoints
- EMPLOYER: Access to company dashboards + chat
- EMPLOYEE: Read-only access to relevant data
- CLIENT: Limited access (quotes, invoices only)

### Data Privacy

✅ **GDPR Compliance:**
- Conversation history deletion: `POST /api/v1/ai/conversations/{id}/clear`
- Audit log: All AI interactions logged
- Data retention: Per-tenant policy (RLS enforced)
- No data leakage: RLS prevents cross-tenant access

### Security Warnings

⚠️ **Requires fixing before production:**
1. `DEV_AUTH_BYPASS=true` in docker-compose → **disable in non-dev**
2. Ollama CPU-only → **enable GPU for large scale**
3. No rate limiting → **add circuit breaker + Redis**
4. Prompt injection → **implement input sanitization + validation**

---

## 6. PERFORMANCE & SCALING

### Database Optimization

**Indexes (already in migrations):**
- pgvector ivfflat (lists=100): Tune based on data volume
- Tenant + status composite indices
- Time-series indices (created_at DESC)

**Query Optimization:**
- Use SQL views for aggregations
- Batch operations (bulk insert documents)
- Connection pooling (asyncpg default: 10 connections)

### Caching Strategy (Valkey)

```
Cache Key Patterns:
- forecast:sales:{tenant_id}:{granularity} (TTL: 24h)
- forecast:revenue:{tenant_id} (TTL: 24h)
- model:prophet:v1 (TTL: 24h)
- embeddings:search:{hash(query)} (TTL: 1h)
- conversation:{tenant_id}:{user_id}:{id} (TTL: 30 days)
```

### Scaling Considerations

| Component | Current | Scaling Path |
|-----------|---------|--------------|
| Postgres | Single instance | Streaming replication + read replicas |
| pgvector | ivfflat (100M vectors) | FAISS or external vector DB (Weaviate, Pinecone) |
| Ollama | Single GPU | Horizontal scaling (vLLM, TensorRT) |
| ai-service | Single instance | Kubernetes deployment (auto-scaling) |
| RabbitMQ | Single broker | RabbitMQ cluster |

---

## 7. MONITORING & OBSERVABILITY

### Metrics (Prometheus)

```
# AI Service metrics
ai_chat_requests_total{tenant_id, status}
ai_chat_latency_seconds{tenant_id, percentile}
ai_retrieval_results{k, threshold}
ai_embeddings_created_total{tenant_id}
ai_forecast_accuracy{model_type, mape}
ai_model_training_duration_seconds{model_type}
```

### Logs (Loki)

```
# Log queries
{service="ai-service"} | "chat request"
{service="ai-service"} | "retrieval"
{service="ai-service"} | "model training"
```

### Traces (Zipkin)

- Chat request end-to-end latency
- Database query latencies
- Ollama inference latency

### Dashboards (Grafana)

- AI Service Health (uptime, error rate)
- Chat Performance (latency, throughput)
- Forecast Accuracy (MAPE, MAE)
- Model Training Status
- Embedding Index Growth
- Tenant-specific metrics

---

## 8. DEPLOYMENT & CI/CD

### Docker Images

```dockerfile
# ai-service/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://erp:erp_secret@postgres:5432/erp_db

# Ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=mistral

# Keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=erp

# AI Service
DEV_AUTH_BYPASS=false (production)
ALLOWED_ORIGINS=https://yourdomain.com
```

### Build & Push

```bash
# Build ai-service image
docker build -f ai-service/Dockerfile -t erp-ai-service:latest .

# Push to registry
docker tag erp-ai-service:latest your-registry.azurecr.io/erp-ai-service:latest
docker push your-registry.azurecr.io/erp-ai-service:latest
```

### Kubernetes Deployment (future)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-service
  template:
    metadata:
      labels:
        app: ai-service
    spec:
      containers:
      - name: ai-service
        image: your-registry.azurecr.io/erp-ai-service:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: database-url
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 9. RISK MITIGATION

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **LLM hallucinations** | High | Implement RAG grounding + response validation + human review for critical domains |
| **Embedding quality** | Medium | Start with Ollama Embed, upgrade to OpenAI if needed; measure via semantic similarity tests |
| **Model drift** | Medium | Implement drift detection; trigger retraining alerts |
| **Data privacy (GDPR)** | High | Conversation deletion API + audit logging + RLS enforcement |
| **Scalability (large embeddings)** | Medium | Plan migration to FAISS or external vector DB at 10M+ vectors |
| **Training data imbalance** | Medium | Use stratified cross-validation; apply SMOTE if needed |
| **Inference latency** | Medium | Implement caching; monitor p95/p99 latencies |

---

## 10. SUCCESS CRITERIA

### Phase 3 (RAG & Chat)
- ✅ Chat endpoint responds in < 2 seconds (p95)
- ✅ Real embeddings (not deterministic)
- ✅ Conversation persistence working
- ✅ Cross-tenant isolation verified (integration tests)
- ✅ Streaming SSE working in frontend

### Phase 4 (Forecasting)
- ✅ Sales forecast MAPE < 15%
- ✅ Revenue forecast accuracy validated on holdout data
- ✅ Stock forecast tested on 90-day window
- ✅ Retraining nightly (no manual intervention)

### Phase 5 (Classification)
- ✅ Quote success classification AUC > 0.80
- ✅ Payment risk classification AUC > 0.75
- ✅ Feature importance explained
- ✅ Recommendation engine tested

### Phase 6 (Anomalies)
- ✅ Anomaly detection identified real outliers (manual verification)
- ✅ Purchase recommendations improve stock turnover
- ✅ No false positives overwhelming dashboard

### Phase 7 (Frontend UI)
- ✅ Chat component functional with streaming
- ✅ Forecast charts rendering correctly
- ✅ Mobile Flutter chat working
- ✅ E2E tests passing (Cypress)

### Phase 8 (ML Pipeline)
- ✅ Models retrained automatically
- ✅ Model versioning working
- ✅ MLflow tracking metrics
- ✅ Drift detection alerting

### Phase 9 (Security & Optimization)
- ✅ Security audit passing (OWASP)
- ✅ DEV_AUTH_BYPASS disabled
- ✅ Load test: 100 concurrent chat users
- ✅ Inference latency < 2s (p95)

---

## 11. CONCLUSION

This architecture **reuses all existing infrastructure** (ai-service, Ollama, pgvector, RLS, Keycloak) and extends it with:

1. **Real embeddings** (replacing deterministic POC)
2. **Functional chat endpoint** with RAG retrieval
3. **ML training pipelines** (Prophet, XGBoost, Scikit-Learn)
4. **Angular + Flutter UI** components for analytics
5. **Automated retraining** via RabbitMQ
6. **Production security** hardening

**No new infrastructure required.** All components already deployed.

**Implementation:** 9-12 weeks (iterative, 2-week sprints)

**Effort:** ~2 FTE engineers (backend ML + frontend)

---

**Next:** Await validation before Phase 3 implementation begins.

---

*Last Updated: 2026-06-07*  
*Architecture Version: 1.0*  
*Status: ✅ APPROVED FOR PHASE 3 IMPLEMENTATION*
