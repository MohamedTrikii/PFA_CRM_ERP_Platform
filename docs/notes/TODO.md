# ERP Platform – TODO

## Immediate (close Phase 1 DoD)

- [ ] Run `cd backend && mvn install -DskipTests -q` → clears all IDE cross-module errors
- [ ] Run `mvn -pl identity test` → TenantIsolationIT must pass (6 tests)
- [ ] `docker-compose up -d` → verify all services healthy
- [ ] Login as `demo-employer / Employer@123` on Angular frontend → JWT received, dashboard loads
- [ ] Login on Flutter app → see email + tenant + role on home screen
- [ ] Confirm cross-tenant: hit `GET /api/v1/identity/users` as demo-employer → only demo-tenant users returned

## Phase 2 – Done ✅  (close-out checklist)

- [ ] `mvn install -DskipTests && mvn -pl identity test` → all green
- [ ] Login, create user, verify audit entry appears in `/admin/audit`
- [ ] Confirm EMPLOYEE role cannot reach `/admin/users`

## Phase 3 – Core Modules ✅ DONE

All items completed. See PROGRESS.md Phase 3 for verification steps.

## Phase 4 – Quote Request + Customer Portal ✅ DONE

All items shipped. See PROGRESS.md Phase 4 for details.

Note: Keycloak CLIENT self-registration (erp-realm.json update) still pending — deferred to Phase 5 alongside role dashboards.

## Phase 5 – Role Dashboards + AI Tiles ✅ DONE

All items shipped. See PROGRESS.md Phase 5 for details.

## Phase 6 – Mobile (Flutter) full features ✅ DONE

All items shipped. FCM push notifications are stubbed (see `notification_service.dart` header for Firebase setup steps).
Run `flutter pub run build_runner build` to generate `app_database.g.dart`.

## Phase 7 – Achats + Finance ✅ DONE

All items shipped. See PROGRESS.md Phase 7 for verification steps.

## Phase 8 – White-label CMS + Super-Admin ✅ DONE

All items shipped. See PROGRESS.md Phase 8 for verification steps.

## Phase 9 – Observability, CI/CD, hardening ✅ DONE

All items shipped. See PROGRESS.md Phase 9 for verification steps.

## All 9 Phases Complete ✅

The ERP platform is fully built across all phases. See PROGRESS.md for per-phase verification steps.

# ERP Platform – TODO

## Phase 10 – AI Integration (Phases 10.0-10.7) 🆕

### Phase 10.0 – Audit & Architecture ✅ DONE

- [x] Analyze existing backend (8 Spring Boot modules)
- [x] Audit database schema (all tables, RLS policies)
- [x] Verify Ollama + pgvector setup (docker-compose)
- [x] Document security (Keycloak JWT, multi-tenant RLS, RBAC)
- [x] Create [docs/AI_EXISTING_SYSTEM_AUDIT.md](docs/AI_EXISTING_SYSTEM_AUDIT.md)
- [x] Create [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md)
- [x] Identify non-blocking issues (DEV_AUTH_BYPASS, embedding quality)
- [x] Update PROGRESS.md + TODO.md

### Phase 10.1 – RAG & Chat (IN PROGRESS)

**High Priority (blocking Phase 2 work):**
- [ ] Replace deterministic embeddings with real embedder (Ollama Embed API or Sentence Transformers)
- [ ] Implement `/api/v1/ai/chat` endpoint with streaming SSE
- [ ] Implement `/api/v1/ai/documents/search` (pgvector similarity)
 - [x] Implement `/api/v1/ai/documents/search` (pgvector similarity)
- [ ] Store conversation history in `ai_conversations` table
- [ ] Add Postgres session stamping in ai-service (`set_config('app.tenant_id', ...)`)
- [ ] Create `ai-service/app/embedder.py` (real embeddings)
- [ ] Create `ai-service/app/chat.py` (RAG + LLM orchestration)
- [ ] Write integration tests (RLS, cross-tenant isolation)
- [ ] Test chat streaming in frontend (SSE consumer)

**Medium Priority:**
- [ ] Add conversation management endpoints (list, get, clear)
- [ ] Implement conversation metadata (title, context)
- [ ] Add source citation tracking
- [ ] Performance optimization (caching, batching)
- [ ] Add prompt engineering (domain-specific system prompts)

**Documentation:**
- [ ] Update docs/AI_ARCHITECTURE.md with implementation details
- [ ] Document embeddings choice (why Ollama Embed vs alternatives)
- [ ] API documentation (OpenAPI/Swagger)
- [x] Create docs/AI_API.md (API inventory and status)

### Phase 10.2 – Forecasting (IN PLANNING)

**High Priority:**
- [ ] Feature engineering: daily sales aggregations (SQL view)
- [ ] Train Prophet model on historical sales
- [ ] Implement `/api/v1/ai/forecast/sales` endpoint
- [ ] Implement `/api/v1/ai/forecast/revenue` endpoint
- [ ] Test forecast accuracy on holdout set
- [ ] Model persistence (ai_models table)

**Medium Priority:**
- [ ] Cashflow forecasting (revenue - payment delays)
- [ ] Stock consumption forecasting (existing forecast.py)
- [ ] Confidence intervals (upper/lower bounds)
- [ ] Trend + seasonality decomposition
- [ ] Scheduled retraining (nightly)

### Phase 10.3 – Classification (IN PLANNING)

**High Priority:**
- [ ] Feature engineering: quote characteristics (profile, glass type, dimensions, discount, client age)
- [ ] Train XGBoost on quote acceptance history
- [ ] Implement `/api/v1/ai/classification/quote-success` endpoint
- [ ] Feature engineering: payment patterns (client age, payment delays, sector)
- [ ] Train XGBoost on payment delinquency
- [ ] Implement `/api/v1/ai/classification/payment-risk` endpoint

**Medium Priority:**
- [ ] Feature importance analysis (SHAP values)
- [ ] Explanation generation (why high/low risk?)
- [ ] Threshold tuning (precision vs recall)
- [ ] Cross-validation + holdout test

### Phase 10.4 – Anomalies & Recommendations (IN PLANNING)

**High Priority:**
- [ ] Implement Isolation Forest for order anomalies
- [ ] Implement DBSCAN for stock clustering
- [ ] Implement `/api/v1/ai/anomalies` endpoint
- [ ] Auto-generate purchase recommendations (low stock)
- [ ] Implement `/api/v1/ai/recommendations/purchase` endpoint

**Medium Priority:**
- [ ] Supplier lead-time recommendations
- [ ] Stock rebalancing suggestions
- [ ] Payment dunning recommendations
- [ ] Anomaly severity scoring

### Phase 10.5 – Frontend UI (IN PLANNING)

**High Priority:**
- [ ] Create `AiAssistantComponent` (chat UI, message list, input)
- [ ] Implement Server-Sent Events (SSE) consumer in Angular Service
- [ ] Add streaming message display
- [ ] Implement conversation history sidebar
- [ ] Create forecast tiles component

**Medium Priority:**
- [ ] Source citations rendering
- [ ] Conversation metadata (title, timestamp)
- [ ] Chart.js forecast visualization
- [ ] Mobile Flutter chat implementation
- [ ] E2E tests (Cypress)
- [ ] Responsive design (mobile, tablet)

### Phase 10.6 – ML Pipeline (IN PLANNING)

**High Priority:**
- [ ] Create RabbitMQ consumer worker
- [ ] Implement nightly training scheduler (APScheduler or Kubernetes CronJob)
- [ ] Model versioning in `ai_models` table
- [ ] Store model artifacts in SeaweedFS

**Medium Priority:**
- [ ] Model performance Grafana dashboard
- [ ] Model drift detection alerts
- [ ] MLflow integration (optional)
- [ ] Training logs + metrics tracking
- [ ] Retraining failure alerts

### Phase 10.7 – Security & Optimization (IN PLANNING)

**High Priority (before production):**
- [ ] Disable `DEV_AUTH_BYPASS` in docker-compose.yml
- [ ] Remove `retrieval_noauth` endpoint or gate it properly
- [ ] Add Postgres session stamping in all ai-service endpoints
- [ ] Add rate limiting to AI endpoints (circuit breaker + Redis)
- [ ] Security audit (Keycloak JWT validation, RLS enforcement)

**Medium Priority:**
- [ ] Implement request sanitization (SQL injection prevention)
- [ ] Prompt injection detection
- [ ] pgvector index tuning (HNSW or FAISS migration path)
- [ ] Caching strategy (Valkey keys design)
- [ ] Distributed tracing (Zipkin)

**Testing & Optimization:**
- [ ] Load testing (100+ concurrent chat users)
- [ ] Latency benchmarks (p50, p95, p99)
- [ ] Memory profiling (Python ai-service)
- [ ] OWASP Top 10 security audit
- [ ] GPU pass-through setup guide (Ollama)

---

## Backlog / Optional enhancements

- [ ] Maven wrapper binary: run `mvn wrapper:wrapper` in `/backend` once Maven is installed
- [ ] Flutter push notifications: configure Firebase project + add `google-services.json` + run `flutterfire configure` (see `notification_service.dart` header)
- [ ] Flutter: run `flutter pub run build_runner build --delete-conflicting-outputs` to generate Drift `app_database.g.dart`
- [x] Ollama / Mistral local AI: `ollama` service added to docker-compose (GPU flag commented out, enable by uncommenting `deploy` block); `ai-service` wired with `OLLAMA_URL` + `OLLAMA_MODEL`; `/api/v1/ai/chat` + `/api/v1/ai/model-status` endpoints added. **First-run model pull:** `docker exec erp-ollama ollama pull mistral`
- [ ] Tenant subdomain routing in gateway (production) vs X-Tenant-Id header (dev)
- [x] Loki log aggregation: Loki 2.9.7 + Promtail added to docker-compose; Loki datasource provisioned in Grafana; JSON logs from all ERP containers shipped automatically
- [x] Grafana dashboards: jvm-metrics.json (heap, GC, threads, CPU), http-metrics.json (rate, p50/p95/p99, error ratio, top-10 endpoints), rabbitmq-metrics.json (queue depth, throughput, consumers, DLQ) — all auto-provisioned
- [ ] Kill Bill billing integration (advanced subscription/invoicing beyond current Facture model)
