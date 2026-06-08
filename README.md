# ERP Platform

Multi-tenant SaaS ERP/CRM – 100% free & open-source stack.

## Quick start (Phase 0)

```bash
# 1. Clone & configure
cp .env.example .env
# Edit .env with your passwords

# 2. Start all infra services
docker-compose up -d postgres valkey keycloak seaweed-master seaweed-volume seaweed-filer rabbitmq prometheus grafana

# 3. Wait for Keycloak to be healthy (~60s), then start services
docker-compose up -d identity-service ai-service gateway

# 4. Verify
curl http://localhost:8082/api/v1/identity/health   # {"status":"UP","service":"identity-service"}
curl http://localhost:8000/api/v1/ai/health          # {"status":"UP","service":"ai-service"}

# 5. Frontend (dev mode, no Docker)
cd frontend && npm install && npm start              # http://localhost:4200

# 6. Mobile
cd mobile && flutter pub get && flutter run
```

## Service map

| Service | URL | Notes |
|---|---|---|
| Keycloak | http://localhost:8080 | admin / admin_secret |
| Gateway | http://localhost:8443 | JWT-secured entry point |
| Identity API | http://localhost:8082 | /api/v1/identity |
| AI Service | http://localhost:8000 | /api/v1/ai/docs |
| Prometheus | http://localhost:9090 | |
| Grafana | http://localhost:3001 | admin / admin_secret |
| RabbitMQ UI | http://localhost:15672 | erp / erp_secret |
| SeaweedFS | http://localhost:9333 | Master node |

## Stack

| Layer | Technology |
|---|---|
| Web | Angular 17 + Material + Tailwind + NgRx |
| Mobile | Flutter + Riverpod + Drift (offline) |
| Backend | Spring Boot 3.3 + Spring Cloud Gateway |
| Auth | Keycloak 24 |
| AI/ML | FastAPI + scikit-learn + XGBoost + Prophet |
| DB | PostgreSQL 16 + pgvector |
| Cache | Valkey 8 (BSD-3) |
| Files | SeaweedFS (Apache 2.0) |
| Messaging | RabbitMQ 3.13 |
| Monitoring | Prometheus + Grafana 9.5 |

## Build order

Phase 0 → Scaffold ✅  
Phase 1 → Multi-tenancy + Auth  
Phase 2 → Identity & RBAC  
Phase 3 → Core modules (CRM/Sales/Stock)  
Phase 4 → Quote request + Customer portal  
Phase 5 → Dashboards + AI tiles  
Phase 6 → Mobile (Flutter)  
Phase 7 → Achats + Finance  
Phase 8 → White-label CMS  
Phase 9 → CI/CD + Hardening  

See [PROGRESS.md](PROGRESS.md) and [TODO.md](TODO.md) for current status.
