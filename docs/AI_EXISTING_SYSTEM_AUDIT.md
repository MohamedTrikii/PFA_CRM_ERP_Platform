# AI Platform — Audit Complet du Système Existant

**Date :** 2026-06-08  
**Auditeur :** audit du code source réel  
**Version précédente :** 2026-06-07 (incorrecte — réécrite intégralement)

---

## 1. Résumé Exécutif

Le projet ERP/CRM est **beaucoup plus avancé** que ce que le rapport précédent indiquait. L'intégration IA est **quasi-complète** côté backend (FastAPI). Les points réellement manquants sont ciblés et limités.

| Composant | État réel |
|-----------|-----------|
| FastAPI ai-service (infrastructure) | ✅ Complet et fonctionnel |
| Ollama client (chat + stream + embed) | ✅ Complet |
| RAG (indexer + pgvector search) | ✅ Complet (embedding POC à améliorer) |
| Conversation persistence | ✅ Complet (ai_conversations) |
| Prophet sales forecast | ✅ Complet (trainer + inference) |
| XGBoost classification (quote + paiement) | ✅ Complet (trainer + inference) |
| IsolationForest anomaly detection | ✅ Complet (trainer + inference) |
| Model store (persistence joblib + ai_models) | ✅ Complet |
| Training seed data | ✅ Complet (18 mois, 3 tenants) |
| AI tables DB (pgvector, RLS) | ✅ Appliquées (ai-migrations module) |
| Angular AiAssistantComponent | ✅ Complet (ChatGPT UI multi-tour) |
| Angular AiService | ✅ Complet (5 méthodes typées) |
| Route /ai-assistant | ✅ Câblée et sécurisée (RBAC) |
| Cashflow forecast | ❌ Stub — retourne [] |
| Purchase recommendations | ❌ Stub — retourne [] |
| Streaming SSE côté Angular | ⚠️ Non câblé (endpoint existe, UI non) |
| Indexation multi-sources (factures, SAV) | ⚠️ Seulement devis indexés |
| Embedding qualité | ⚠️ Fallback déterministe (sémantiquement inutile) |
| Bug `/api/v1/ai/chat` | 🐛 Décorateur sur mauvaise fonction |

---

## 2. Architecture Globale Observée

```
Angular 17 (port 4200)
    ↓ OIDC (Keycloak 24, port 8180)
    ↓ JWT Bearer
Spring Cloud Gateway (port 8443)
    ├── /api/v1/identity/**  → identity-service:8082
    ├── /api/v1/crm/**       → crm-service:8083
    ├── /api/v1/sales/**     → sales-service:8084
    ├── /api/v1/inventory/** → inventory-service:8085
    ├── /api/v1/achats/**    → achat-service:8086
    ├── /api/v1/cms/**       → cms-service:8087
    └── /api/v1/ai/**        → ai-service:8000 (FastAPI)
           ↓
       PostgreSQL 16 + pgvector (port 5432)
       Ollama (port 11434) → mistral model
       Keycloak JWKS (pour JWT validation)
```

**Multi-tenant :** tenant_id dans JWT → `TenantContext` (Spring) / `set_config('app.tenant_id')` (FastAPI) → RLS PostgreSQL sur toutes les tables.

---

## 3. Modules Backend Spring Boot

| Module | Port | Tables gérées | État |
|--------|------|---------------|------|
| gateway | 8443 | — | ✅ |
| identity | 8082 | tenants, users, audit_log | ✅ |
| crm | 8083 | prospects, clients, opportunities | ✅ |
| sales | 8084 | catalog_products, devis, devis_lines, commandes, livraisons, factures, encaissements, devis_requests | ✅ |
| inventory | 8085 | stock_locations, stock_items, stock_movements | ✅ |
| achat | 8086 | fournisseurs, bons_commande, bons_reception | ✅ |
| cms | 8087 | tenant_branding, tenant_notices | ✅ |
| ai-migrations | — | ai_documents, ai_embeddings, ai_models, ai_conversations | ✅ |

---

## 4. Schéma de Base de Données — Inventaire Complet

### 4.1 Tables CRM (crm-service)

**prospects**
```sql
id UUID PK, tenant_id UUID, name VARCHAR(255), email, phone, company,
source VARCHAR(32), status VARCHAR(32) [NOUVEAU|QUALIFIE|CONVERTI|PERDU],
notes TEXT, assigned_to UUID, created_at, updated_at
```
- RLS: `current_tenant_id()`, INDEX sur (tenant_id, status)
- Utilisabilité ML: source attribution, conversion funnel, lead scoring

**clients**
```sql
id UUID PK, tenant_id UUID, prospect_id UUID, reference VARCHAR(64),
name VARCHAR(255), email, phone, address JSONB, type VARCHAR(32),
notes TEXT, active BOOLEAN, created_at, updated_at
```
- RLS: `current_tenant_id()`, UNIQUE (tenant_id, reference)
- Utilisabilité ML: segmentation client, historique des achats

**opportunities**
```sql
id UUID PK, tenant_id UUID, client_id UUID, title, description,
status VARCHAR(32) [NOUVELLE|EN_COURS|GAGNEE|PERDUE],
estimated_value NUMERIC(14,2), probability SMALLINT(0-100),
expected_close_date DATE, assigned_to UUID, created_at, updated_at
```
- RLS: INDEX sur (tenant_id, status), (client_id)
- Utilisabilité ML: prédiction de clôture, valeur attendue pondérée

### 4.2 Tables Sales (sales-service)

**catalog_products**
```sql
id UUID PK, tenant_id UUID, reference VARCHAR(64), name VARCHAR(255),
description TEXT, unit_price NUMERIC(12,2), tva_rate NUMERIC(5,2),
unit VARCHAR(32) [unité|m²|ml|kg|h], category VARCHAR(64), active BOOLEAN
```
- UNIQUE (tenant_id, reference)
- Utilisabilité ML: regroupement produits, prévision demande par SKU

**devis** ← Source primaire Prophet + XGBoost
```sql
id UUID PK, tenant_id UUID, client_id UUID, opportunity_id UUID,
reference VARCHAR(64), status VARCHAR(32) [BROUILLON|ENVOYE|ACCEPTE|REFUSE|EXPIRE],
valid_until DATE, discount_pct NUMERIC(5,2), total_ht NUMERIC(14,2),
total_tva NUMERIC(14,2), total_ttc NUMERIC(14,2), notes TEXT
```
- UNIQUE (tenant_id, reference), INDEX sur (tenant_id, status), (client_id)
- **Volume potentiel :** 44 devis/tenant en seed; production ~500-2000/an
- **Qualité ML :** Excellente — statuts clairs, dates, montants précis
- **Features Prophet :** (created_at, total_ttc) → prévision CA mensuel
- **Features XGBoost quote :** (total_ttc, discount_pct, total_ht, valid_days, line_count)

**devis_lines**
```sql
id UUID PK, devis_id UUID, product_id UUID, product_snapshot JSONB,
description TEXT, quantity NUMERIC(10,3), unit_price NUMERIC(12,2),
tva_rate NUMERIC(5,2), discount_pct NUMERIC(5,2), total_ht NUMERIC(14,2), position
```

**commandes**
```sql
id UUID PK, tenant_id UUID, devis_id UUID, reference VARCHAR(64),
status VARCHAR(32) [EN_ATTENTE|CONFIRMEE|EN_COURS|LIVREE|ANNULEE],
delivery_address JSONB, expected_delivery_date DATE, notes TEXT
```

**livraisons + livraison_lines**
```sql
livraisons: id, tenant_id, commande_id, reference, status [PLANIFIEE|EN_COURS|LIVREE|ANNULEE],
            delivery_date DATE, notes TEXT
livraison_lines: id, livraison_id, product_id, product_reference,
                 quantity_ordered NUMERIC(10,3), quantity_delivered NUMERIC(10,3)
```

**factures** ← Source XGBoost payment risk
```sql
id UUID PK, tenant_id UUID, commande_id UUID, client_id UUID,
reference VARCHAR(64), status VARCHAR(32) [BROUILLON|EMISE|PARTIELLEMENT_PAYEE|PAYEE|EN_RETARD|ANNULEE],
issue_date DATE, due_date DATE, total_ht NUMERIC(14,2), total_tva NUMERIC(14,2),
total_ttc NUMERIC(14,2), amount_paid NUMERIC(14,2), notes TEXT
```
- **Features XGBoost payment risk :** (total_ttc, amount_paid/total_ttc, due_date-issue_date)

**encaissements**
```sql
id UUID PK, tenant_id UUID, facture_id UUID, amount NUMERIC(14,2),
payment_date DATE, payment_method VARCHAR(32), reference VARCHAR(64), notes TEXT
```
- Utilisabilité ML: analyse des modes de paiement, délais réels vs prévus

**devis_requests + devis_request_items + devis_attachments**
```sql
devis_requests: id, tenant_id, client_id, client_name/email/phone/address,
                project_type, description, status [NOUVEAU|EN_ETUDE|DEVIS_CREE|REFUSE], notes
devis_request_items: id, request_id, quantity, width_mm, height_mm,
                     profile_series, opening_type, glass_type, color, accessories
```
- Utilisabilité ML: analyse des demandes, caractéristiques des projets, segmentation

### 4.3 Tables Inventory (inventory-service)

**stock_locations**
```sql
id UUID PK, tenant_id UUID, code VARCHAR(32), name VARCHAR(255),
type VARCHAR(32) [WAREHOUSE|SHELF|ZONE|EXTERNAL], description TEXT, active BOOLEAN
```

**stock_items**
```sql
id UUID PK, tenant_id UUID, product_id UUID, product_reference VARCHAR(64),
location_id UUID, quantity NUMERIC(10,3), min_quantity NUMERIC(10,3),
max_quantity NUMERIC(10,3), last_movement_at TIMESTAMPTZ
```
- UNIQUE (tenant_id, product_id, location_id)
- INDEX conditionnel sur stock faible (quantity ≤ min_quantity)

**stock_movements** ← Source IsolationForest anomaly + stock forecast EMA
```sql
id UUID PK, tenant_id UUID, product_id UUID, product_reference VARCHAR(64),
location_id UUID, movement_type VARCHAR(32) [ENTREE|SORTIE|INVENTAIRE|TRANSFERT_SORTIE|TRANSFERT_ENTREE|RETOUR],
quantity NUMERIC(10,3), quantity_before NUMERIC(10,3), quantity_after NUMERIC(10,3),
reference VARCHAR(64), source_type VARCHAR(32), notes TEXT, created_by UUID,
created_at TIMESTAMPTZ, occurred_at TIMESTAMPTZ
```
- INSERT-only (pas de UPDATE/DELETE via RLS)
- **Volume potentiel :** 60 mvts/tenant en seed; production ~20-100/jour
- **Features IForest :** (quantity, quantity_before, quantity_after, movement_type, weekday)

### 4.4 Tables Achats (achat-service)

**fournisseurs**
```sql
id UUID PK, tenant_id UUID, nom VARCHAR(255), code VARCHAR(64),
email, telephone, adresse TEXT, pays VARCHAR(64), actif BOOLEAN, notes TEXT
```

**bons_commande + bons_commande_lignes**
```sql
bons_commande: id, tenant_id, fournisseur_id, reference, status [BROUILLON|ENVOYE|PARTIELLEMENT_RECU|RECU|ANNULE],
               date_commande DATE, date_livraison_prevue DATE,
               total_ht, total_tva, total_ttc NUMERIC(14,2), notes, created_by
bons_commande_lignes: id, bon_commande_id, product_id, designation, unite,
                      quantite, prix_unitaire_ht, tva_rate, total_ht, position
```

**bons_reception + bons_reception_lignes**
```sql
bons_reception: id, tenant_id, bon_commande_id, reference, status [EN_COURS|CONFIRME|ANNULE],
                date_reception DATE, notes, created_by
bons_reception_lignes: id, bon_reception_id, bon_commande_ligne_id, product_id,
                       designation, quantite_commandee, quantite_recue, location_id, position
```
- Utilisabilité ML: délais fournisseurs, taux de conformité des réceptions

### 4.5 Tables Identity (identity-service)

**tenants**
```sql
id UUID PK, slug VARCHAR(63) UNIQUE, name VARCHAR(255), active BOOLEAN
```

**users**
```sql
id UUID PK, tenant_id UUID, keycloak_id VARCHAR(36) UNIQUE,
email VARCHAR(255), display_name VARCHAR(255),
role VARCHAR(32) [SUPER_ADMIN|EMPLOYER|EMPLOYEE|CLIENT],
employee_function VARCHAR(32) [SALES|WAREHOUSE|BUYER|ACCOUNTANT|SUPPORT|MANAGER],
active BOOLEAN
```

**audit_log**
```sql
id BIGSERIAL PK, tenant_id UUID, actor_id UUID, action VARCHAR(64),
entity_type VARCHAR(64), entity_id TEXT, payload JSONB, ip_address VARCHAR(45),
prev_hash TEXT, hash TEXT, created_at TIMESTAMPTZ
```
- Hash chain maintenu par trigger PostgreSQL `audit_log_compute_hash()`

### 4.6 Tables CMS (cms-service)

**tenant_branding**
```sql
id UUID PK, tenant_id UUID UNIQUE, company_name, tagline, logoFid, faviconFid,
primaryColor, secondaryColor, fontFamily, customCss TEXT
```

**tenant_notices**
```sql
id UUID PK, tenant_id UUID, title, body TEXT, severity [INFO|WARNING|ERROR],
active BOOLEAN, startsAt TIMESTAMPTZ, endsAt TIMESTAMPTZ
```

### 4.7 Tables AI (ai-migrations module)

**ai_documents**
```sql
id UUID PK, tenant_id UUID NOT NULL, source_type VARCHAR(64) [DEVIS|FACTURE|COMMANDE|SAV|DOC],
source_id UUID, title VARCHAR(512), content TEXT NOT NULL, metadata JSONB, created_at TIMESTAMPTZ
```
- RLS: `current_tenant_id()`, INDEX (tenant_id, created_at DESC)

**ai_embeddings** ← pgvector
```sql
id UUID PK, document_id UUID → ai_documents, tenant_id UUID,
embedding vector(1536), model_name VARCHAR(128), created_at TIMESTAMPTZ
```
- RLS: `current_tenant_id()`
- INDEX ivfflat (embedding) WITH (lists=100) — ANN search
- ⚠️ **Dimension 1536 fixée** — incompatible avec mistral embed (4096 dims)

**ai_models**
```sql
id UUID PK, tenant_id UUID, name VARCHAR(128), version VARCHAR(32),
artifact_path TEXT, metadata JSONB, created_at TIMESTAMPTZ
```
- RLS: `current_tenant_id()`
- Utilisé par `model_store.py` pour la persistance joblib

**ai_conversations**
```sql
id UUID PK, tenant_id UUID NOT NULL, user_id UUID,
messages JSONB NOT NULL, metadata JSONB, created_at TIMESTAMPTZ
```
- RLS: `current_tenant_id()`
- messages = tableau JSON: [{role, content}, ...]

---

## 5. Service IA FastAPI — Analyse Détaillée

### 5.1 Fichiers existants

```
ai-service/
├── app/
│   ├── main.py          ← Application FastAPI + tous les endpoints
│   ├── auth.py          ← Vérification JWT Keycloak JWKS
│   ├── db.py            ← asyncpg + stamping RLS (set_config app.tenant_id)
│   ├── ollama.py        ← Client Ollama (chat, stream, embed, list_models)
│   ├── conversation.py  ← CRUD ai_conversations (create, get, append)
│   ├── indexer.py       ← RAG: indexer devis → ai_documents/ai_embeddings
│   ├── forecast.py      ← EMA stock-out risk (heuristique, sans ML)
│   └── pricing.py       ← Suggestion prix aluminium (heuristique, sans ML)
├── ml/
│   ├── prophet_trainer.py  ← Entraînement Prophet sur devis ACCEPTE
│   ├── xgboost_trainer.py  ← XGBoost quote acceptance + payment risk
│   ├── anomaly_trainer.py  ← IsolationForest sur stock_movements
│   ├── model_inference.py  ← Inférence pour les 4 modèles
│   └── model_store.py      ← Persistence joblib + registry ai_models
├── db/migrations/V1__ai_schema.sql  ← Draft (ai-migrations module utilisé à la place)
├── seed_training_data.py   ← Seed 3 tenants × 18 mois de données ML
├── seed_ai_data.py         ← Seed documents/embeddings dans ai_documents
├── run_training.py         ← Script de lancement entraînement
├── Dockerfile
└── requirements.txt
```

### 5.2 Endpoints API — Inventaire Complet

#### Santé et Statut
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/health` | GET | Aucune | ✅ Fonctionnel |
| `/api/v1/ai/model-status` | GET | STAFF | ✅ Fonctionnel (requête Ollama /api/tags) |

#### Pricing (heuristique — sans ML, toujours disponible)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/suggest-price` | POST | STAFF | ✅ Fonctionnel |

#### Forecast Stock (heuristique EMA — sans ML)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/stock-forecast` | POST | STAFF | ✅ Fonctionnel |
| `/api/ai/forecast/stock` | POST | ANY | ✅ Alias fonctionnel |

#### Chat / LLM (Ollama requis)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/chat` | POST | STAFF | 🐛 **BUG** — décorateur sur `_persist_chat_conversation` |
| `/api/v1/ai/chat/stream` | POST | STAFF | ✅ Fonctionnel (SSE) |
| `/api/ai/chat/stream` | POST | ANY | ✅ Alias fonctionnel |
| `/api/ai/chat` | POST | ANY | ✅ Alias fonctionnel (appel Ollama direct) |

#### Assistant RAG (Ollama + pgvector)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/assistant` | POST | ANY | ✅ Fonctionnel (RAG + LLM) |
| `/api/v1/ai/assistant-test` | POST | Aucune | ✅ Dev only (no-auth) |
| `/api/v1/ai/documents/search` | POST | ANY | ✅ Fonctionnel (pgvector similarity) |
| `/api/v1/ai/retrieval` | POST | ANY | ✅ Fonctionnel |
| `/api/ai/retrieval` | POST | ANY | ✅ Alias |
| `/api/ai/retrieval_noauth` | POST | Aucune | ⚠️ Dev only (DEV_AUTH_BYPASS) |

#### Forecast ML (Prophet — modèle entraîné requis)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/ai/forecast/sales` | POST | ANY | ✅ Délègue à `model_inference.predict_sales_forecast()` |
| `/api/ai/forecast/cashflow` | POST | ANY | ❌ **STUB** — retourne `predictions: []` |

#### Classification ML (XGBoost — modèle entraîné requis)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/ai/classification/quote-success` | POST | ANY | ✅ Délègue à `model_inference.predict_quote_acceptance()` |
| `/api/ai/classification/payment-risk` | POST | ANY | ✅ Délègue à `model_inference.predict_payment_risk()` |

#### Anomalies ML (IsolationForest — modèle entraîné requis)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/ai/anomalies` | POST | ANY | ✅ Délègue à `model_inference.detect_stock_anomalies()` |

#### Recommandations
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/ai/recommendations/purchase` | POST | ANY | ❌ **STUB** — retourne `recommendations: []` |

#### Indexation RAG
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/ai/index/devis` | POST | SUPER_ADMIN | ✅ Déclenche `indexer.index_devis()` en arrière-plan |

#### Entraînement (SUPER_ADMIN uniquement)
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/train/forecast` | POST | SUPER_ADMIN | ✅ Lance `prophet_trainer` async |
| `/api/v1/ai/train/classifier/quote` | POST | SUPER_ADMIN | ✅ Lance `xgboost_trainer` async |
| `/api/v1/ai/train/classifier/payment-risk` | POST | SUPER_ADMIN | ✅ Lance `xgboost_trainer` async |
| `/api/v1/ai/train/anomaly/stock` | POST | SUPER_ADMIN | ✅ Lance `anomaly_trainer` async |
| `/api/v1/ai/train/all` | POST | SUPER_ADMIN | ✅ Lance tous les trainers en parallèle |
| `/api/v1/ai/train/status/{task_id}` | GET | SUPER_ADMIN | ✅ Statut d'une tâche |
| `/api/v1/ai/train/tasks` | GET | SUPER_ADMIN | ✅ Liste des tâches par tenant |

#### Registre Modèles
| Endpoint | Méthode | Auth | État |
|----------|---------|------|------|
| `/api/v1/ai/models` | GET | ANY | ✅ Liste depuis ai_models |
| `/api/v1/ai/models/{name}/latest` | GET | ANY | ✅ Dernier modèle par nom |

### 5.3 Authentification (auth.py)

- Récupère JWKS depuis Keycloak: `{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs`
- Décode JWT avec `python-jose` (RS256, `verify_aud=False`)
- Extrait `realm_access.roles` → `require_roles(*roles)` factory
- Extrait `tenant_id`, `sub`, `tenantId` → `resolve_tenant()`
- Cache JWKS en mémoire (pas de rafraîchissement automatique — rotation de clé non couverte)

### 5.4 Connexion DB (db.py)

- asyncpg (pas SQLAlchemy) — connexion par requête (pas de pool)
- Stamp RLS: `SET set_config('app.tenant_id', $1, FALSE)` pour chaque connexion
- **Risque :** création d'une connexion par requête → non-optimal en production; utiliser `asyncpg.Pool`

### 5.5 ML Trainers

#### prophet_trainer.py
- Source: `devis WHERE status='ACCEPTE'` → features `(created_at, total_ttc)`
- Modèle: Prophet (yearly_seasonality=True, weekly=False, daily=False)
- Minimum: 6 devis ACCEPTE par tenant
- Seed data fournit: 22 ACCEPTE/tenant → suffisant

#### xgboost_trainer.py
- **quote_acceptance:** `devis WHERE status IN ('ACCEPTE','REFUSE')` → features (total_ttc, discount_pct, total_ht, valid_days, line_count)
- **payment_risk:** `factures WHERE due_date IS NOT NULL AND total_ttc > 0` → features (total_ttc, payment_ratio, days_to_due)
- Minimums: 20 examples labellisés; stratified split 80/20
- Seed data fournit: 35 devis labellisés + 28 factures/tenant → suffisant

#### anomaly_trainer.py
- Source: `stock_movements` → features (quantity, quantity_before, quantity_after, movement_type_int, weekday)
- Modèle: IsolationForest (n=100, contamination=0.01)
- Minimum: 50 mouvements
- Seed data fournit: 60 mouvements/tenant avec ~4 anomalies injectées → suffisant

#### model_store.py
- Persistence: joblib vers `ai-service/models/{name}_{tenant}_{version}.joblib`
- Registry: `ai_models` table (tenant_id, name, version, artifact_path, metadata)
- ⚠️ **Risque :** fichiers joblib sur filesystem container → perdus au redémarrage; à migrer vers SeaweedFS

### 5.6 Ollama Client (ollama.py)

- OLLAMA_URL: `http://ollama:11434` (configurable via env)
- OLLAMA_MODEL: `mistral` (configurable via env)
- System prompt: ERP aluminum joinery, réponse dans la langue de l'utilisateur
- Méthodes: `chat()`, `stream_chat()`, `list_models()`, `is_model_available()`, `embed()`
- Streaming: SSE via `aiter_lines()`, fallback vers `chat()` si streaming non supporté
- Embed: essaie `/api/embeddings` puis `/api/embed` — retourne None en cas d'échec

---

## 6. Frontend Angular — Analyse Détaillée

### 6.1 AiAssistantComponent (`/ai-assistant`)

**Fichier :** [frontend/src/app/features/ai-assistant/ai-assistant.component.ts](../frontend/src/app/features/ai-assistant/ai-assistant.component.ts)

**Fonctionnalités implémentées :**
- ✅ Interface type ChatGPT (bulles utilisateur/bot)
- ✅ Quick prompts (4 suggestions au démarrage)
- ✅ Indicateur de chargement (typing indicator)
- ✅ Gestion multi-tour (`conversationId` persisté)
- ✅ Affichage des sources RAG (`appendSources()`)
- ✅ Bouton effacer conversation
- ✅ Auto-scroll en bas
- ✅ Shift+Entrée pour nouvelle ligne, Entrée pour envoyer
- ✅ Gestion d'erreur (503 → message Ollama non disponible)
- ⚠️ Utilise `/api/v1/ai/assistant` (non-streaming) — endpoint SSE existe mais non câblé

**Route :** `/ai-assistant` — visible SUPER_ADMIN, EMPLOYER, EMPLOYEE

### 6.2 AiService (`core/services/ai.service.ts`)

**Fichier :** [frontend/src/app/core/services/ai.service.ts](../frontend/src/app/core/services/ai.service.ts)

```typescript
suggestPrice(req)     → POST /api/v1/ai/suggest-price
stockForecast(...)    → POST /api/v1/ai/stock-forecast
chat(req)             → POST /api/v1/ai/chat
assistant(req)        → POST /api/v1/ai/assistant
modelStatus()         → GET  /api/v1/ai/model-status
```

**Manquant dans AiService :**
- Aucune méthode pour le streaming SSE
- Aucune méthode pour les endpoints forecast/classification/anomaly de la Phase 10
- Aucune méthode pour l'historique des conversations

### 6.3 PriceSuggestionDialogComponent

**Fichier :** [frontend/src/app/features/sales/devis/price-suggestion-dialog.component.ts](../frontend/src/app/features/sales/devis/price-suggestion-dialog.component.ts)

- ✅ Dialogue Material avec sélecteurs profil/vitrage/ouvrant
- ✅ Affichage breakdown (surface, prix base, facteur vitrage, surcoût ouvrant)
- ✅ Barre de confiance colorée
- ✅ Bouton "Utiliser ce prix" → ferme le dialogue avec le résultat

### 6.4 Routes Angular

```typescript
'/ai-assistant'   → AiAssistantComponent  [SUPER_ADMIN|EMPLOYER|EMPLOYEE]
```

Aucun composant dashboard IA n'existe encore (`AiDashboardComponent` absent).

---

## 7. Infrastructure IA

### 7.1 Docker Compose

```yaml
# Profil "ai" requis: docker-compose --profile ai up -d
ollama:
  image: ollama/ollama:latest
  port: 11434
  volumes: ollama_data
  OLLAMA_KEEP_ALIVE: 24h

ai-service:
  build: ./ai-service/Dockerfile
  port: 8000
  env: DATABASE_URL, OLLAMA_URL, OLLAMA_MODEL, KEYCLOAK_URL, KEYCLOAK_REALM
  depends_on: postgres (healthy), ollama (healthy), keycloak (healthy)
```

### 7.2 PostgreSQL pgvector

- Image: `pgvector/pgvector:pg16`
- Extension `vector` installée via `infra/postgres/init.sql`
- Index `ai_embeddings`: `ivfflat (embedding) WITH (lists=100)` — **dimension 1536 fixée**
- ⚠️ La dimension 1536 est celle d'OpenAI ada-002. Mistral via Ollama retourne 4096 dims → conflit potentiel

### 7.3 Données d'Entraînement (seed_training_data.py)

Seed réaliste 18 mois pour 3 tenants:

| Tenant | Slug | Couleur |
|--------|------|---------|
| `00000000-…-0002` | demo-tenant | #1976D2 |
| `00000000-…-0003` | aluminium-maroc | #FF6F00 |
| `00000000-…-0004` | vitrerie-atlas | #2E7D32 |

**Par tenant :**
- 10 produits catalogue
- 8 prospects + 10 clients + 6 opportunités
- 44 devis (22 ACCEPTE, 13 REFUSE, 5 ENVOYE, 3 EXPIRE, 1 BROUILLON)
- 22 commandes + 18 livraisons
- 28 factures avec due_date (12 PAYEE, 6 PARTIELLEMENT, 5 EN_RETARD, 3 EMISE, 2 ANNULEE)
- Encaissements proportionnels
- 5 fournisseurs + 10 bons_commande + bons_réception
- 3 emplacements + 10 stock_items + 60 mouvements (avec ~4 anomalies injectées)
- CMS: branding + 3 annonces

**Seuils ML validés :**
- Prophet: 22 ≥ 6 ✅
- XGBoost quote: 35 labellisés ≥ 20 ✅
- XGBoost payment: 28 factures ≥ 20 ✅
- IForest: 60 mouvements ≥ 50 ✅

---

## 8. Bugs Identifiés

### Bug Critique 🐛 — `/api/v1/ai/chat` non enregistré

**Fichier :** [ai-service/app/main.py:405-486](../ai-service/app/main.py)

```python
@app.post("/api/v1/ai/chat", response_model=ChatResponse, ...)
async def _persist_chat_conversation(       # ← DÉCORATEUR SUR LA MAUVAISE FONCTION
    tenant_id: str, user_id: Optional[str], ...
) -> str:                                   # ← retourne str, pas ChatResponse
    ...

async def chat_endpoint(req: ChatRequest, _user: StaffUser):  # ← NON ENREGISTRÉE
    ...
```

**Impact :** `POST /api/v1/ai/chat` retourne une erreur 422 (mauvais schéma de requête).  
**Solution :** Déplacer le décorateur `@app.post(...)` sur `chat_endpoint`.  
**Contournement existant :** Le frontend utilise `/api/v1/ai/assistant` (pas `/api/v1/ai/chat`). `/api/ai/chat` (alias) fonctionne correctement.

### Risque — Dimension embedding

**Fichier :** [ai-service/db/migrations/V1__ai_schema.sql](../ai-service/db/migrations/V1__ai_schema.sql)

`embedding vector(1536)` — dimension OpenAI.  
Mistral via Ollama embed retourne **4096 dimensions**.  
Si Ollama embed réussit, l'insertion échouera avec "vector dimension mismatch".  
L'indexer retombe sur `deterministic_embedding(dim=1536)` — sémantiquement invalide.

**Solution :** Soit utiliser un modèle d'embedding dédié (nomic-embed-text retourne 768 dims), soit recréer la colonne en `vector(4096)` et adapter l'index.

### Risque — JWKS cache sans expiration

**Fichier :** [ai-service/app/auth.py:17-23](../ai-service/app/auth.py)

`_jwks_cache` global jamais invalidé → rotation de clé Keycloak non couverte.  
**Solution :** TTL de 1h ou rafraîchissement sur erreur 401.

### Risque — Pas de pool asyncpg

**Fichier :** [ai-service/app/db.py](../ai-service/app/db.py)

Une connexion créée et fermée par requête (pas de pool).  
**Solution :** `asyncpg.create_pool()` à l'initialisation de l'app.

### Risque — Artifacts ML sur filesystem container

**Fichier :** [ai-service/ml/model_store.py:11-12](../ai-service/ml/model_store.py)

`MODEL_DIR = ROOT_DIR / "models"` → perdus au redémarrage du container.  
**Solution :** Migrer vers SeaweedFS (déjà dans le stack) ou volume Docker dédié.

### Risque — DEV_AUTH_BYPASS endpoint

**Fichier :** [ai-service/app/main.py:1058-1082](../ai-service/app/main.py)

`/api/ai/retrieval_noauth` bypass l'authentification si `DEV_AUTH_BYPASS=true`.  
docker-compose.yml a `DEV_AUTH_BYPASS: "false"` → OK actuellement.  
**À vérifier :** Ne jamais activer en production.

---

## 9. Ce Qui Fonctionne (prêt à utiliser)

| Fonctionnalité | Endpoint | Condition |
|----------------|----------|-----------|
| Suggestion de prix aluminium | `POST /api/v1/ai/suggest-price` | Toujours disponible (heuristique) |
| Forecast stock-out EMA | `POST /api/v1/ai/stock-forecast` | Toujours disponible (heuristique) |
| Chat Mistral (non-streaming) | `POST /api/ai/chat` | Ollama + mistral disponibles |
| Chat Mistral streaming SSE | `POST /api/v1/ai/chat/stream` | Ollama + mistral disponibles |
| Assistant RAG multi-tour | `POST /api/v1/ai/assistant` | Ollama + données indexées |
| Recherche documents pgvector | `POST /api/v1/ai/documents/search` | Documents indexés |
| Indexation devis | `POST /api/ai/index/devis` | SUPER_ADMIN JWT |
| Entraînement Prophet | `POST /api/v1/ai/train/forecast` | ≥6 devis ACCEPTE |
| Entraînement XGBoost quote | `POST /api/v1/ai/train/classifier/quote` | ≥20 devis labellisés |
| Entraînement XGBoost paiement | `POST /api/v1/ai/train/classifier/payment-risk` | ≥20 factures |
| Entraînement IForest anomaly | `POST /api/v1/ai/train/anomaly/stock` | ≥50 mouvements |
| Forecast ventes Prophet | `POST /api/ai/forecast/sales` | Modèle entraîné |
| Classification quote | `POST /api/ai/classification/quote-success` | Modèle entraîné |
| Classification paiement | `POST /api/ai/classification/payment-risk` | Modèle entraîné |
| Détection anomalies stock | `POST /api/ai/anomalies` | Modèle entraîné |
| Interface chat Angular | `/ai-assistant` (route) | Tous services IA up |
| Dialogue suggestion prix | DevisListComponent | Service IA up |
| Persistance conversations | ai_conversations table | DB + auth OK |

---

## 10. Ce Qui est Incomplet ou Manquant

### Stubs purs (retournent données vides)
1. `POST /api/ai/forecast/cashflow` → `predictions: []`
2. `POST /api/ai/recommendations/purchase` → `recommendations: []`

### Fonctionnalités partiellement implémentées
3. **Embedding qualité :** `indexer.py` utilise `deterministic_embedding()` (hash SHA-256 → RNG) comme fallback. Les recherches pgvector retournent des résultats mais sans pertinence sémantique.
4. **Indexation partielle :** Seuls les `devis` sont indexables via `/api/ai/index/devis`. Les `factures`, `commandes`, `SAV`, documents internes ne sont pas indexés.
5. **Streaming Angular :** L'endpoint SSE `/api/v1/ai/chat/stream` existe et fonctionne, mais `AiAssistantComponent` utilise l'endpoint non-streaming `/api/v1/ai/assistant`.
6. **Historique conversations côté UI :** L'AI component n'affiche pas les conversations précédentes (seulement la session courante).

### Composants Angular manquants
7. **AiDashboardComponent** : aucun composant de dashboard analytique IA (forecasting tiles, graphiques Prophet, scores de risque).
8. **Méthodes AiService manquantes :** pas de méthodes pour `forecast/sales`, `forecast/cashflow`, `classification/*`, `anomalies`, `train/*`, historique conversations.

### Infrastructure
9. **Pool asyncpg** non configuré — à ajouter pour la performance.
10. **JWKS cache** sans TTL — risque lors de rotation de clé.
11. **Artifacts ML** sur filesystem container — à persister sur SeaweedFS ou volume.

---

## 11. Risques Techniques

| Risque | Sévérité | Probabilité | Mitigation |
|--------|----------|-------------|------------|
| Dimension embedding mismatch (1536 vs 4096) | Haute | Haute | Utiliser nomic-embed-text (768) ou recréer colonne |
| Bug `/api/v1/ai/chat` non enregistré | Haute | Certaine | Correction 5 lignes dans main.py |
| Artifacts ML perdus au redémarrage | Moyenne | Certaine | Monter volume Docker ou SeaweedFS |
| JWKS cache sans TTL | Moyenne | Basse | Ajouter expiration 1h |
| Pas de pool asyncpg | Moyenne | Certaine | Refactoring db.py (lifespan event) |
| DEV_AUTH_BYPASS en prod | Critique | Basse | Vérifier config prod |
| Déterministe embedding (RAG inutile) | Haute | Certaine | Intégrer real embedder |

---

## 12. Points d'Intégration Recommandés

### Pour la Phase 2 (RAG & Chat)
1. **Corriger le bug `/api/v1/ai/chat`** — déplacer décorateur
2. **Résoudre la dimension embedding** — utiliser `nomic-embed-text` (768 dims) ou configurer un embedding service séparé
3. **Câbler SSE dans Angular** — `EventSource` ou `fetch + ReadableStream` dans `AiService`
4. **Ajouter indexation multi-sources** — étendre `indexer.py` aux `factures`, `commandes`, `bons_commande`
5. **Ajouter pool asyncpg** — via `lifespan` FastAPI

### Pour la Phase 3 (Dashboard analytique)
6. **Créer `AiDashboardComponent`** — tiles forecast, graphiques ApexCharts/Chart.js, scores risque
7. **Étendre `AiService`** — méthodes pour tous les endpoints forecast/classification/anomaly
8. **Ajouter une route `/ai-dashboard`** dans shell.routes.ts
9. **Exécuter `seed_training_data.py`** — puis déclencher `POST /api/v1/ai/train/all`

### Pour la Phase 4 (Assistant ERP contextualisé)
10. **Contextualisation métier** — enrichir le system prompt Ollama avec données temps-réel (stock, devis ouverts, factures en retard) avant chaque requête
11. **Conversation list endpoint** — ajouter `GET /api/v1/ai/conversations` pour l'historique UI
12. **Actions ERP depuis le chat** — connexion avec les APIs Spring Boot depuis le chatbot

---

## 13. Ce Qui Doit Être Réutilisé (ne pas recréer)

| Composant | Localisation | Réutiliser tel quel |
|-----------|--------------|---------------------|
| app/auth.py | ai-service | ✅ Ajouter TTL JWKS |
| app/db.py | ai-service | ✅ Ajouter pool |
| app/ollama.py | ai-service | ✅ Complet |
| app/conversation.py | ai-service | ✅ Complet |
| ml/* (tous les trainers) | ai-service | ✅ Complet |
| ml/model_store.py | ai-service | ✅ Complet |
| ml/model_inference.py | ai-service | ✅ Complet |
| AiAssistantComponent | frontend | ✅ Améliorer streaming |
| AiService | frontend | ✅ Étendre les méthodes |
| PriceSuggestionDialogComponent | frontend | ✅ Complet |
| ai_documents/ai_embeddings tables | DB | ✅ Attention dimension |
| ai_models/ai_conversations tables | DB | ✅ Complet |
| seed_training_data.py | ai-service | ✅ Exécuter en priorité |
| Docker compose ollama + ai-service | — | ✅ Profil "ai" |

---

*Audit produit par analyse statique complète du code source — 2026-06-08*
