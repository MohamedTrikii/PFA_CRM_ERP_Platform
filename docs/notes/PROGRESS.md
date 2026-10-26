# ERP Platform – Progress Tracker

## Phase 0 – Scaffold & Infra ✅ DONE

**DoD:** docker-compose up works; each app starts; health endpoints respond.

### What was built
- Monorepo directory structure
- `docker-compose.yml` — Postgres 16+pgvector, Valkey 8, Keycloak 24, SeaweedFS, RabbitMQ 3.13, Prometheus, Grafana 9.5
- `infra/postgres/init.sql` — uuid-ossp, pgcrypto, vector extensions + keycloak schema
- `infra/keycloak/erp-realm.json` — realm with 4 roles, 3 clients, 4 demo users
- Spring Boot Maven multi-module parent (common, gateway, identity)
- FastAPI ai-service skeleton (health + placeholder AI endpoints)
- AI Service API inventory created: docs/AI_API.md
- Angular 17 frontend skeleton (NgRx, OIDC client, Material, Tailwind, SSR)
- Flutter mobile skeleton (Riverpod, Drift, flutter_appauth)

### How to verify Phase 0
```powershell
cp .env.example .env          # fill passwords
docker-compose up -d postgres valkey keycloak rabbitmq prometheus grafana
# wait ~60s for Keycloak
docker-compose up -d identity-service ai-service gateway
curl http://localhost:8082/api/v1/identity/health   # → {"status":"UP"}
curl http://localhost:8000/api/v1/ai/health          # → {"status":"UP"}
```

---

## Phase 1 – Multi-tenancy + Auth Foundation ✅ DONE

**DoD:** login works; request is tenant-scoped; cross-tenant access blocked (test proves it).

### What was built

**common module (shared kernel):**
- `BaseEntity` — id (UUID), createdAt, updatedAt
- `TenantEntity` — extends BaseEntity + `tenant_id` + Hibernate `@FilterDef(tenantFilter)`
- `TenantEntityListener` — JPA `@PrePersist` auto-stamps `tenant_id` from `TenantContext`
- `TenantContext` — ThreadLocal tenant_id + `requireTenant()` guard
- `TenantResolutionFilter` — reads `X-Tenant-Id` header per request
- `TenantFilterInterceptor` — AOP aspect enabling Hibernate filter on every `@Transactional` method
- `KeycloakJwtAuthConverter` — maps `realm_access.roles` → Spring `GrantedAuthority`; copies `tenant_id` claim → `TenantContext`
- `TenantDataSourceConfig` — wraps HikariCP; calls `set_config('app.tenant_id', ?, FALSE)` on every connection checkout; redirects Flyway to raw pool

**identity module:**
- `Tenant` entity + `TenantRepository` + `TenantService` + `TenantController` (SUPER_ADMIN)
- `User` entity + `UserRepository` + `UserService` + `UserController` (role-scoped)
- `UserRole` enum: SUPER_ADMIN / EMPLOYER / EMPLOYEE / CLIENT
- DTOs (`TenantDto`, `UserDto`) + MapStruct mappers
- `SecurityConfig` — stateless JWT + `KeycloakJwtAuthConverter` + `@EnableMethodSecurity`
- Flyway V2 — `current_tenant_id()` safe function + FORCE ROW LEVEL SECURITY + audit policy
- Flyway V3 — seed demo tenant + 4 demo users
- `TenantIsolationIT` — Testcontainers cross-tenant isolation test (6 test cases)

**frontend (Angular):**
- `authGuard` — `CanActivateFn` checking OIDC `isAuthenticated$`; triggers Keycloak redirect
- `roleGuard` — factory guard checking `realm_access.roles` from JWT payload
- `authInterceptor` — `HttpInterceptorFn` attaching Bearer token to all `/api/` calls
- `ForbiddenComponent` — 403 page
- All protected routes wired with `canActivate: [authGuard]`

**mobile (Flutter):**
- `AuthService` — Keycloak PKCE login/refresh/logout via `flutter_appauth`
- `AuthNotifier` — Riverpod `AsyncNotifier` with session persistence via `SharedPreferences`
- `AuthState` sealed class: `AuthInitial | AuthLoading | AuthAuthenticated | AuthError`
- `LoginScreen` — sign-in card that triggers Keycloak browser flow
- `ErpRouter` — root widget that gates nav on auth state

### How to verify Phase 1
```powershell
# Backend — build + run cross-tenant isolation test
cd backend
mvn install -DskipTests -q          # compile all modules (clears IDE errors)
mvn -pl identity test               # runs TenantIsolationIT via Testcontainers
# Expected: BUILD SUCCESS, 6 tests passed

# Frontend — login flow
cd frontend && npm install && npm start
# Open http://localhost:4200 → redirects to Keycloak → login as demo-employer / Employer@123
# Returns to dashboard with Bearer token

# Mobile
cd mobile && flutter pub get && flutter run
# Tap "Sign in with Keycloak" → browser opens → login → returns to app showing email/tenant/role
```

---

## Phase 2 – RBAC Hardening ✅ DONE

**DoD:** each of the 4 roles sees only what it should; all sensitive actions are audited.

### What was built

**common module:**
- `AuditEntry` entity — maps to `audit_log`, hash chain maintained by DB trigger
- `AuditRepository` — paginated queries by tenant/action/date
- `AuditService` — writes audit entries with `REQUIRES_NEW` propagation (commits even on rollback)
- `@Auditable` annotation — marks service methods for automatic audit capture
- `AuditAspect` — `@Around` aspect; fires after success; extracts entityId from return value or UUID args; redacts sensitive param names

**identity module:**
- `EmployeeFunction` enum: SALES / WAREHOUSE / BUYER / ACCOUNTANT / SUPPORT / MANAGER
- `User.employeeFunction` field — required for EMPLOYEE role
- `UserDto` updated with `employeeFunction`
- `TenantService.create/setActive` — annotated `@Auditable`
- `UserService.create/update/deactivate/upsertFromToken` — annotated `@Auditable`
- `AuditController` — `GET /audit` (paginated; EMPLOYER sees own tenant; SUPER_ADMIN sees all); `GET /audit/tail` (chain verification)
- Flyway V4 — `prev_hash`/`hash` columns + `audit_log_compute_hash()` PostgreSQL trigger + `employee_function` enum column

**frontend (Angular):**
- `IdentityService` — typed HTTP client for users/tenants/audit
- `ShellComponent` — Material sidenav layout; role-based nav items; email + logout in toolbar
- `SHELL_ROUTES` — all authenticated routes nested inside shell
- `UserManagementComponent` — paginated table + inline create form + deactivate
- `TenantManagementComponent` — SUPER_ADMIN only; create + toggle active
- `AuditLogComponent` — paginated table with action filter; shows hash prefix for chain visibility
- `StubComponent` — placeholder for Phase 3 modules (CRM/Sales/Inventory)

### How to verify Phase 2
```powershell
cd C:\PFA2026\backend && mvn install -DskipTests -q
docker-compose up -d
# Login as demo-employer → /admin/users → create a user → check /admin/audit for CREATE entry
# Login as super-admin → /admin/tenants visible; /admin/audit shows all tenants
# Login as demo-employee → /admin/users NOT in nav (EMPLOYEE not allowed)
# Login as demo-client → only Dashboard in nav
```

## Phase 3 – Core MVP modules ✅ DONE

**DoD:** CRM, Sales full FSM, Inventory ledger, cross-module RabbitMQ event, SalesFlowIT green.

### What was built

**CRM module (port 8083):**
- Entities: `Prospect`, `Client`, `Opportunity` (all TenantEntity + RLS)
- Full CRUD with status FSMs; `@Auditable` on all mutations
- Flyway `flyway_crm_history` — separate migration history per module

**Sales module (port 8084):**
- `CatalogProduct` — product catalog with reference dedup per tenant
- `Devis` + `DevisLine` — quote with product price snapshot (locked at creation time)
- `Commande` — auto-created when Devis transitions to ACCEPTE
- `Livraison` + `LivraisonLine` — auto-created from Commande lines; quantity tracking
- `Facture` + `FactureLine` + `Encaissement` — invoice with partial payment support
- Status FSMs with `canTransitionTo()` guard on all transitions
- `LivraisonConfirmedEvent` record published to RabbitMQ `erp.events` exchange on `livraison.confirmed` routing key when Livraison → LIVREE
- `SalesFlowIT` — 8-step Testcontainers integration test (product→devis→commande→livraison→confirm→encaissement→tenant isolation)

**Inventory module (port 8085):**
- `StockLocation`, `StockItem`, `StockMovement` (insert-only ledger, RLS)
- `LivraisonEventHandler` — RabbitMQ consumer on `inventory.livraison.confirmed`; creates `StockMovement(SORTIE)` per line; thread-safe TenantContext injection
- Low-stock query; manual adjustment endpoint
- `RabbitMQConfig` — declares queue + binding to `erp.events` exchange

**Infrastructure:**
- `docker-compose.yml` — added crm-service, sales-service, inventory-service
- `gateway/application.yml` — routes for /api/v1/crm/**, /api/v1/sales/**, /api/v1/inventory/**
- `prometheus.yml` — scrape configs for 3 new services

**Frontend (Angular):**
- `ProspectListComponent` — CRM prospects table with status badges
- `DevisListComponent` — Sales devis table with status badges + pagination
- `MovementHistoryComponent` — Stock movement ledger with colour-coded ENTREE/SORTIE
- `SalesService` + `InventoryService` — typed HTTP clients
- `shell.routes.ts` — real components replace stubs for crm/sales/inventory routes

### How to verify Phase 3
```powershell
cd C:\PFA2026\backend
mvn install -DskipTests -q              # compile all 6 modules
mvn -pl sales test                      # run SalesFlowIT (requires Docker for Testcontainers)
# Expected: BUILD SUCCESS, 8 tests passed

docker-compose up -d                    # start all services including crm/sales/inventory
# POST /api/v1/sales/products (EMPLOYER JWT)
# POST /api/v1/sales/devis
# PATCH /api/v1/sales/devis/{id}/status  { targetStatus: "ACCEPTE" }
# → Commande auto-created; POST /api/v1/sales/commandes/{id}/status { targetStatus: "CONFIRMEE" }
# → Facture auto-created; POST /api/v1/sales/livraisons/{id}/confirm
# → GET /api/v1/inventory/movements  should show SORTIE entries
```

## Phase 4 – Quote request (menuiserie) + Customer portal ✅ DONE

**DoD:** Prospects can submit quote requests without login; authenticated CLIENTs view their own devis/factures; files attach via SeaweedFS; PDFs download.

### What was built

**Backend – Sales module additions:**

- Flyway `V2__quote_requests.sql` — `devis_requests`, `devis_request_items`, `devis_attachments` tables with RLS
- `DevisRequest` + `DevisRequestItem` + `DevisAttachment` domain entities
- `DevisRequestStatus` FSM: NOUVEAU → EN_ETUDE → DEVIS_CREE / REFUSE
- `DevisRequestRepository` + `DevisAttachmentRepository`
- `SeaweedFsService` — multipart upload/download/delete to SeaweedFS filer; path: `/erp/{tenantId}/attachments/{uuid}_{filename}`
- `PdfGeneratorService` (OpenPDF / LGPL) — `generateDevis()` + `generateFacture()` returning `byte[]`; branded header, line table, totals
- `AttachmentService` — saves `DevisAttachment` + uploads file to SeaweedFS; proxies downloads
- `DevisRequestService` — submit (public), updateStatus (FSM), linkDevis
- `PortalService` — JWT subject extraction; `myDevis()`, `myFactures()`, `myRequests()`, PDF download — all filtered by clientId
- `DevisRequestController` — `POST /requests/public` (permitAll), `PATCH /{id}/status`, `POST /{id}/link-devis/{devisId}`
- `AttachmentController` — `POST /attachments/{entityType}/{entityId}`, `GET /attachments/{id}/download`
- `PortalController` — `GET /portal/devis`, `/portal/factures`, `/portal/requests`, `POST /portal/requests`, `GET /portal/devis/{id}/pdf`, `GET /portal/factures/{id}/pdf`
- `SecurityConfig` — permits `/api/v1/sales/requests/public` without auth
- Gateway `SecurityConfig` — same public path exemption
- `sales/pom.xml` — added `com.github.librepdf:openpdf:1.3.30`

**Frontend – Angular:**

- `PortalService` — typed client: `myDevis/myFactures/myRequests/submitPublicRequest/downloadDevisPdf/downloadFacturePdf`
- `QuoteRequestComponent` (`/portal/quote-request`) — 4-step Material Stepper (contact → project type → items FormArray with dimensions/specs → summary/submit); public route, no auth required
- `CustomerPortalComponent` (`/portal/dashboard`) — 3 Material tabs: My devis (PDF download), My factures (PDF download), My requests; CLIENT-only auth guard
- `FileUploadComponent` — drag-and-drop + file browse with progress bar; reusable for attaching files to any entity; max 10 MB per file
- `shell.routes.ts` — portal/dashboard (CLIENT-only guarded) + public route in app.routes.ts
- `shell.component.ts` — "Mon espace" nav item visible to CLIENT role

### How to verify Phase 4
```powershell
# Backend
cd C:\PFA2026\backend
mvn install -DskipTests -q
docker-compose up -d

# Submit a public quote request (no auth needed)
curl -X POST http://localhost:8080/api/v1/sales/requests/public \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test","clientEmail":"test@test.com","projectType":"FENETRE","items":[{"quantity":2,"widthMm":1200,"heightMm":1400}]}'

# Frontend — open http://localhost:4200/portal/quote-request (no login required)
# Submit form → "Votre demande a été envoyée!" confirmation

# Login as CLIENT → http://localhost:4200/portal/dashboard
# → 3 tabs: My devis / My factures / My requests
# → PDF download buttons trigger file download
```

## Phase 5 – Role Dashboards + AI Tiles ✅ DONE

**DoD:** Each role sees a tailored dashboard; AI price suggestion and stock-risk forecast endpoints are live; Grafana dashboards provision automatically.

### What was built

**FastAPI AI service (ai-service/):**
- `app/auth.py` — JWT verification via Keycloak JWKS; `require_roles()` dependency factory; `Annotated` aliases for FastAPI injection
- `app/pricing.py` — `suggest_price()` heuristic engine: TND/m² base price by profile series (T45/T60/T70/T80) × glass-type factor × opening surcharge; confidence score
- `app/forecast.py` — `forecast_item()` EMA-based stock-out risk: `risk_score` sigmoid → LOW/MEDIUM/HIGH/CRITICAL; `estimated_days_to_stockout`
- `app/main.py` — `POST /api/v1/ai/suggest-price` + `POST /api/v1/ai/stock-forecast`; proper Pydantic v2 models; 422 response documented

**Backend — sales-service additions:**
- `DashboardDto.java` — `EmployerSummary`, `EmployeeSummary`, `ClientSummary`, `FunnelStep` records
- Repository count/aggregate queries added to `DevisRepository`, `CommandeRepository`, `LivraisonRepository`, `FactureRepository`, `DevisRequestRepository` (14 new `@Query` methods)
- `DashboardService.java` — `employerSummary()`, `employeeSummary()`, `clientSummary(clientId, email)`
- `DashboardController.java` — `GET /api/v1/sales/dashboard/employer|employee|client` with role-based `@PreAuthorize`

**Keycloak (`erp-realm.json`):**
- `registrationAllowed: true` — self-registration enabled
- `registrationEmailAsUsername: true`
- `defaultRoles: ["CLIENT"]` — new self-registered users automatically get CLIENT role

**Grafana provisioning (`infra/grafana/`):**
- `datasources/prometheus.yaml` — auto-provisions Prometheus datasource
- `dashboards/dashboard.yaml` — folder provisioner config
- `dashboards/sales-funnel.json` — HTTP req rate, P95 latency, error rate, JVM heap, AI service rate
- `dashboards/stock-levels.json` — inventory latency percentiles, RabbitMQ message rates, GC pause
- `docker-compose.yml` — added `datasources` volume mount to Grafana

**Angular frontend:**
- `AiService` — typed `suggestPrice()` + `stockForecast()` HTTP clients
- `DashboardDataService` — typed `employer()` / `employee()` / `client()` calls
- `DashboardComponent` — role-aware dispatcher using `@switch`; detects role from JWT `realm_access.roles`
- `EmployerDashboardComponent` — KPI tiles (open devis, pending requests, CA MTD, overdue factures) + sales funnel bars + AI stock-risk top-5 tiles
- `EmployeeDashboardComponent` — action tiles (livraisons planifiées/en-cours, new requests, open commandes) with urgent badges + quick-action buttons
- `ClientDashboardComponent` — status tiles + financial summary (invoiced/paid/remaining) + acceptance rate progress bar + quick-action CTAs
- `QuoteRequestComponent` — "Estimation IA" button per item calling `/api/v1/ai/suggest-price`; shows unit price HT + confidence %

### How to verify Phase 5
```powershell
# Start all services
docker-compose up -d

# AI price suggestion (needs valid JWT)
curl -X POST http://localhost:8443/api/v1/ai/suggest-price \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"width_mm":1200,"height_mm":1400,"profile_series":"T60","glass_type":"DV_4_16_4","opening_type":"COULISSANT","quantity":2}'
# → {"unit_price_ht": 2xxx.xx, "confidence": 0.99, ...}

# Stock forecast
curl -X POST http://localhost:8443/api/v1/ai/stock-forecast \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"demo","items":[{"product_id":"p1","product_reference":"ALU-T60","current_quantity":10,"daily_consumptions":[2,3,2.5,4,3]}]}'
# → {"forecasts":[{"risk_level":"HIGH","estimated_days_to_stockout":3,...}]}

# Frontend — login as demo-employer → dashboard shows KPI tiles + AI stock risk
# Login as demo-employee → action tiles with urgent badges
# Login as demo-client → financial summary + acceptance rate
# Grafana → http://localhost:3001 → ERP folder → 2 dashboards auto-loaded
```

## Phase 6 – Mobile (Flutter) full features ✅ DONE

**DoD:** EMPLOYEE can scan barcodes, adjust stock offline, sync on reconnect; CLIENT views devis/factures and submits requests from mobile; role-aware shell adapts nav per role.

### What was built

**Core infrastructure:**
- `core/api/api_client.dart` — Dio singleton with `_AuthInterceptor`: injects Bearer token + `X-Tenant-Id` header from Riverpod auth state; base URL via `--dart-define=API_BASE`
- `core/api/models.dart` — plain Dart models (no codegen): `StockItem`, `StockMovement`, `PageResult<T>`, `DevisSummary`, `FactureSummary`, `DevisRequestSummary`
- `core/api/inventory_api.dart` — `getItems()`, `getItemByReference()`, `getMovementsByProduct()`, `recordMovement()`
- `core/api/portal_api.dart` — `myDevis()`, `myFactures()`, `myRequests()`, `downloadDevisPdf()`, `downloadFacturePdf()`, `submitRequest()`

**Offline DB (`core/database/app_database.dart`):**
- Drift `@DriftDatabase` with two tables: `SyncQueueEntries` (pending movements) + `CachedStockItems` (offline display)
- DAOs: `enqueueSyncItem()`, `getPendingItems()`, `markSyncSuccess()`, `markSyncFailed()` (3-retry threshold), `upsertStockItem()`, `getCachedItemByReference()`
- `appDatabaseProvider` — Riverpod provider with `ref.onDispose(db.close)`
- **Note:** run `flutter pub run build_runner build` to generate `app_database.g.dart`

**Sync service (`core/sync/sync_service.dart`):**
- `enqueueMovement()` — serialises movement to JSON, stores in Drift
- `syncPending()` — uploads queue; stops on network error; marks failed after 3 retries; concurrency guard (`_syncing` flag)
- `pendingSyncCountProvider` — `StreamProvider` polling every 30s; drives sync banner in home screen

**Barcode scanning (`features/inventory/`):**
- `BarcodeScannerScreen` — `MobileScanner` with torch toggle; `DetectionSpeed.noDuplicates`; fallback to `CachedStockItems` when offline; navigates to `StockDetailScreen`
- `StockDetailScreen` — gradient KPI card (total/reserved/available); movement history `ListView`; "Ajustement" FAB
- `AdjustmentDialog` — `SegmentedButton` (ENTREE/SORTIE/AJUSTEMENT) + quantity validator; returns `AdjustmentResult`; caller tries online first, falls back to `SyncService.enqueueMovement()`

**Client portal (`features/portal/client_portal_screen.dart`):**
- `DefaultTabController` with 3 tabs: Devis / Factures / Demandes
- `_DevisCard` — reference, status chip, total TTC, tap → PDF download
- `_FactureCard` — total/paid/remaining breakdown with coloured amounts; dueDate; PDF button
- `_RequestsTab` — project type, status, item count
- FAB → `_showNewRequestDialog` — inline form: name/email/projectType/description → `submitRequest()`
- `_StatusChip` — colour-coded badge matching all FSM states
- `FutureProvider` per tab + `RefreshIndicator` for pull-to-refresh

**Role-based shell (`app/router.dart`):**
- `_HomeShell` — `IndexedStack` + `NavigationBar`; on init triggers `syncPending()`
- Nav entries by role: CLIENT → [Mon espace, Accueil]; EMPLOYEE → [Scanner, Accueil]; EMPLOYER/SUPER_ADMIN → [Scanner, Portail, Accueil]
- `_InfoScreen` — shows email/tenant/role; `_SyncBanner` with manual "Sync" button when `pendingSyncCount > 0`

**Push notifications (`core/notifications/notification_service.dart`):**
- Stub with full FCM integration code commented out; detailed setup instructions in file header
- Called from `main()` — no-op until Firebase project is configured (google-services.json + flutterfire configure)

**pubspec.yaml** — added `path: ^1.9.0`

### How to verify Phase 6
```bash
cd C:\PFA2026\mobile

# 1. Generate Drift code
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs

# 2. Run on Android emulator (API 10.0.2.2 → host machine)
flutter run

# 3. Test barcode scanner
# → Tap Scanner tab → point camera at product reference barcode
# → Shows stock detail with real-time quantities
# → Tap edit icon → SORTIE 5 units → if offline, stored in queue

# 4. Test offline sync
# → Disable WiFi on emulator → record a movement → re-enable WiFi
# → Tap Sync button in Accueil → movement uploaded

# 5. Login as CLIENT → Mon espace tab shows devis/factures/requests
```

## Phase 7 – Achats + Finance ✅ DONE

**DoD:** Purchase orders managed end-to-end; goods receipts automatically create stock entries via RabbitMQ; accounts-receivable aging report live in Angular.

### What was built

**Backend — achat module (port 8086):**
- `achat/pom.xml` — new Spring Boot module: common + spring-data-jpa + amqp + flyway + mapstruct
- `application.yml` — port 8086, `flyway_achat_history`, Keycloak resource server
- `V1__achat_schema.sql` — `fournisseurs`, `bons_commande`, `bons_commande_lignes`, `bons_reception`, `bons_reception_lignes`; all with RLS `FORCE ROW LEVEL SECURITY` policies
- Domain: `Fournisseur`, `BonCommande` + `BonCommandeLigne`, `BonReception` + `BonReceptionLigne`
- Status FSMs: `BonCommandeStatus` (BROUILLON→ENVOYE→PARTIELLEMENT_RECU→RECU/ANNULE); `BonReceptionStatus` (EN_COURS→CONFIRME/ANNULE)
- Repositories: `FournisseurRepository`, `BonCommandeRepository`, `BonReceptionRepository` — all tenant-scoped `@Query` methods
- `AchatDto` — records for Create/Response/Summary for all 3 entities
- `AchatMapper` — MapStruct mapper; all field name mismatches explicitly mapped
- `FournisseurService` — CRUD with code-uniqueness guard; soft-delete (actif=false)
- `BonCommandeService` — create with line total computation; FSM transition; fournisseur lazy-load
- `BonReceptionService` — create; `confirm()` publishes `ReceptionConfirmedEvent` to RabbitMQ; auto-updates BonCommande status (PARTIELLEMENT_RECU / RECU)
- `AchatEventPublisher` — publishes to `erp.events` exchange, routing key `reception.confirmed`
- Controllers: `FournisseurController`, `BonCommandeController`, `BonReceptionController`
- `RabbitMQConfig`, `SecurityConfig` (stateless JWT, no public routes), `Dockerfile`

**Common module:**
- `ReceptionConfirmedEvent` record — `tenantId`, `bonReceptionId`, `bonCommandeId`, `List<ReceptionLine>(productId, designation, quantiteRecue, locationId)`

**Backend — inventory-service:**
- `ReceptionEventHandler` — `@RabbitListener` on `inventory.reception.confirmed`; creates `StockMovement(ENTREE)` per line; sets TenantContext from event, clears in finally
- `RabbitMQConfig` — added `receptionConfirmedQueue` bean + `reception.confirmed` binding

**Backend — sales-service:**
- `FactureRepository` — added `findUnpaidByTenant()` (EMISE + PARTIELLEMENT_PAYEE + EN_RETARD)
- `AgingDto` — `AgingReport`, `AgingBucket`, `AgingDetail`, `AgingInvoice` records
- `FactureAgingService` — classifies unpaid invoices into 5 buckets (courant, 1-30, 31-60, 61-90, >90 days overdue)
- `FactureAgingController` — `GET /api/v1/sales/factures/aging/summary|detail` (EMPLOYER+)

**Angular frontend:**
- `AchatService` (`core/services/achat.service.ts`) — typed HTTP clients for fournisseurs, bons-commande, bons-reception, aging
- `FournisseurListComponent` — paginated table + create/edit modal form
- `BonCommandeListComponent` — paginated table with status filter + detail modal + FSM transition + create form with FormArray lines
- `FactureAgingComponent` — 5 colour-coded aging buckets with progress bars; total outstanding KPI
- `shell.routes.ts` — `/achats/fournisseurs`, `/achats/bons-commande`, `/achats/aging` routes added
- `shell.component.ts` — "Achats" + "Créances" nav items for EMPLOYER/EMPLOYEE

**Infrastructure:**
- `docker-compose.yml` — added `achat-service` (port 8086) with full RabbitMQ env
- `gateway/application.yml` — `/api/v1/achats/**` → `achat-service:8086`
- `prometheus.yml` — scrape config for `achat-service:8086`

### How to verify Phase 7
```powershell
docker-compose up -d
# Wait for all services to start

# 1. Create a fournisseur
$TOKEN = "<EMPLOYER JWT>"
curl -X POST http://localhost:8443/api/v1/achats/fournisseurs \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"code":"ALU-PRO","nom":"Aluminium Pro SARL","telephone":"+212600000001"}'

# 2. Create a bon de commande
curl -X POST http://localhost:8443/api/v1/achats/bons-commande \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"fournisseurId":"<f-id>","reference":"BC-2026-001","dateLivraison":"2026-07-01","lignes":[{"designation":"Profilé T60","reference":"ALU-T60","quantite":100,"prixUnitaire":45.00,"taxPct":20,"position":0}]}'

# 3. Transition → ENVOYE
curl -X PATCH http://localhost:8443/api/v1/achats/bons-commande/<bc-id>/transition \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" -d '{"targetStatus":"ENVOYE"}'

# 4. Create bon de réception + confirm → check inventory movements
curl -X POST http://localhost:8443/api/v1/achats/bons-reception \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"bonCommandeId":"<bc-id>","reference":"BR-2026-001","dateReception":"2026-06-05","lignes":[{"productId":"<p-id>","designation":"Profilé T60","quantiteRecue":100,"position":0}]}'

curl -X PATCH http://localhost:8443/api/v1/achats/bons-reception/<br-id>/confirm \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>"
# → StockMovement(ENTREE) auto-created via RabbitMQ

# 5. Aging report
curl http://localhost:8443/api/v1/sales/factures/aging/summary \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>"
# → {"current":{...},"days1_30":{...},...,"totalOutstanding":...}

# 6. Angular — login as EMPLOYER → "Achats" in nav → Bons de commande, Fournisseurs
# → "Créances" → aging buckets with colour bars
```

## Phase 8 – White-label CMS + Super-Admin ✅ DONE

**DoD:** Each tenant can customise their brand (logo, colours, font); active announcement banners display in-app; SUPER_ADMIN sees a cross-tenant platform dashboard.

### What was built

**Backend — cms-service (port 8087):**
- `cms/pom.xml` — new Spring Boot module: common + JPA + flyway + mapstruct
- `application.yml` — port 8087, `flyway_cms_history`, Keycloak resource server, SeaweedFS filer URL
- `V1__cms_schema.sql` — `tenant_branding` (RLS, unique per tenant) + `tenant_notices` (RLS); public-read policy on branding so logo/notices load pre-auth
- Domain: `TenantBranding` (companyName, tagline, logoFid, faviconFid, primaryColor, secondaryColor, fontFamily, customCss), `TenantNotice` (title, body, severity, active, startsAt, endsAt)
- `NoticeSeverity` enum: INFO / WARNING / ERROR
- Repositories: `TenantBrandingRepository`, `TenantNoticeRepository` (active filter on time window)
- `CmsDto` — `BrandingResponse/UpdateRequest`, `NoticeResponse/CreateRequest/UpdateRequest`, `PlatformStats`, `TenantSummary`
- `CmsMapper` — MapStruct; `updateBranding` and `updateNotice` use `@MappingTarget` merge
- `SeaweedFsService` — upload to `/erp/{tenantId}/branding/{uuid}_{filename}`; download; delete (with warn-only on failure)
- `BrandingService` — upsert (creates if not exists); logo/favicon upload with old-file cleanup; proxies logo bytes for pre-auth download
- `NoticeService` — CRUD; `listActive()` filters by `active=true` and time window
- Controllers: `BrandingController` (`GET /branding` public + `PUT` + `POST /logo` + `POST /favicon`), `NoticeController` (`GET /active` public + full CRUD for EMPLOYER+)
- `SecurityConfig` — permits `/api/v1/cms/notices/active` and `/api/v1/cms/branding/logo` without auth
- `Dockerfile`

**Common module:**
- `ResourceNotFoundException`, `ConflictException`, `BadRequestException` — `@ResponseStatus`-annotated runtime exceptions in `com.erp.common.exception` (used by achat + cms services)

**Backend — identity-service:**
- `PlatformStatsController` (`GET /api/v1/identity/platform/stats|tenants`) — SUPER_ADMIN only; returns `PlatformStatsResponse` (total/active tenants, total users) and per-tenant user counts

**Angular frontend:**
- `CmsService` (`core/services/cms.service.ts`) — typed HTTP clients for branding, notices, platform stats
- `BrandingSettingsComponent` (`/admin/branding`) — live preview panel (colour, font, logo); colour picker + hex input; logo upload with 2 MB guard; announcement notices CRUD; exports `applyBrandingCssVars()`
- `SuperAdminDashboardComponent` (`/admin/platform`) — KPI tiles (total/active tenants, total users); tenants table with user counts; horizontal bar chart of users per tenant
- `NoticeBannerComponent` — loads active notices on shell init; colour-coded (info/warning/error); per-notice dismiss button
- `ShellComponent` — integrated `NoticeBannerComponent` below toolbar; loads branding on init via `applyBrandingCssVars()`; binds toolbar background to `primaryColor`; shows `companyName` in toolbar
- `shell.routes.ts` — `/admin/branding` (EMPLOYER+) + `/admin/platform` (SUPER_ADMIN) routes added
- `shell.component.ts` — "Personnalisation" + "Platform" nav items added

**Infrastructure:**
- `docker-compose.yml` — added `cms-service` (port 8087) with SeaweedFS filer env
- `gateway/application.yml` — `/api/v1/cms/**` → `cms-service:8087`
- `prometheus.yml` — scrape config for `cms-service:8087`

### How to verify Phase 8
```powershell
docker-compose up -d

# 1. Update branding (EMPLOYER JWT)
$TOKEN = "<EMPLOYER JWT>"
curl -X PUT http://localhost:8443/api/v1/cms/branding \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"AluminiumPro SARL","tagline":"Expert en menuiserie","primaryColor":"#1565C0","secondaryColor":"#37474F"}'

# 2. Upload a logo
curl -X POST http://localhost:8443/api/v1/cms/branding/logo \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -F "file=@logo.png"

---

## Phase 10 – AI Integration (NEW – Phases 10.0-10.7) 🚀

**Start Date:** 2026-06-07  
**Target Duration:** 12 weeks (iterative, 2-week sprints)  
**Status:** 🏗️ Phases 10.0-10.5 IN PROGRESS (2026-06-08)

### Phase 10.0 – Audit & Architecture ✅ DONE

**Objective:** Analyze existing codebase and design AI architecture without code changes.

**Deliverables:**
- ✅ [docs/AI_EXISTING_SYSTEM_AUDIT.md](docs/AI_EXISTING_SYSTEM_AUDIT.md) — Complete system inventory (500+ lines)
  - Existing backend modules (8 services)
  - Database schema (all CRM, Sales, Inventory, Purchases tables)
  - AI infrastructure (Ollama, pgvector, FastAPI ai-service)
  - Multi-tenant RLS verification
  - Security analysis (Keycloak JWT, RBAC, audit trail)
  - Data quality assessment for ML

- ✅ [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) — Production architecture design
  - Multi-layer architecture reusing all existing infrastructure
  - Chat endpoint specification (RAG + Ollama/Mistral streaming)
  - Forecasting (Prophet, XGBoost, Scikit-Learn models)
  - Classification & anomaly detection pipelines
  - Implementation roadmap (Phases 3-9, detailed tasks)
  - API contracts (POST /api/v1/ai/chat, forecast endpoints, etc.)
  - Security hardening checklist
  - Deployment strategy (Docker, Kubernetes, CI/CD)

**Key Findings:**
- ✅ Platform 100% ready for AI integration (no refactoring needed)
- ✅ Multi-tenant RLS verified and enforced at DB layer
- ✅ Ollama service ready in docker-compose (GPU optional)
- ✅ pgvector indices configured (ivfflat, 1536-dim)
- ✅ Keycloak JWT + Valkey session management working
- ✅ All business data available (prospects, devis, factures, stock movements, etc.)
- ✅ Event bus (RabbitMQ) ready for async jobs
- ✅ Storage (SeaweedFS) ready for model artifacts
- ⚠️ Non-blocking issues: DEV_AUTH_BYPASS (disable in prod), embedding quality (POC), session stamping in ai-service

**Verification:**
```powershell
# Read audit & architecture
Get-Content docs/AI_EXISTING_SYSTEM_AUDIT.md | head -100
Get-Content docs/AI_ARCHITECTURE.md | head -100

# Verify existing tables
docker exec erp-postgres psql -U erp -d erp_db -c "\dt ai_*"
docker-compose --profile ai up -d ollama
docker exec erp-ollama ollama list
```

---

### Phase 10.1 – RAG & Chat ✅ DONE (2026-06-08)

**Objective:** Fully functional chat endpoint with vector retrieval + Ollama

**Completed:**
- [x] `ai-service/app/embedder.py` — nomic-embed-text via Ollama, deterministic SHA-256 fallback, EMBED_DIM from env
- [x] `ai-service/app/indexer.py` — updated to use embedder module; `index_commandes` added; all 4 source types (devis, factures, commandes, clients, stock)
- [x] `ai-service/app/db.py` — asyncpg connection pool (min=2, max=10), RLS tenant stamping
- [x] `ai-service/app/auth.py` — JWKS cache with 1-hour TTL
- [x] `ai-service/app/main.py` — critical bug fix: `/api/v1/ai/chat` decorator was on wrong function; fixed + lifespan pool init
- [x] `/api/v1/ai/chat/stream` — SSE streaming endpoint (existing, verified working)
- [x] `/api/v1/ai/conversations` — list conversations for current user
- [x] `/api/ai/index/factures`, `/api/ai/index/commandes`, `/api/ai/index/all` — multi-source indexing
- [x] DB migration V2: `ai-service/db/migrations/V2__ai_embeddings_resize.sql` (vector(1536)→vector(768))
- [x] Frontend `AiService` extended: `streamAssistant` (SSE), all forecast/classify/anomaly/training methods
- [x] `AiAssistantComponent` updated: real SSE streaming, token-by-token bubble, `OnDestroy` cleanup

---

### Phase 10.2 – Forecasting ✅ DONE (2026-06-08)

**Objective:** Sales, revenue, stock, cashflow forecasting

**Completed:**
- [x] `/api/ai/forecast/sales` — Prophet-based heuristic (devis ACCEPTE history)
- [x] `/api/ai/forecast/cashflow` — 90-day rolling average from encaissements, projected forward
- [x] `/api/ai/forecast/stock` — EMA risk scoring per product
- [x] `AiService.forecastSales()`, `forecastCashflow()` added to frontend service

---

### Phase 10.3 – Classification ✅ DONE (2026-06-08)

**Objective:** XGBoost models for quote success & payment risk

**Completed:**
- [x] `/api/ai/classification/quote-success` — XGBoost classifier (uses trained model or heuristic fallback)
- [x] `/api/ai/classification/payment-risk` — XGBoost payment risk classifier
- [x] `AiService.classifyQuote()`, `classifyPaymentRisk()` added to frontend service
- [x] `ai-service/seed_training_data.py` — 44 devis/tenant, 28 factures, 60 movements for training

---

### Phase 10.4 – Anomalies & Recommendations ✅ DONE (2026-06-08)

**Objective:** Isolation Forest for outlier detection + purchase recommendations

**Completed:**
- [x] `/api/ai/anomalies` — Isolation Forest on stock movements
- [x] `/api/ai/recommendations/purchase` — heuristic on stock_items below min_quantity, 30-day consumption
- [x] `AiService.detectAnomalies()`, `recommendPurchase()` added to frontend service

---

### Phase 10.5 – Frontend UI ✅ DONE (2026-06-08)

**Objective:** Angular Chat Component + Analytics Dashboard

**Completed:**
- [x] `AiAssistantComponent` — ChatGPT-like, SSE streaming token-by-token, conversation tracking
- [x] `AiDashboardComponent` — Ollama status, ML models registry, training controls (train-all), anomaly alerts, purchase recommendations
- [x] `/ai-dashboard` route added to shell.routes.ts (SUPER_ADMIN, EMPLOYER)
- [x] "Dashboard IA" nav item added to INTELLIGENCE section in shell.component.ts
- [x] `AiService` — full service with 15+ methods: streaming SSE, forecast, classification, anomaly, recommendations, training, conversations

---

### Phase 10.6 – ML Pipeline (IN PLANNING – 2 weeks)

**Objective:** Automated retraining, model versioning, monitoring

**Planned Tasks:**
- [ ] RabbitMQ consumer worker for training jobs
- [ ] Nightly training scheduler (APScheduler)
- [ ] Model versioning and artifact storage (SeaweedFS)
- [ ] Model performance Grafana dashboard
- [ ] Model drift detection alerts
- [ ] MLflow integration (optional)

---

### Phase 10.7 – Security & Optimization (IN PLANNING – 1 week)

**Objective:** Production-ready security, performance tuning

**Planned Tasks:**
- [ ] Disable `DEV_AUTH_BYPASS` in production docker-compose
- [ ] Add rate limiting (circuit breaker + Redis)
- [ ] Implement request sanitization
- [ ] Prompt injection detection
- [ ] Tune pgvector index (HNSW or FAISS migration path)
- [ ] Caching strategy (Valkey)
- [ ] Load testing (100+ concurrent users)
- [ ] OWASP Top 10 security audit
- [ ] GPU pass-through setup guide (Ollama)

---

**Current Status (2026-06-08):** Phases 10.0-10.5 complete.

**Next:** Phase 10.6 (ML pipeline — RabbitMQ consumer, nightly retraining scheduler, SeaweedFS model storage) + Phase 10.7 (security hardening, rate limiting, OWASP audit).

**To activate nomic-embed-text embeddings after V2 migration:**
```powershell
# 1. Apply V2 migration (resize embedding column to 768 dims)
docker exec erp-postgres psql -U erp -d erp_db -f /migrations/V2__ai_embeddings_resize.sql

# 2. Pull nomic-embed-text model into Ollama
docker exec erp-ollama ollama pull nomic-embed-text

# 3. Update .env / docker-compose.yml
# OLLAMA_EMBED_MODEL=nomic-embed-text
# EMBED_DIM=768

# 4. Restart ai-service and trigger re-indexing
docker-compose --profile ai restart ai-service
curl -X POST http://localhost:8000/api/ai/index/all -H "Authorization: Bearer <admin_token>"
```


# 3. Get logo without auth (pre-auth login page branding)
curl http://localhost:8443/api/v1/cms/branding/logo \
  -H "X-Tenant-Id: <tenant-uuid>" --output logo.png

# 4. Create an announcement
curl -X POST http://localhost:8443/api/v1/cms/notices \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: <tenant-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Maintenance","body":"Indisponible samedi 10h-12h","severity":"WARNING"}'

# 5. Get active notices without auth
curl http://localhost:8443/api/v1/cms/notices/active \
  -H "X-Tenant-Id: <tenant-uuid>"

# 6. Platform stats (SUPER_ADMIN)
curl http://localhost:8443/api/v1/identity/platform/stats \
  -H "Authorization: Bearer <SUPER_ADMIN JWT>"

# 7. Angular — login as EMPLOYER → "Personnalisation" in nav
# → Change primary colour → toolbar updates live; CSS vars applied globally
# → Upload logo → preview updates
# → Login as SUPER_ADMIN → "Platform" in nav → tenant bar chart
```

## Phase 9 – Observability, CI/CD, hardening ✅ DONE

**DoD:** All services emit structured JSON logs with tenantId/requestId in MDC; distributed traces visible in Zipkin; GitHub Actions CI runs on push; CORS and rate-limiting are tenant-aware; common exceptions live in shared module.

### What was built

**Structured logging (common module):**
- `MdcRequestFilter` — Servlet `Filter` (order 1); generates or propagates `X-Request-Id` header; populates MDC `requestId` + `tenantId`; echoes `X-Request-Id` in response; clears MDC in finally block
- `logback-spring.xml` — profile-aware: `docker` profile → JSON via `LogstashEncoder` (includes MDC fields); local dev → human-readable pattern with tenantId/requestId inline
- `logstash-logback-encoder:7.4` added to `common/pom.xml` as optional dependency

**Distributed tracing:**
- `micrometer-tracing-bridge-brave` + `zipkin-reporter-brave` added to parent `dependencyManagement` and `common/pom.xml`
- `management.tracing.sampling.probability: 1.0` + `management.zipkin.tracing.endpoint` added to all 6 service `application.yml` files
- Gateway `application.yml` — same tracing config; `management.tracing.sampling.probability: 1.0`
- `docker-compose.yml` — added `zipkin` service (openzipkin/zipkin:3, port 9411); `ZIPKIN_URL` env var injected into all app services
- `prometheus.yml` — added `zipkin:9411/prometheus` scrape target

**Gateway hardening:**
- `RequestIdGatewayFilter` — `GlobalFilter` (highest precedence +1); ensures `X-Request-Id` present on every request/response
- `RateLimitConfig` — `tenantKeyResolver` bean: uses `tenant_id` JWT claim for authenticated requests, falls back to `anon:<ip>`; replaces the old `ipKeyResolver`
- `application.yml` — switched rate limiter key resolver to `tenantKeyResolver`; added `globalcors` block with `CORS_ALLOWED_ORIGINS` env var; changed `identity-service` URI from `lb://` to `http://` (no service discovery configured)

**GitHub Actions CI (`.github/workflows/ci.yml`):**
- `backend` job — JDK 21 + Maven cache; builds all modules; runs `identity` + `sales` Testcontainers tests with Postgres + RabbitMQ service containers
- `ai-service` job — Python 3.11; installs deps + ruff; lints `app/`
- `frontend` job — Node 20 + npm cache; `npm ci` + `npm run build -- --configuration production`
- `trivy` job — builds gateway Docker image; runs Trivy CRITICAL vulnerability scan (fails CI if found)

**Environment:**
- `.env.example` — added `CORS_ALLOWED_ORIGINS`, `ZIPKIN_URL`, `SEAWEEDFS_FILER_URL`

**Common exceptions:**
- `ResourceNotFoundException` (`404`), `ConflictException` (`409`), `BadRequestException` (`400`) — `@ResponseStatus`-annotated in `com.erp.common.exception`; used by achat + cms services (and available to all future modules)

**Docker Compose hardening:**
- `healthcheck` blocks added to all 6 Spring Boot services (`wget -qO- .../actuator/health | grep -q UP`, 30s interval, 60s start_period)
- `ZIPKIN_URL: http://zipkin:9411` injected into all app services

### How to verify Phase 9
```powershell
# 1. Start everything
docker-compose up -d

# 2. Check structured logs (JSON in docker profile)
docker logs erp-sales --tail 20
# → {"timestamp":"...","level":"INFO","message":"...","tenantId":"...","requestId":"..."}

# 3. View traces in Zipkin
open http://localhost:9411
# → Make any API call → find trace by service name → see spans across services

# 4. Check request ID propagation
curl -v http://localhost:8443/api/v1/identity/health
# → Response headers include X-Request-Id: <uuid>

# 5. Rate limiting per tenant
# Make >100 requests in burst → 429 Too Many Requests

# 6. CORS
# Angular at http://localhost:4200 can call gateway at http://localhost:8443 (same-origin allowed)
# A different origin gets CORS error

# 7. CI (push to GitHub)
# → GitHub Actions runs build + test + Trivy scan
# → All jobs green = system is shippable

# 8. Container health status
docker ps --format "table {{.Names}}\t{{.Status}}"
# → All services show "(healthy)" after ~2 minutes
```

## Backlog Increment – Loki + Grafana Dashboards ✅ DONE

**Goal:** Centralized log aggregation queryable in Grafana + production-grade dashboards for JVM, HTTP, and RabbitMQ.

### What was built

#### Log aggregation (Loki + Promtail)
- `infra/loki/loki-config.yaml` — Loki 2.9.7, boltdb-shipper, filesystem chunks, 31-day retention, in-memory ring
- `infra/promtail/promtail-config.yaml` — Docker service discovery, filters `erp-*` containers, parses JSON logs (level, tenantId, requestId, traceId), promotes `level` as Loki label
- `infra/grafana/datasources/loki.yaml` — provisioned Loki datasource (uid: `loki-ds`); derived field links `traceId` → Zipkin
- `docker-compose.yml` — added `loki` (port 3100) + `promtail` services; `loki_data` volume; promtail mounts Docker socket read-only

#### RabbitMQ Prometheus plugin
- `infra/rabbitmq/enabled_plugins` — enables `rabbitmq_management` + `rabbitmq_prometheus`
- `docker-compose.yml` rabbitmq: mounts enabled_plugins, exposes port `15692`
- `infra/prometheus/prometheus.yml` — added `rabbitmq` scrape (`:15692/metrics`) + `loki` scrape (`:3100/metrics`)

#### Grafana dashboards (auto-provisioned, uid stable for linking)
| File | uid | Panels |
|------|-----|--------|
| `jvm-metrics.json` | `erp-jvm` | Heap used/committed, heap % gauges, avg GC pause, GC rate, thread states, CPU usage, non-heap, buffer pools |
| `http-metrics.json` | `erp-http` | Request rate, p50/p95/p99 latency, 5xx/4xx bar charts, 5xx error ratio gauge (SLO), top-10 endpoints by 5xx |
| `rabbitmq-metrics.json` | `erp-rabbitmq` | Queue depth (total/ready/unacked), ready messages bargauge, msg/s (publish/deliver/ack), consumers per queue, connections/channels, memory, DLQ depth |

#### Tracing completeness
- `crm-service` and `cms-service` in docker-compose now have `ZIPKIN_URL: http://zipkin:9411` (were missing)

### How to verify

```bash
# 1. Start the full stack
docker-compose up -d

# 2. Verify Loki is healthy
curl http://localhost:3100/ready
# → ready

# 3. Verify Promtail is scraping Docker logs
curl http://localhost:9080/targets
# → shows erp-* containers as active targets

# 4. Open Grafana → Explore → Loki datasource
# Query: {service="sales-service"} | json | level="ERROR"
# → Shows JSON-parsed log lines from the sales service

# 5. Check RabbitMQ metrics
curl http://localhost:15692/metrics | grep rabbitmq_queue_messages
# → Shows queue depth metrics

# 6. Open Grafana → Dashboards → ERP folder
# → "ERP – JVM Metrics", "ERP – HTTP Metrics", "ERP – RabbitMQ" all appear

# 7. Trigger some API calls, then check:
# - HTTP dashboard: request rate and latency appear
# - JVM dashboard: heap usage visible per service
# - RabbitMQ dashboard: queue depth for inventory.reception.confirmed etc.
```
