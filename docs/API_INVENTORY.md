# API Inventory — Key endpoints for AI integration

Date: 2026-06-07

This document lists discovered HTTP API endpoints relevant to AI integration, the service that exposes them, expected authentication, and primary data sources useful for RAG / ML.

1) ai-service (FastAPI) — `ai-service` (port 8000)
- `GET /api/v1/ai/health` — health. Auth: none (public).
- `GET /api/v1/ai/model-status` — check Ollama availability. Auth: staff role required in code (`StaffUser`).
- `POST /api/v1/ai/chat` — chat with local Ollama; accepts `{message, context?, temperature}`. Auth: staff role required for primary path; alias `/api/ai/chat` allows any authenticated user.
  - Data sources: optional `context` field; recommended to pass assembled RAG snippets from `ai_documents`.
- `POST /api/v1/ai/retrieval` — semantic search against `ai_embeddings` (pgvector). Auth: any authenticated user for `/api/v1/ai/retrieval`; `retrieval_noauth` exists for dev testing when `DEV_AUTH_BYPASS=true`.
- `POST /api/v1/ai/index/devis` — trigger indexing of recent `devis` into `ai_documents`/`ai_embeddings`. Auth: `SUPER_ADMIN` role required.
- Forecast/classification/anomaly stubs:
  - `POST /api/v1/ai/forecast/sales`
  - `POST /api/v1/ai/forecast/cashflow`
  - `POST /api/v1/ai/forecast/stock`
  - `POST /api/v1/ai/classification/quote-success`
  - `POST /api/v1/ai/classification/payment-risk`
  - `POST /api/v1/ai/recommendations/purchase`
  - `POST /api/v1/ai/anomalies`
  - Auth: current code uses AnyUser or StaffUser depending on route; they are currently stubs returning empty/neutral responses.

2) Sales service (Spring Boot, port 8084)
- Routes under `/api/v1/sales/**` proxied by gateway to `sales-service`.
- Key resources: `POST /api/v1/sales/devis`, `GET /api/v1/sales/devis`, `PATCH /api/v1/sales/devis/{id}/status` (status transitions), product catalog endpoints, commandes, factures
- Auth: JWT via Keycloak; roles enforced (EMPLOYER/EMPLOYEE etc.).
- Data sources for AI: `devis` (quotes), `devis_lines`, `catalog_products`, `commandes`, `factures`, `encaissements`.

3) CRM service (Spring Boot, port 8083)
- Routes under `/api/v1/crm/**` (prospects, clients, opportunities).
- Data sources: client profiles, opportunity probability and estimated value (useful labels/features).

4) Inventory service (Spring Boot, port 8085)
- Routes under `/api/v1/inventory/**` (stock items, movements, low-stock queries).
- Data sources: `stock_items`, `stock_movements` for stock forecasting and purchase recommendation features.

5) Achat service (purchases, port 8086)
- Routes under `/api/v1/achats/**` (bons_commande, receptions).
- Data sources: purchase orders and supplier info for procurement models.

6) Identity service (port 8082)
- Routes under `/api/v1/identity/**` (tenants, users). Use to map Keycloak user to tenant and role for contextualization and audit.

Gateway notes
- Gateway routes `/api/v1/ai/**` to `http://ai-service:8000`. TokenRelay is configured globally to forward JWT to downstream services. Confirm on `ai-service` that tenant information is taken from the JWT claim or requires `X-Tenant-Id` header.

Security summary per endpoint
- Most endpoints require a valid JWT (Keycloak). `ai-service` uses `get_current_user()` to validate JWT against Keycloak JWKS. Some admin endpoints require `SUPER_ADMIN` role via `require_roles`.
- Dev risk: `retrieval_noauth` bypass exists and is enabled by `DEV_AUTH_BYPASS=true` in `docker-compose` — must be disabled in production.

Usage suggestions for AI
- For RAG: call `ai-service` retrieval endpoint after indexing; use `devis`/`factures`/`commandes` text to build `ai_documents`.
- For training: extract labeled examples from `devis` (status transitions), `factures`+`encaissements` (payment delay as label), and `stock_movements` (consumption time series).

Reference: gateway mapping file [backend/gateway/src/main/resources/application.yml](backend/gateway/src/main/resources/application.yml)
