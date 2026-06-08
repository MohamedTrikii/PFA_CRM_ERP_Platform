# IA Integration Plan — Multi‑tenant ERP/CRM Platform

Objectif: étendre le service `ai-service` existant pour fournir une plateforme IA multi‑tenant non‑intrusive, sécurisée et compatible Keycloak + PostgreSQL RLS.

Résumé des actions
- Produire les migrations SQL pour les tables IA (documents, embeddings, modèles, conversations).
- Étendre `ai-service` avec endpoints API demandés (stubs d'abord, puis implémentation progressive).
- Implémenter ingestion + indexation (RAG) via `pgvector` et policy RLS.
- Implémenter pipelines d'entraînement (XGBoost, RandomForest, Prophet) et endpoints de prédiction.
- Intégrer chat contextuel (Ollama) avec récupération RAG et historique conversationnel.

Sécurité et contraintes
- Respecter Keycloak: toutes les routes sensibles valident JWT via JWKS (déjà en place).
- Respecter multi‑tenant: toutes les tables IA contiennent `tenant_id UUID NOT NULL` et RLS policies `USING (tenant_id = current_tenant_id())`.
- Ne jamais casser l'existant: les nouveaux endpoints sont ajoutés en parallèle (`/api/ai/*`) et feature‑flaggés.

DB — migrations (draft)
- Table `ai_documents` : stocke texte brut, metadata, source_type, source_id, tenant_id.
- Table `ai_embeddings` : référence vers `ai_documents`, colonne `embedding vector`, tenant_id, pgvector index.
- Table `ai_models` : metadata des modèles (name, version, path, tenant_id, created_at).
- Table `ai_conversations` : historique conversationnel (messages JSONB, user_id, tenant_id).

RAG design
- Ingestion: extraire texte (devis, factures, commandes, SAV, docs) → nettoyages → embeddings via Ollama/embedder → INSERT dans `ai_documents` + `ai_embeddings`.
- Recherche: ANN search via `ai_embeddings.embedding <-> query_embedding` (pgvector) scoped by tenant RLS.
- Chat: récupère top‑k docs, construit prompt, appelle Ollama, stocke conversation.

ML design
- Off‑line training pipelines (notebooks / scripts) qui lisent depuis Postgres (RLS) et produisent modèles versionnés.
- Features examples: rolling sums, avg daily consumption, lead times, client aging, acceptance rates.
- Models: XGBoost / RandomForest for regression/classification; Prophet for time series baselines.

API surface (phase 1 — stubs)
POST /api/ai/chat
POST /api/ai/forecast/sales
POST /api/ai/forecast/cashflow
POST /api/ai/forecast/stock
POST /api/ai/classification/quote-success
POST /api/ai/classification/payment-risk
POST /api/ai/recommendations/purchase
POST /api/ai/anomalies

Déploiement
- Utiliser `docker-compose --profile ai up -d` (profil `ai` présent) pour démarrer Ollama + ai-service.
- Appliquer les migrations SQL manuellement via `psql` (draft fourni) ou intégrer Flyway dans un module backend dédié.

Tests
- Unit: Pydantic + business logic tests (pytest) pour chaque endpoint.
- Integration: Testcontainers (Postgres + Keycloak stub + Ollama stub) pour vérifier auth, RLS, et flux RAG.

Roadmap immédiate (livrables)
1. `docs/ai-integration-plan.md` (ce document) — DONE
2. Draft SQL migration — fichier `ai-service/db/migrations/V1__ai_schema.sql` — DONE (draft)
3. Stubs endpoints dans `ai-service` exposant `/api/ai/*` — DONE (non‑intrusif)
4. Tests unitaires minimaux + documentation d'usage — next

Instructions rapides pour dev
1. Démarrer infra minimale:
```
cp .env.example .env
docker-compose up -d postgres keycloak ollama
docker-compose --profile ai up -d ai-service
```
2. Appliquer la migration (draft) manuellement:
```
psql -h localhost -U erp -d erp_db -f ai-service/db/migrations/V1__ai_schema.sql
```
3. Tester l'endpoint chat (JWT requis):
```
POST http://localhost:8000/api/ai/chat
Authorization: Bearer <token>
{ "message": "Bonjour" }
```

Prochaine étape: implémentation d'un indexeur RAG POC et endpoints de prévision (sales/cashflow) avec jeux de données échantillons.
