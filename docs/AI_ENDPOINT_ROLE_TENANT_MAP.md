# AI Endpoint → Role → Tenant Source Mapping

This file enumerates AI-related HTTP endpoints, the required roles/authorization, and the authoritative tenant source to use (JWT claim or gateway header). Use this as a reference for access reviews and integration tests.

## ai-service (FastAPI)

- **GET /api/v1/ai/health**
  - Roles: none (public)
  - Tenant source: none

- **POST /api/v1/ai/retrieval**
  - Roles: any authenticated user (token required)
  - Tenant source: JWT claim `tenant_id` (preferred) OR `X-Tenant-Id` injected by gateway
  - Notes: server now stamps asyncpg session with `set_config('app.tenant_id', ...)` before queries to enforce RLS

- **POST /api/v1/ai/retrieval_noauth**
  - Roles: none (dev-only)
  - Tenant source: previously accepted caller-supplied tenant; now session stamping occurs but endpoint should be removed or restricted in production

- **POST /api/v1/ai/index/devis**
  - Roles: `SUPER_ADMIN` only
  - Tenant source: JWT `tenant_id` or `X-Tenant-Id` header
  - Notes: indexer sets session tenant before inserts so RLS applies on `ai_documents`

- **POST /api/v1/ai/suggest-price**
  - Roles: `SUPER_ADMIN`, `EMPLOYER`, `EMPLOYEE`
  - Tenant source: JWT `tenant_id` or `X-Tenant-Id` header

- **POST /api/v1/ai/stock-forecast**
  - Roles: `SUPER_ADMIN`, `EMPLOYER`, `EMPLOYEE`
  - Tenant source: JWT `tenant_id` or `X-Tenant-Id` header

- **POST /api/v1/ai/chat**, **POST /api/ai/chat**
  - Roles: authenticated users (module depends)
  - Tenant source: none for DB (conversation/context only); use token for user identity

- **GET /api/v1/ai/model-status**
  - Roles: `SUPER_ADMIN`, `EMPLOYER`, `EMPLOYEE`
  - Tenant source: none


## Java backend (gateway + microservices)

Most Java endpoints enforce roles via Spring Security `@PreAuthorize` annotations and derive tenant context from the JWT + gateway header flow:

- Tenant propagation: gateway extracts `tenant_id` from validated JWT and injects `X-Tenant-Id` for downstream services. Backend services rely on `KeycloakJwtAuthConverter` + `TenantDataSourceConfig` to map the JWT to Spring authorities and to stamp DB connections with `app.tenant_id`.

Examples:
- `backend/sales` controllers (examples):
  - [backend/sales/src/main/java/com/erp/sales/api/ProductController.java](backend/sales/src/main/java/com/erp/sales/api/ProductController.java) — `@PreAuthorize` uses `SUPER_ADMIN/EMPLOYER/EMPLOYEE/CLIENT` patterns on specific endpoints
  - [backend/sales/src/main/java/com/erp/sales/api/DevisRequestController.java](backend/sales/src/main/java/com/erp/sales/api/DevisRequestController.java) — public submit routes exist; admin routes use `@PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")`

- `backend/common` tenant wiring:
  - [backend/common/src/main/java/com/erp/common/config/TenantDataSourceConfig.java](backend/common/src/main/java/com/erp/common/config/TenantDataSourceConfig.java) — configures per-connection `set_config('app.tenant_id', ...)`
  - [backend/common/src/main/java/com/erp/common/security/KeycloakJwtAuthConverter.java](backend/common/src/main/java/com/erp/common/security/KeycloakJwtAuthConverter.java) — maps `realm_access.roles` to `GrantedAuthority` and populates tenant context


## Gateway

- Route: `ai-service`
  - Config: [backend/gateway/src/main/resources/application.yml](backend/gateway/src/main/resources/application.yml)
  - Filter: `TenantHeaderFilter` now applied so `X-Tenant-Id` is injected for `/api/v1/ai/**` requests


## Recommendations for verification tests

- Integration tests should: request `/api/v1/ai/retrieval` with JWTs for two different tenants and assert that results are tenant-scoped (no cross-tenant leakage).
- Tests should confirm that `ai_service` DB sessions show `set_config('app.tenant_id', ...)` executed prior to SELECT/INSERT statements (enable query logging or use a test helper).
- Remove or conditionally gate `retrieval_noauth` from shared environments; if kept, restrict to local-only overrides outside repo.

---
Keep this file in sync with `docs/AI_EXISTING_SYSTEM_AUDIT.md`.

## Expanded Java Controllers: endpoint → role excerpts

Below are Java controller files that include `@PreAuthorize` role checks. For each file the primary role patterns observed are listed; the gateway provides tenant propagation via `X-Tenant-Id` and backend services stamp DB sessions from the JWT/header.

- [backend/cms/src/main/java/com/erp/cms/api/NoticeController.java](backend/cms/src/main/java/com/erp/cms/api/NoticeController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER')` on management endpoints
- [backend/cms/src/main/java/com/erp/cms/api/BrandingController.java](backend/cms/src/main/java/com/erp/cms/api/BrandingController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER')`
- [backend/identity/src/main/java/com/erp/identity/api/UserController.java](backend/identity/src/main/java/com/erp/identity/api/UserController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`, management actions `hasAnyRole('SUPER_ADMIN','EMPLOYER')`, privileged `hasRole('SUPER_ADMIN')`
- [backend/identity/src/main/java/com/erp/identity/api/TenantController.java](backend/identity/src/main/java/com/erp/identity/api/TenantController.java)
  - Roles: `hasRole('SUPER_ADMIN')` (controller-level)
- [backend/identity/src/main/java/com/erp/identity/api/PlatformStatsController.java](backend/identity/src/main/java/com/erp/identity/api/PlatformStatsController.java)
  - Roles: `hasRole('SUPER_ADMIN')`
- [backend/identity/src/main/java/com/erp/identity/api/AuditController.java](backend/identity/src/main/java/com/erp/identity/api/AuditController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER')`, some endpoints `hasRole('SUPER_ADMIN')`
- [backend/sales/src/main/java/com/erp/sales/api/ProductController.java](backend/sales/src/main/java/com/erp/sales/api/ProductController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`, some endpoints include `CLIENT`
- [backend/sales/src/main/java/com/erp/sales/api/PortalController.java](backend/sales/src/main/java/com/erp/sales/api/PortalController.java)
  - Roles: `isAuthenticated()`
- [backend/crm/src/main/java/com/erp/crm/api/OpportunityController.java](backend/crm/src/main/java/com/erp/crm/api/OpportunityController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`
- [backend/sales/src/main/java/com/erp/sales/api/LivraisonController.java](backend/sales/src/main/java/com/erp/sales/api/LivraisonController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')` and management `hasAnyRole('SUPER_ADMIN','EMPLOYER')`
- [backend/crm/src/main/java/com/erp/crm/api/ClientController.java](backend/crm/src/main/java/com/erp/crm/api/ClientController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`
- [backend/sales/src/main/java/com/erp/sales/api/FactureController.java](backend/sales/src/main/java/com/erp/sales/api/FactureController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`; some management endpoints restrict to `SUPER_ADMIN`/`EMPLOYER`
- [backend/sales/src/main/java/com/erp/sales/api/DashboardController.java](backend/sales/src/main/java/com/erp/sales/api/DashboardController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER')`, some `hasRole('CLIENT')`
- [backend/sales/src/main/java/com/erp/sales/api/DevisRequestController.java](backend/sales/src/main/java/com/erp/sales/api/DevisRequestController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')` for admin endpoints; submit endpoints allow `CLIENT` in certain operations
- [backend/sales/src/main/java/com/erp/sales/api/AttachmentController.java](backend/sales/src/main/java/com/erp/sales/api/AttachmentController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT')` for retrieval; upload/management limited to `SUPER_ADMIN`/`EMPLOYER`
- [backend/sales/src/main/java/com/erp/sales/api/DevisController.java](backend/sales/src/main/java/com/erp/sales/api/DevisController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`
- [backend/inventory/src/main/java/com/erp/inventory/api/StockController.java](backend/inventory/src/main/java/com/erp/inventory/api/StockController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`, management endpoints `hasAnyRole('SUPER_ADMIN','EMPLOYER')`
- [backend/achat/src/main/java/com/erp/achat/api/BonCommandeController.java](backend/achat/src/main/java/com/erp/achat/api/BonCommandeController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')` with some manager-only actions
- [backend/achat/src/main/java/com/erp/achat/api/FournisseurController.java](backend/achat/src/main/java/com/erp/achat/api/FournisseurController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')`, some endpoints `hasRole('SUPER_ADMIN')`
- [backend/achat/src/main/java/com/erp/achat/api/BonReceptionController.java](backend/achat/src/main/java/com/erp/achat/api/BonReceptionController.java)
  - Roles: `hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')` and manager-only on some routes

