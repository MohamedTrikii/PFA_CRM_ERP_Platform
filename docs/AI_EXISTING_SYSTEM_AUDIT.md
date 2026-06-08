# AI Existing System Audit

Date: 2026-06-07

## Executive summary
- The repository already contains a functioning `ai-service` (FastAPI) integrated with a local Ollama LLM, pgvector support, and DB migrations for AI tables. The platform uses Keycloak for auth and implements multi-tenant isolation with PostgreSQL RLS. The Spring Cloud Gateway routes `/api/v1/ai/**` to the `ai-service` and Docker Compose includes an `ollama` service under the `ai` profile.
- Many AI endpoints are present (chat, retrieval, index, forecast/classification/anomalies stubs). Core RAG tables and RLS policies are drafted. Several endpoints are stubs or POCs (indexer uses deterministic embeddings, forecasts/classifiers/anomalies are placeholders).

## Where to look (key files)
- `ai-service/app/main.py` — FastAPI app, endpoints: `/api/v1/ai/chat`, `/api/v1/ai/retrieval`, `/api/v1/ai/model-status`, plus forecast/classification/anomaly stubs. ([ai-service/app/main.py](ai-service/app/main.py))
- `ai-service/app/ollama.py` — thin Ollama client and system prompt. ([ai-service/app/ollama.py](ai-service/app/ollama.py))
- `ai-service/app/indexer.py` — RAG indexer POC (deterministic pseudo-embeddings). ([ai-service/app/indexer.py](ai-service/app/indexer.py))
- `ai-service/db/migrations/V1__ai_schema.sql` — AI tables draft: `ai_documents`, `ai_embeddings`, `ai_models`, `ai_conversations` (with RLS policies + pgvector index). ([ai-service/db/migrations/V1__ai_schema.sql](ai-service/db/migrations/V1__ai_schema.sql))
- `docker-compose.yml` — contains `ollama` (profile `ai`), `ai-service` and `postgres` using `pgvector/pgvector:pg16`. ([docker-compose.yml](docker-compose.yml))
- `backend/gateway/src/main/resources/application.yml` — gateway routes `/api/v1/ai/**` to `http://ai-service:8000`. ([backend/gateway/src/main/resources/application.yml](backend/gateway/src/main/resources/application.yml))
- `backend/identity/src/main/resources/db/migration/V2__rls_hardening.sql` — defines `current_tenant_id()` helper used by RLS policies. ([backend/identity/src/main/resources/db/migration/V2__rls_hardening.sql](backend/identity/src/main/resources/db/migration/V2__rls_hardening.sql))
- `ai-service/Dockerfile` & `ai-service/requirements.txt` — runtime and libraries (FastAPI, asyncpg, numpy, XGBoost, Prophet etc.). ([ai-service/Dockerfile](ai-service/Dockerfile), [ai-service/requirements.txt](ai-service/requirements.txt))
- Documentation & plans: `docs/ai-integration-plan.md` and `PROGRESS.md` contain design notes, constraints and multi‑tenant/RLS implementation details. ([docs/ai-integration-plan.md](docs/ai-integration-plan.md), [PROGRESS.md](PROGRESS.md))

## Architecture (observed)
- Frontend Angular → Spring Cloud Gateway → multiple Spring microservices and `ai-service` (FastAPI).
- `docker-compose` includes `postgres` (pgvector), `keycloak`, `ollama`, and `ai-service` under profile `ai`.
- Gateway forwards JWT to downstream services (TokenRelay). Gateway routes `/api/v1/ai/**` to `ai-service`.
- Multi-tenancy is enforced server-side via a combination of: Keycloak tenant claim, `TenantContext` (backend), `current_tenant_id()` DB helper, and RLS policies on tables.

## Database — AI and business tables (inventory)
Note: this is an inventory of locations and examples found; a full exhaustive schema extraction requires parsing each module's migrations. Key AI-related tables are present as drafts.

- AI tables (drafts/migrations found):
  - `ai_documents` — text, metadata, source_type, source_id, tenant_id. ([ai-service/db/migrations/V1__ai_schema.sql](ai-service/db/migrations/V1__ai_schema.sql))
  - `ai_embeddings` — `embedding vector(1536)` (pgvector), `document_id`, `tenant_id`, `model_name`. ([ai-service/db/migrations/V1__ai_schema.sql](ai-service/db/migrations/V1__ai_schema.sql))
  - `ai_models` — model metadata, optional tenant scoping.
  - `ai_conversations` — conversation history (messages JSONB), user_id, tenant_id.

- Business domain tables (examples found in module migrations):
  - Sales module: `devis`, `devis_lines`, `commandes`, `factures`, `encaissement`, `livraisons` (see `backend/sales` migrations). ([backend/sales/](backend/sales/))
  - Achat (purchases): `bons_commande`, `bons_commande_lignes`, `fournisseurs` (see `backend/achat` migrations). ([backend/achat/](backend/achat/))
  - CRM: `prospect`, `client`, `opportunity` (see `backend/crm` migrations). ([backend/crm/](backend/crm/))
  - Inventory: `stock_item`, `stock_movement`, `stock_location` (see `backend/inventory`). ([backend/inventory/](backend/inventory/))

For each of these tables the project enforces RLS policies (uses `current_tenant_id()` in many module migrations). Potential volumes: typical ERP volumes expected (tens of thousands → millions of rows per table depending on tenant size); recommend capacity planning for `ai_embeddings` (ANN index growth). The `ai_embeddings` table uses an `ivfflat` index in migration which needs tuning for large datasets.

## AI existing functionality (what exists)
- FastAPI `ai-service` running multiple endpoints:
  - `/api/v1/ai/health` — health.
  - `/api/v1/ai/model-status` — queries Ollama tags.
  - `/api/v1/ai/chat` — sends prompt to local Ollama (requires Ollama running and model pulled).
  - `/api/v1/ai/retrieval` — RAG retrieval using `ai_embeddings` (pgvector) and `ai_documents`.
  - `/api/ai/*` backward-compatible aliases exist for some endpoints.
  - `/api/v1/ai/index/devis` — admin trigger that starts `indexer.index_devis()` in background.
- `indexer.py` exists as a proof-of-concept: extracts recent `devis` rows, inserts `ai_documents` and `ai_embeddings` using a deterministic pseudo-embedder (seeded RNG). ([ai-service/app/indexer.py](ai-service/app/indexer.py))
- `ollama.py` client with a preconfigured system prompt tailored to the ERP domain; Docker Compose includes `ollama` image and the `start` scripts mention pulling the `mistral` model. ([ai-service/app/ollama.py](ai-service/app/ollama.py), [docker-compose.yml](docker-compose.yml), [start.ps1](start.ps1))
- Requirements include ML libs (`xgboost`, `scikit-learn`, `prophet`) and infrastructure libs (`asyncpg`, `httpx`). ([ai-service/requirements.txt](ai-service/requirements.txt))

## What's working now (validated from code)
- AI service skeleton is functional: health, chat (Ollama client), retrieval (pgvector SQL), and admin index trigger.
- Docker setup supports a local LLM (Ollama) and `ai-service` in an `ai` profile. `postgres` image includes `pgvector` extension.
- Gateway routes are configured to expose the AI service to the platform via standard `/api/v1/ai/**` paths.
- Multi-tenant and RLS mechanisms exist and are applied in DB migrations via `current_tenant_id()` helper.

## What is incomplete / prototype / risky
- Many ML endpoints are stubs or placeholders (no trained models): sales/cashflow forecasts, classification endpoints, anomaly detection, recommendations return empty or neutral responses. See `ai-service/app/main.py` for explicit stubs.
- The `indexer` uses deterministic pseudo-embeddings (not a real embedder) — must be replaced with a production embedder (Ollama embed API or other) before useful semantic retrieval.
- Conversation persistence: `ai_conversations` table exists in migrations, but there is no code in `ai-service` observed that writes chat history to DB. Conversation memory is not implemented.
- Security: `ai-service` docker-compose environment sets `DEV_AUTH_BYPASS: "true"` (development convenience) and `retrieval_noauth` endpoint exists guarded by this flag. This is a significant risk if enabled in non‑dev environments.
- Gateway route for `ai-service` does not include `TenantHeaderFilter` in the route definition (Gateway global filters include a `TenantHeaderFilter` in general, but the `ai-service` route lacks it). Verify tenant propagation (JWT contains tenant claim; TokenRelay forwards JWT — ai-service relies on token claims rather than a header). Confirm expected tenant propagation path.
- Embedding dimension and ANN index tuning: migration uses `vector(1536)` and `ivfflat` with `lists = 100` — parameters must be tuned for data volume.
- No model lifecycle management or model registry in place (no code writes to `ai_models` yet).

## What is missing (to reach Phase 2+ goals)
- Production-quality embedding generator and integration with Ollama or a hosted embedder. Replace POC `deterministic_embedding` with a real embedder.
- Conversation storage + audit + per-tenant retention policy implementation.
- Training pipelines and scheduled retraining jobs (XGBoost / RandomForest / Prophet). Currently only libraries are present; no training orchestration.
- UI components: no `AiAssistantComponent` in frontend yet — needs Angular component, streaming support, history, and citations rendering.
- Model explainability & monitoring (drift detection, model performance tracking). Consider `mlflow` dependency present — can be used for models tracking but integration is not implemented.

## Recommended reuse & integration points
- Reuse `ai-service` as the canonical AI microservice. It already exposes the required endpoints and is wired in `docker-compose` and `gateway`.
- Reuse `ai_documents` / `ai_embeddings` schema and RLS design (tenant_id + `current_tenant_id()` policies). They align with project multi‑tenant constraints.
- Use the existing `ollama.py` client and the `ollama` Docker service for local LLM hosting; extend `ollama.py` to support streaming if needed.
- Reuse `indexer.index_devis()` flow as a seed for RAG ingestion but replace the embedding function with a proper embedder and add batching, error handling, and idempotency.
- Integrate model training pipelines as separate jobs (containerized or Airflow/Prefect), outputting versioned artifacts and metadata to `ai_models`.

## Short-term technical risks & mitigations
- Risk: `DEV_AUTH_BYPASS=true` (docker-compose) → accidental exposure of `retrieval_noauth`. Mitigation: set `DEV_AUTH_BYPASS=false` in non‑dev env and remove `retrieval_noauth` from production builds.
- Risk: RAG index growth → storage and performance issues for `ai_embeddings` with ANN index. Mitigation: define capacity plan, shard by tenant, tune `ivfflat` `lists`, and consider FAISS or external vector DB for large scale.
- Risk: tenant propagation mismatch (gateway route lacks explicit TenantHeaderFilter). Mitigation: verify JWT contains `tenant_id` claim and `ai-service` reads it; otherwise, add `TenantHeaderFilter` in gateway route to propagate `X-Tenant-Id` header.
- Risk: hallucination or out-of-domain responses from LLM. Mitigation: implement RAG grounding, prompt engineering, top‑k retrieval verification, and response sanitization.

## Immediate suggested next steps (audit → validation only)
1. Validate this audit and confirm scope for Phase 2.
2. Disable `DEV_AUTH_BYPASS` in `docker-compose.yml` for any non‑dev environment and remove `retrieval_noauth` usage.
3. Replace the deterministic embedder in `ai-service/app/indexer.py` with a call to a chosen embedder (Ollama embed API or external service) — but only after Phase 2 design approval.
4. Implement conversation persistence (store chat inputs/outputs to `ai_conversations`) with RLS and per‑tenant retention settings.
5. Design training pipelines and storage for model artifacts (use `mlflow` or `ai_models` table as registry).

## Detailed table inventory (selected tables)
Note: this section lists the most relevant tables for AI integration (RAG, forecasting, classification). For each table: relations, key columns, RLS note, estimated volume, and ML usability guidance.

- `devis` (Sales — quotes)
  - Relations: `client_id` → `clients`, `opportunity_id` → `opportunities`; `devis_lines` children via `devis_id`.
  - Key columns: `id`, `tenant_id`, `reference`, `status`, `total_ht`, `total_ttc`, `created_at`, `updated_at`.
  - RLS: `tenant_isolation` using `current_tenant_id()` (SELECT protected).
  - Volume: moderate → high (per-tenant tens of thousands → hundreds of thousands).
  - ML usability: excellent source for RAG (quote text), supervised targets for `quote-success` (status transitions), features for modelling acceptance probability (history, totals, client risk).

- `devis_lines`
  - Relations: `devis_id` → `devis`; may reference `catalog_products`.
  - Key columns: `product_snapshot` (JSONB), `quantity`, `unit_price`, `total_ht`.
  - RLS: governed by parent `devis` tenant.
  - ML usability: good for building product-level features (price buckets, common line-items) and chunking documents for RAG.

- `commandes` (Orders)
  - Relations: `devis_id` → `devis`.
  - Key columns: `status`, `expected_delivery_date`, `created_at`.
  - RLS: tenant enforced.
  - ML usability: order conversion and delivery risk signals; can be used for forecasting demand and cashflow timing.

- `factures` and `facture_lines`
  - Relations: `commande_id`, `client_id`, `facture_lines` children.
  - Key columns: `total_ttc`, `amount_paid`, `issue_date`, `due_date`, `status`.
  - RLS: tenant enforced.
  - ML usability: core for payment-risk models, aging, cashflow forecasting and RAG for invoice Q&A.

- `encaissements` (Payments)
  - Relations: `facture_id` → `factures`.
  - Key columns: `amount`, `payment_date`, `payment_method`.
  - ML usability: training labels for payment-risk and delinquency models.

- `catalog_products`
  - Key columns: `reference`, `unit_price`, `category`.
  - ML usability: product features for demand forecasting and purchase recommendations.

- `prospects`, `clients`, `opportunities` (CRM)
  - Relations: `client_id` links to sales tables; `opportunities` include `estimated_value`, `probability`.
  - ML usability: client segmentation, lead scoring (quote acceptance), churn/risk signals.

- `stock_items`, `stock_locations`, `stock_movements` (Inventory)
  - Relations: `stock_items` links to `product_id`, `location_id`; `stock_movements` append-only ledger with `source_type`/`source_id`.
  - Key columns: `quantity`, `min_quantity`, `last_movement_at`, `movement_type`.
  - ML usability: time-series for stock consumption, inventory risk (stockout prediction), features for purchasing recommendations.

- `fournisseurs`, `bons_commande`, `bons_commande_lignes`, `bons_reception` (Purchases)
  - RLS: tenant enforced.
  - ML usability: supplier lead-time estimation and procurement optimization.

- `ai_documents`, `ai_embeddings`, `ai_models`, `ai_conversations` (AI schema)
  - `ai_documents`: stores document text + metadata; `tenant_id` enforced by RLS policy in migration.
  - `ai_embeddings`: vector(1536) column, `document_id` FK, `tenant_id`; ANN index `ivfflat` present in migration.
  - `ai_conversations`: messages JSONB, `tenant_id`, `user_id` — migration creates RLS policies but no write paths observed in code.
  - ML usability: `ai_documents` + `ai_embeddings` are foundational for RAG; tune vector dimension, index, and per-tenant sharding strategy.

- `users`, `tenants`, `audit_log` (Identity & Audit)
  - `users` contains `tenant_id` and `role` (used for RBAC). `audit_log` is append-only and tenant-scoped.
  - ML usability: `audit_log` may be useful for behavior anomaly detection, but privacy/audit requirements apply.

Notes on data quality and readiness
- Many tables include JSONB snapshots (e.g., `product_snapshot`) which facilitate RAG ingestion but require normalization/cleaning for modeling.
- Time fields (`created_at`, `issue_date`, `payment_date`) are present and suitable for time-series features; ensure consistent time zones and backfill when training.
- RLS: all tables enforce tenant isolation — any data access for training or batch embedding must be performed with per-tenant DB sessions (set_config('app.tenant_id', ...)).

## API inventory (summary)
See `docs/API_INVENTORY.md` for a full list. Key endpoints discovered:
- `ai-service` (FastAPI):
  - `GET /api/v1/ai/health` — health
  - `GET /api/v1/ai/model-status` — Ollama models
  - `POST /api/v1/ai/chat` — chat via Ollama (requires JWT)
  - `POST /api/v1/ai/retrieval` — pgvector retrieval (requires DB `DATABASE_URL`)
  - `POST /api/v1/ai/index/devis` — admin index trigger (SUPER_ADMIN)
  - Forecast/classification/anomalies endpoints exist as stubs: `/api/v1/ai/forecast/*`, `/api/v1/ai/classification/*`, `/api/v1/ai/recommendations/*`, `/api/v1/ai/anomalies`.

---
Stop here and await validation before any code or migration changes.

## Security deep-dive (summary of findings)

- Tenant propagation and session stamping:
  - The Java backend uses `KeycloakJwtAuthConverter` to copy `tenant_id` from the JWT into a `TenantContext` ThreadLocal and `TenantDataSourceConfig` to call `SELECT set_config('app.tenant_id', ?, FALSE)` for each DB connection. This ensures PostgreSQL RLS policies see the correct tenant for JPA calls.
  - The `gateway` includes a `TenantHeaderGatewayFilter` that can inject `X-Tenant-Id` from the JWT into downstream requests when the filter is applied to a route.
  - The `ai-service` (FastAPI) decodes the JWT via `get_current_user()` but does not set any DB session GUC. Many ai-service endpoints accept `tenant_id` in request payloads (e.g., `RetrievalRequest.tenant_id`) and the code uses that value directly for queries (see `retrieval` in `ai-service/app/main.py`). This pattern allows callers to supply arbitrary tenant IDs and bypass server-driven tenant enforcement.

- RLS coverage:
  - Migrations enable RLS and use `current_tenant_id()` in many modules including the AI schema (`ai_documents`, `ai_embeddings`, `ai_conversations`). The project-wide design expects per‑session `app.tenant_id` to be set so `current_tenant_id()` returns the authenticated tenant.
  - Several backend modules (Java) correctly stamp connections; the Python `ai-service` does not yet follow that pattern, which risks RLS not binding to the authenticated tenant.

- RBAC and role checks:
  - `ai-service` implements `require_roles()` and uses `StaffUser` (SUPER_ADMIN, EMPLOYER, EMPLOYEE) on most protected endpoints; `index_devis` is restricted to `SUPER_ADMIN`. Some aliases accept any authenticated user (`AnyUser`).
  - Spring services use `@PreAuthorize` / `hasAnyRole(...)` widely at controller methods (CRM, Sales, Achat, CMS controllers), and the JWT→authorities mapping is centralized in `KeycloakJwtAuthConverter`.

- Dev bypasses and risky endpoints:
  - `ai-service` exposes `/api/v1/ai/retrieval_noauth` which bypasses authentication when `DEV_AUTH_BYPASS=true` is set. `docker-compose.yml` currently includes `DEV_AUTH_BYPASS=true` for `ai-service` (development convenience). This must be disabled in any non‑dev environment.
  - Several endpoints accept `tenant_id` as a user-supplied parameter (retrieval, forecasts, other stubs). Relying on client-supplied tenant identifiers is insecure — tenant must be taken from the validated JWT claim or the trusted `X-Tenant-Id` header injected by the gateway.

- Concrete quick fixes (recommended, non-breaking):
  1. For `ai-service`: stop using caller-supplied `tenant_id`. Derive tenant from `get_current_user()` payload (JWT claim `tenant_id`) or read the trusted `X-Tenant-Id` header. Do not accept `tenant_id` in request payloads for authenticated endpoints.
  2. Stamp Postgres sessions in `ai-service` immediately after connection: execute `SELECT set_config('app.tenant_id', '<tenant-uuid>', FALSE)` on each new asyncpg connection so PostgreSQL RLS policies bind to the authenticated tenant (mirrors Java `TenantDataSourceConfig` behaviour).
  3. Remove or strictly gate `retrieval_noauth` and ensure `DEV_AUTH_BYPASS` is `false` in compose for non-dev stacks. If a local bypass is needed for dev, restrict it to non-shared developer machines (e.g., explicit compose override file not checked into repo).
  4. Add the `TenantHeaderFilter` to the `ai-service` route in `backend/gateway/src/main/resources/application.yml` to ensure `X-Tenant-Id` is present for downstream services that rely on it (this is additive and does not change authentication behavior if `ai-service` reads JWT directly).
  5. Add automated integration tests that exercise RLS: attempt cross-tenant queries from valid tokens and assert 403/empty results. Include test cases for `ai-service` retrieval/index endpoints.

- Longer-term controls:
  - Implement server-side validation and removal of any API parameters that allow explicit tenant selection (replace with server-derived tenant).
  - Harden observability: ensure logs include `tenant_id` and `request_id` for each ai-service request (use structured JSON logs) and add alerting on suspicious cross-tenant access attempts.
  - For background jobs (indexing, batch embedding), follow a strict per-tenant loop: obtain an admin/raw DB connection, set `app.tenant_id` to the target tenant for the duration of processing, then reset/close connection. Document operator procedures and admin gating for these jobs.

These findings are consistent with the initial audit conclusions. I can now (A) enumerate all protected endpoints and produce a mapping of endpoints → required role and whether they currently derive tenant from JWT/header or from request payload, and (B) produce a short hardening patch list for maintainers to apply. Please confirm which of (A) or (B) you want next; otherwise I'll proceed with (A) and then (B).
