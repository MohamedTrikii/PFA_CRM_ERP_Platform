# AI Service API Inventory

This document lists the AI-related HTTP endpoints exposed by the `ai-service` FastAPI app, their purpose, authentication requirements, and implementation status.

Note: implementation lives in `ai-service/app/main.py`.

---

## Health
- GET `/api/v1/ai/health` — Public (no special role). Returns service status. (Implemented)

## LLM / Chat
- POST `/api/v1/ai/chat` — Any authenticated user. Chat with the configured Ollama model. Supports optional `conversation_id` to append to an existing conversation. (Implemented)
- POST `/api/v1/ai/chat/stream` — Any authenticated user. SSE streaming chat response from Ollama. (Implemented)
- POST `/api/ai/chat` — Backward-compatible alias. (Implemented)
- POST `/api/ai/chat/stream` — Backward-compatible SSE alias. (Implemented)
- POST `/api/v1/ai/assistant` — Any authenticated user. Assistant flow with optional RAG retrieval and conversation persistence. (Implemented)
- GET `/api/v1/ai/model-status` — Staff users. Checks Ollama model availability. (Implemented)

Notes: the chat endpoints currently call `ai-service/app/ollama.py`. Streaming SSE is implemented in `ai-service/app/main.py` and the assistant endpoint persists conversations in `ai_conversations`.

## Forecasting
- POST `/api/v1/ai/forecast/sales` — Any authenticated user. Returns sales forecast predictions (uses ML inference if available). (Implemented as `forecast_sales`)
- POST `/api/v1/ai/forecast/cashflow` — Any authenticated user. Placeholder (not yet implemented, returns empty predictions).
- POST `/api/v1/ai/forecast/stock` — Any authenticated user. Stock forecast for provided SKUs (Implemented as `stock_forecast`)

## Classification
- POST `/api/v1/ai/classification/quote-success` — Any authenticated user. Predict quote acceptance probability (requires training features). (Implemented; returns placeholder if training deps missing)
- POST `/api/v1/ai/classification/payment-risk` — Any authenticated user. Predict payment risk (Implemented; returns placeholder if training deps missing)

## Recommendations
- POST `/api/v1/ai/recommendations/purchase` — Any authenticated user. Purchase recommendation stub (Implemented as stub returning empty list)

## Anomalies
- POST `/api/v1/ai/anomalies` — Any authenticated user. Detect anomalies (uses training/inference if available). (Implemented)

## Indexing & Training
- POST `/api/v1/ai/index/devis` — Admin-only. Trigger indexing of recent quotes into documents/embeddings (background task). (Implemented)
- POST `/api/v1/ai/train/forecast` — Admin-only. Train sales forecast (background). (Implemented)
- POST `/api/v1/ai/train/classifier/quote` — Admin-only. Train quote classifier. (Implemented)
- POST `/api/v1/ai/train/classifier/payment-risk` — Admin-only. Train payment risk classifier. (Implemented)
- POST `/api/v1/ai/train/anomaly/stock` — Admin-only. Train stock anomaly model. (Implemented)
- POST `/api/v1/ai/train/all` — Admin-only. Schedule multiple trainings. (Implemented)

## Missing / TODO (Phase 6 items)
- SSE streaming for `/api/v1/ai/chat` (implement server-sent events streaming to the Angular frontend)
- `/api/v1/ai/documents/search` — explicit documents search API (pgvector-backed retrieval). Indexer functions exist (`ai-service/app/indexer.py`) but no dedicated REST endpoint for documents/search.
- Persist full conversation transcripts into `ai_conversations` table: `ai-service/app/conversation.py` contains helpers; ensure `assistant` and `chat` endpoints record messages consistently.
- `ai-service/app/embedder.py` and `ai-service/app/chat.py` — RAG orchestration and embedding utilities are TODO (see `ai-service/app/indexer.py` and `ai-service/app/ollama.py` for references).
- Postgres session stamping (`set_config('app.tenant_id', ...)`) for tenant-aware queries is mentioned in TODO.md and not fully wired.

---

## Where to look in the code
- Main API routes: `ai-service/app/main.py`
- Ollama client: `ai-service/app/ollama.py`
- Document indexer / retrieval: `ai-service/app/indexer.py`
- Conversation persistence: `ai-service/app/conversation.py`
- ML trainers & inference: `ai-service/ml/*` (may be optional in lightweight env)



