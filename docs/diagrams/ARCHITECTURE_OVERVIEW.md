# System Architecture Overview: PFA CRM/ERP Platform

## 📋 Documentation Index

This project documentation includes:

1. **[USECASE_DIAGRAM.md](./USECASE_DIAGRAM.md)** - Use-case analysis with actor relationships and workflows
2. **[CLASS_DIAGRAM.md](./CLASS_DIAGRAM.md)** - Domain model with entities, relationships, and inheritance
3. **[INTERACTION_DIAGRAMS.md](./INTERACTION_DIAGRAMS.md)** - Sequence diagrams, workflows, and event flows
4. **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - This document - complete system architecture

---

## 🏗️ System Architecture

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Angular Frontend   │  Flutter Mobile App   │  Client Portal │
└──────────┬──────────────────────┬──────────────────┬─────────┘
           │                      │                  │
           └──────────┬───────────┴──────────┬───────┘
                      │                      │
┌─────────────────────┴──────────────────────┴─────────────────┐
│              API GATEWAY + AUTH                              │
│         (JWT Validation, Rate Limiting)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────┴──────┐  ┌────┴─────┐  ┌───┴────────┐
│   Sales      │  │  Achat   │  │ Inventory  │
│  Service     │  │ Service  │  │ Service    │
│              │  │          │  │            │
│ - Devis      │  │ - PO     │  │ - Stock    │
│ - Commande   │  │ - GRN    │  │ - Ledger   │
│ - Livraison  │  │ - Supp   │  │ - Movement │
│ - Facture    │  │          │  │            │
└──────────────┘  └──────────┘  └────────────┘
        │              │              │
├───────┴──────────────┴──────────────┴───────┬──────────┐
│                                             │          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │          │
│  │   CRM    │  │ Identity │  │   CMS    │  │ RabbitMQ │
│  │ Service  │  │ Service  │  │ Service  │  │          │
│  │          │  │          │  │          │  │ (Events) │
│  │ - Prospect  │ - Tenant │  │ - Config │  │          │
│  │ - Client │  │ - User   │  │ - Brand  │  │          │
│  │ - Oppor. │  │ - Keycloak  │ - Notice │  │          │
│  └──────────┘  └──────────┘  └──────────┘  │          │
│                                             │          │
└─────────────────────────────────────────────┴──────────┘
        │                        │
        │              ┌─────────┴─────────┐
        │              │                   │
        ▼              ▼                   ▼
    PostgreSQL    RabbitMQ          SeaweedFS
    (Data)        (Events)          (Files)
    
    ┌─────────────────────────────────────────┐
    │      Infrastructure & Monitoring         │
    ├─────────────────────────────────────────┤
    │ Keycloak (Auth) │ Prometheus │ Grafana  │
    │ Loki (Logs)     │ Promtail   │ AlertMgr │
    └─────────────────────────────────────────┘
```

---

## 🎯 Core Modules

### **1. Sales Module** (Revenue Generation)
**Scope**: Quote management, order fulfillment, invoicing  
**Key Entities**: Devis, Commande, Livraison, Facture, Encaissement

**Workflow**:
```
Client Request → Devis Quote → Sales Order → Delivery → Invoice → Payment
```

**Key Features**:
- Multi-line quote management with auto-calculated totals
- Stock reservation on order confirmation
- Delivery tracking with line-level fulfillment
- Invoice generation from orders
- Multi-method payment recording

**Cross-Service Integration**:
- ✓ CRM: Fetch Client information
- ✓ Inventory: Reserve/deduct stock
- ✓ Achat: Base product catalog
- → RabbitMQ: Publish order & payment events

---

### **2. Procurement Module (Achat)** (Supply Chain)
**Scope**: Supplier management, purchase orders, goods receipt  
**Key Entities**: Fournisseur, BonCommande, BonReception, BonCommandeLigne

**Workflow**:
```
Create PO → Send to Supplier → Receive Goods → Update Stock
```

**Key Features**:
- Supplier master data with payment terms
- PO creation with line items and calculations
- Goods receipt note (GRN) with line-by-line receiving
- Automatic stock update on GRN completion
- Discrepancy tracking for quality control

**Cross-Service Integration**:
- ✓ Sales: Product catalog reference
- ✓ Inventory: Stock movements (ACHAT type)
- → RabbitMQ: Publish BonCommande & GRN events

---

### **3. Inventory Module** (Stock Management)
**Scope**: Stock tracking, movements, and forecasting  
**Key Entities**: StockItem, StockMovement, StockLocation

**Workflow**:
```
Receive Goods → Record Stock → Reserve for Orders → Deduct on Delivery → Forecast Demand
```

**Key Features**:
- Multi-location stock management
- Immutable stock ledger (INSERT-only)
- Automatic stock reserve on order confirmation
- Automatic deduction on delivery completion
- Movement traceability (source documents)
- RLS (Row Level Security) per tenant

**Stock Movement Types**:
- `ACHAT`: From supplier (GRN receipt)
- `VENTE`: To customer (delivery)
- `AJUSTEMENT`: Manual corrections
- `RETOUR`: Customer returns

**Cross-Service Integration**:
- ✓ Sales: Deduct stock on delivery
- ✓ Achat: Add stock on GRN
- ✓ AI Service: Provide historical data for forecasting
- ← RabbitMQ: Listen for order & delivery events

---

### **4. CRM Module** (Customer Relationship)
**Scope**: Lead tracking, opportunity pipeline, client management  
**Key Entities**: Prospect, Opportunity, Client

**Workflow**:
```
Lead → Qualification → Conversion → Client → Opportunity → Deal Closure
```

**Key Features**:
- Lead source tracking
- Sales pipeline visualization
- Probability-weighted opportunity forecasting
- Client master data management
- Assignment to sales representatives

**Cross-Service Integration**:
- ✓ Sales: Fetch clients for orders & quotes
- → RabbitMQ: Publish opportunity updates

---

### **5. Identity Module** (Security & Multi-Tenancy)
**Scope**: User management, authentication, tenant isolation  
**Key Entities**: Tenant, User

**Architecture**:
- **Keycloak**: Centralized identity provider (OpenID Connect)
- **JWT Claims**: Tenant ID and role information
- **Hibernate Filters**: Per-entity data isolation
- **PostgreSQL RLS**: Row-level security policies

**Multi-Tenancy Enforcement**:
1. Request includes `X-Tenant-Id` header
2. Keycloak validates JWT + tenant claim
3. Hibernate filter automatically applies `WHERE tenantId = ?`
4. PostgreSQL RLS policy prevents data leakage
5. Application code double-checks tenant context

**User Roles**:
- `SUPER_ADMIN`: System-wide access, tenant management
- `EMPLOYER`: Full access to tenant modules
- `EMPLOYEE`: Scoped access (Sales, Inventory, Achat)
- `CLIENT`: Portal access only

---

### **6. CMS Module** (Configuration)
**Scope**: Tenant branding, notifications, customization  
**Key Entities**: TenantBranding, TenantNotice

**Features**:
- Logo and favicon management (SeaweedFS)
- Color scheme customization
- Custom CSS support
- Tenant-wide notices/announcements
- Expirable notifications

---

### **7. AI Service** (Analytics & Forecasting)
**Scope**: Demand forecasting, stock level recommendations  
**Tech Stack**: Python, Ollama (LLM), Prophet (Time-series)

**Features**:
- Historical demand analysis from StockMovement ledger
- Time-series forecasting (Prophet)
- Reorder point suggestions
- Trend detection
- Seasonal demand patterns

**Data Sources**:
- ← Inventory Service: StockMovement history
- ← Sales Service: Order patterns

---

## 🔄 Event-Driven Architecture

### **Event Bus: RabbitMQ**

All services communicate asynchronously via domain events:

#### **Sales Service Events**
- `sales.devis.created` - Quote request created
- `sales.devis.sent` - Quote sent to client
- `sales.devis.accepted` - Quote accepted → trigger Commande creation
- `sales.commande.created` - Order created
- `sales.commande.confirmed` - Order confirmed → trigger inventory reserve
- `sales.livraison.completed` - Delivery completed → trigger stock deduction
- `sales.facture.sent` - Invoice sent
- `sales.facture.paid` - Invoice paid → audit log

#### **Achat Service Events**
- `achat.bonCommande.created` - PO created
- `achat.bonCommande.confirmed` - PO confirmed → trigger inventory reserve
- `achat.bonReception.completed` - GRN completed → trigger stock update
- `achat.bonReception.anomalies` - Quality issues detected

#### **Inventory Service Events**
- `inventory.stock.reserved` - Stock reserved for order
- `inventory.stock.updated` - Stock quantity changed
- `inventory.stock.movement` - Movement logged

#### **CRM Service Events**
- `crm.prospect.converted` - Lead converted to client
- `crm.opportunity.created` - New sales opportunity
- `crm.opportunity.closed` - Opportunity won/lost

---

## 🗄️ Data Model Relationships

### **Core Entity Hierarchy**

```
BaseEntity (abstract)
  ├─ id: UUID
  ├─ createdAt: Instant
  └─ updatedAt: Instant

Tenant extends BaseEntity
  └─ Owns all data in system

TenantEntity extends BaseEntity
  └─ tenantId: UUID (immutable, set by listener)
  └─ @Filter("tenantFilter") per request

↓ All business entities extend TenantEntity:
├─ User
├─ Prospect, Client, Opportunity
├─ Devis, DevisLine, Commande, Livraison, Facture
├─ BonCommande, BonReception
├─ StockItem, StockMovement, StockLocation
├─ Fournisseur
└─ CatalogProduct
```

### **Key Relationships**

#### **Sales Pipeline**
```
Prospect ──[1:1]──> Client
    ↓ (optional)
Opportunity ──[N:1]──> Client
    ↓
Devis ──[1:N]──> DevisLine
    ↓ (if accepted)
Commande ──[1:N]──> (no table, uses lines from Devis)
    ├─[1:N]──> Livraison ──[1:N]──> LivraisonLine
    └─[1:1]──> Facture ──[1:N]──> FactureLine
    └─[1:N]──> Encaissement (payments)
```

#### **Inventory Transactions**
```
StockItem ──[N:1]──> StockLocation
StockItem ──[N:1]──> CatalogProduct
StockItem ──[1:N]──> StockMovement
              ↓ (references source doc)
              [BonReception | Livraison | Manual]
```

#### **Procurement**
```
Fournisseur ──[1:N]──> BonCommande ──[1:N]──> BonCommandeLigne
                           ↓ (receives goods against)
                        BonReception ──[1:N]──> BonReceptionLigne
                           ↓ (triggers)
                        StockMovement (ACHAT)
```

---

## 🔐 Security Architecture

### **Authentication Flow**
```
1. User logs in via Keycloak
2. Keycloak issues JWT with claims:
   - sub (user ID)
   - tenant_id
   - role
   - email
3. Frontend/Mobile stores JWT
4. Every request includes JWT in Authorization header
5. API Gateway validates JWT signature
6. Request includes X-Tenant-Id header (from JWT)
```

### **Authorization Levels**
```
Level 1: Gateway Authentication
         → Validate JWT signature & expiry

Level 2: Service-level Authorization
         → Check user role (SUPER_ADMIN, EMPLOYER, etc.)

Level 3: Data-level Authorization (Tenant Isolation)
         → Hibernate @Filter on tenantId
         → PostgreSQL RLS on all tenant-scoped tables

Level 4: Application Code
         → Double-check tenant context
         → Enforce business rules
```

### **Tenant Isolation Mechanism**
```sql
-- Every table has tenantId column (except Tenant itself)
CREATE TABLE sales.devis (
    id UUID PRIMARY KEY,
    tenantId UUID NOT NULL REFERENCES tenant(id),
    ...
);

-- RLS Policy prevents cross-tenant queries
CREATE POLICY tenant_isolation ON devis
    USING (tenantId = current_setting('app.current_tenant')::UUID);

-- Hibernate Filter adds WHERE clause automatically
@Filter(name = "tenantFilter", condition = "tenantId = :tenantId")
public class Devis extends TenantEntity { ... }

-- Every query automatically includes WHERE tenantId = ?
```

---

## 📊 Data Flow Patterns

### **Pattern 1: Order Processing Pipeline**
```
Request Validation
    ↓
Business Logic (calculations, validations)
    ↓
Database Transaction (ACID)
    ↓
Event Publishing (RabbitMQ)
    ↓
External Systems (Email, Inventory)
    ↓
Response
```

### **Pattern 2: Stock Synchronization**
```
Sales: Commande.confirmed
    ↓ (RabbitMQ)
Inventory: Listen to commande.confirmed
    ↓
Reserve Stock (update StockItem.reservedQuantity)
    ↓
Update Cache
    ↓
Return Status

Sales: Livraison.completed
    ↓ (RabbitMQ)
Inventory: Listen to livraison.completed
    ↓
Record Movement (insert StockMovement)
    ↓
Update Stock (StockItem.quantity -= delivered)
    ↓
Update Cache
    ↓
Publish stock.updated event
```

### **Pattern 3: Eventual Consistency**
```
Service A: Execute local transaction
    ↓
Service A: Publish domain event
    ↓ (async via RabbitMQ)
Service B: Receive event
    ↓
Service B: Execute local transaction
    ↓ (retry logic with exponential backoff)
    ↓ (idempotent operations)
```

---

## 🚀 Deployment Architecture

### **Docker Containers**
```
backend/
  ├─ achat/Dockerfile
  ├─ cms/Dockerfile
  ├─ crm/Dockerfile
  ├─ gateway/Dockerfile
  ├─ identity/Dockerfile (not containerized, Keycloak used)
  ├─ inventory/Dockerfile
  └─ sales/Dockerfile

frontend/Dockerfile (Angular)
mobile/ (Flutter - native builds)
ai-service/Dockerfile (Python)

docker-compose.yml - Orchestrates all services
```

### **Infrastructure Services**
```
PostgreSQL (Primary Database)
RabbitMQ (Message Broker)
Keycloak (Identity Provider)
SeaweedFS (File Storage)
Prometheus (Metrics)
Grafana (Visualization)
Loki (Log Aggregation)
```

---

## 📈 Performance Considerations

### **Caching Strategies**
- **Stock Levels**: Redis cache (invalidate on movement)
- **Catalog Products**: Distributed cache (invalidate on update)
- **User Permissions**: In-memory cache (5-min TTL)
- **Tenant Config**: Redis (invalidate on change)

### **Database Optimization**
- Indexes on tenantId for all queries
- Indexes on foreign keys (clientId, productId, etc.)
- Indexes on date ranges (createdAt, deliveryDate)
- Composite indexes for common filters

### **API Patterns**
- Pagination (limit/offset) for all list endpoints
- Lazy loading relationships to reduce payload
- Separate endpoints for summaries vs. detail
- Batch operations for bulk updates

---

## 📋 Integration Points

### **External Systems**
| System | Integration | Type | Purpose |
|--------|-----------|------|---------|
| Email Service | SMTP | Outbound | Notifications (quote, invoice) |
| SMS Service | Twilio/Local | Outbound | Delivery alerts |
| Accounting | API | Bidirectional | Invoice sync |
| Payment Gateway | Stripe/Local | Outbound | Payment processing |
| Analytics | Google Analytics | Outbound | User behavior tracking |
| Reporting | PowerBI/Tableau | Outbound | Business intelligence |

---

## 🧪 Testing Strategy

### **Unit Tests**
- Service layer business logic
- Entity validation rules
- Utility functions

### **Integration Tests**
- Database transactions
- Event publishing
- Service-to-service calls

### **E2E Tests**
- Quote-to-Payment workflow
- Procurement workflow
- Inventory consistency

### **Performance Tests**
- Database query performance
- API response times
- Concurrent user load

---

## 📚 API Documentation

Each service provides REST API endpoints:

| Service | Base Path | Key Endpoints |
|---------|-----------|---------------|
| Sales | `/api/sales` | `/devis`, `/commande`, `/livraison`, `/facture` |
| Achat | `/api/achat` | `/bonCommande`, `/bonReception`, `/fournisseur` |
| Inventory | `/api/inventory` | `/stockItem`, `/stockMovement`, `/location` |
| CRM | `/api/crm` | `/prospect`, `/client`, `/opportunity` |
| Identity | `/api/identity` | `/tenant`, `/user` |
| CMS | `/api/cms` | `/branding`, `/notice` |

---

## 🔄 Development Workflow

### **Running the Project**
```bash
# Start all services via Docker Compose
./start.sh  # Linux/Mac
./start.ps1 # Windows PowerShell
./start.bat # Windows CMD

# Services start in order:
1. PostgreSQL + RabbitMQ
2. Keycloak (identity)
3. Backend microservices
4. Frontend (Angular)
5. AI service (Python)
```

### **Common Tasks**
- Create new module: Use Maven template in backend/
- Add new endpoint: Extend Spring Boot controller + service
- Add new entity: Create JPA entity + repository + test
- Publish event: Use Spring ApplicationEventPublisher
- Subscribe to event: Use @RabbitListener annotation

---

## 📝 Key Decisions

### **Why Microservices?**
- Independent deployment per module
- Technology flexibility per service
- Scalability per service
- Team autonomy

### **Why Event-Driven?**
- Loose coupling between services
- Audit trail of all business events
- Easy to add new subscribers
- Supports complex workflows

### **Why Multi-Tenancy?**
- Single codebase serves multiple customers
- Data isolation at database level
- Cost-effective scaling
- Easy to add new tenants

### **Why Keycloak?**
- Open-source, production-grade
- OIDC/SAML support
- Multi-tenant capability
- JWT token generation

---

## 🎓 Learning Resources

- **Entity Relationships**: See [CLASS_DIAGRAM.md](./CLASS_DIAGRAM.md)
- **User Interactions**: See [USECASE_DIAGRAM.md](./USECASE_DIAGRAM.md)
- **System Workflows**: See [INTERACTION_DIAGRAMS.md](./INTERACTION_DIAGRAMS.md)
- **Module Documentation**: See individual `README.md` in each module
- **API Documentation**: Swagger/OpenAPI at `/swagger-ui.html` per service

