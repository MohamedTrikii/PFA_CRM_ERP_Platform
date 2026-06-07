# System Interaction & Sequence Diagrams

## 1. Quote-to-Payment Workflow

```mermaid
sequenceDiagram
    actor Client
    participant Portal as Client Portal
    participant Sales as Sales Service
    participant Inventory as Inventory Service
    participant MessageQueue as RabbitMQ
    participant Email as Email Notifier

    Client->>Portal: 1. Submit DevisRequest
    Portal->>Sales: Create DevisRequest (status=NOUVEAU)
    Sales->>MessageQueue: devis.request.created event
    
    Note over Sales,MessageQueue: Employer Views Request
    
    Sales->>Sales: 2. Create Devis (status=BROUILLON)
    Sales->>Sales: Add DevisLines from CatalogProduct
    Sales->>Sales: Calculate totals (HT, TVA, TTC)
    
    Sales->>Sales: 3. Transition Devis → ENVOYE
    Sales->>MessageQueue: devis.sent event
    MessageQueue->>Email: Send Devis to Client
    
    Client->>Portal: 4. Accept Devis
    Portal->>Sales: Update Devis.status = ACCEPTE
    Sales->>MessageQueue: devis.accepted event
    
    Note over Sales,Inventory: Create & Confirm Order
    
    Sales->>Sales: 5. Create Commande from Devis
    Sales->>Inventory: Reserve Stock for Commande lines
    Inventory->>Inventory: Update StockItem.reservedQuantity
    Sales->>MessageQueue: commande.created event
    
    Sales->>Sales: 6. Confirm Commande (status=CONFIRMEE)
    Sales->>MessageQueue: commande.confirmed event
    
    Note over Sales,Inventory: Record Delivery
    
    Sales->>Sales: 7. Create Livraison (status=PLANIFIEE)
    Sales->>Sales: Employee marks LIVREE
    Sales->>Inventory: Record Stock Movements
    Inventory->>Inventory: StockItem.quantity -= delivered
    Inventory->>Inventory: Create StockMovement(VENTE)
    Sales->>MessageQueue: livraison.completed event
    
    Note over Sales,Email: Generate & Send Invoice
    
    Sales->>Sales: 8. Create Facture from Commande
    Sales->>Sales: Copy lines + calculate totals
    Sales->>Sales: 9. Send Facture (status=ENVOYE)
    Sales->>MessageQueue: facture.sent event
    MessageQueue->>Email: Send Invoice to Client
    
    Client->>Portal: 10. Record Payment
    Portal->>Sales: Create Encaissement
    Sales->>Sales: Update Facture.status = PAYEE
    Sales->>MessageQueue: facture.paid event
    
    Sales->>Portal: Delivery Complete ✓
```

---

## 2. Procurement Workflow

```mermaid
sequenceDiagram
    actor Employer
    participant Achat as Achat Service
    participant Inventory as Inventory Service
    participant RabbitMQ as Message Queue
    
    Employer->>Achat: 1. Create BonCommande (status=BROUILLON)
    Achat->>Achat: Add BonCommandeLignes
    Achat->>Achat: Calculate totals (HT, TVA, TTC)
    
    Employer->>Achat: 2. Send to Supplier (status=ENVOYE)
    
    Note over Achat,RabbitMQ: Supplier Confirms & Ships
    
    Achat->>Achat: 3. Update BonCommande → CONFIRME
    Achat->>Inventory: Temporary Stock Reserve
    Achat->>RabbitMQ: bonCommande.confirmed event
    
    Achat->>Achat: 4. Update BonCommande → EN_COURS
    
    Note over Achat,Inventory: Receive Goods
    
    Achat->>Achat: 5. Create BonReception (status=EN_COURS)
    Employer->>Achat: Scan/receive items
    Achat->>Achat: Update quantityReceived for each line
    
    Employer->>Achat: 6. Complete BonReception
    Achat->>Achat: BonReception.status = COMPLETE
    Achat->>RabbitMQ: bonReception.completed event
    
    RabbitMQ->>Inventory: bonReception.completed event
    Inventory->>Inventory: For each BonReceptionLigne:
    Inventory->>Inventory:   - StockItem.quantity += quantityReceived
    Inventory->>Inventory:   - Create StockMovement(ACHAT)
    Inventory->>RabbitMQ: stock.updated event
    
    Achat->>Achat: 7. Update BonCommande → LIVRE
    RabbitMQ->>Achat: stock.updated event
    
    Note over Achat,Inventory: Discrepancies Handling
    
    opt If Issues
        Employer->>Achat: 8. Mark anomalies
        Achat->>Achat: BonReception.status = ANOMALIES
        Achat->>RabbitMQ: bonReception.anomalies event
    end
```

---

## 3. Inventory Stock Lifecycle

```mermaid
graph TB
    subgraph Purchase["PURCHASE FLOW"]
        BR["BonReception<br/>(COMPLETE)"]
        SM1["StockMovement<br/>(ACHAT)"]
        SI1["StockItem<br/>quantity += received"]
    end

    subgraph Sales["SALES FLOW"]
        CMD["Commande<br/>(CONFIRMEE)"]
        SI2["StockItem<br/>reservedQuantity += ordered"]
        LIV["Livraison<br/>(LIVREE)"]
        SM2["StockMovement<br/>(VENTE)"]
        SI3["StockItem<br/>quantity -= delivered"]
        FAC["Facture<br/>(PAYEE)"]
    end

    subgraph Adjustments["ADJUSTMENTS"]
        ADJ["Manual Adjustment<br/>(by Employee)"]
        SM3["StockMovement<br/>(AJUSTEMENT)"]
        SI4["StockItem<br/>quantity ± adjusted"]
    end

    subgraph Returns["RETURNS"]
        RET["Customer Return<br/>(from Livraison)"]
        SM4["StockMovement<br/>(RETOUR)"]
        SI5["StockItem<br/>quantity += returned"]
    end

    subgraph Analytics["ANALYTICS & FORECASTING"]
        LEDGER["Stock Ledger<br/>(all movements)"]
        AI["AI Service<br/>(Forecast demand)"]
        REORDER["Reorder Level<br/>Suggestions"]
    end

    BR -->|triggers| SM1
    SM1 -->|creates| SI1
    
    CMD -->|updates| SI2
    LIV -->|completes| SM2
    SM2 -->|creates| SI3
    SI3 -->|updates| FAC
    
    ADJ -->|logs| SM3
    SM3 -->|updates| SI4
    
    RET -->|creates| SM4
    SM4 -->|updates| SI5
    
    SM1 & SM2 & SM3 & SM4 -->|all tracked in| LEDGER
    LEDGER -->|analyzed by| AI
    AI -->|generates| REORDER
    
    style Purchase fill:#e3f2fd
    style Sales fill:#f3e5f5
    style Adjustments fill:#fce4ec
    style Returns fill:#fff3e0
    style Analytics fill:#c8e6c9
```

---

## 4. Data Flow: Commande → Livraison → Facture

```mermaid
graph LR
    subgraph Commande_State["Commande State"]
        CMD["Commande"]
        CMDL["CommandeLine<br/>(quantity, price)"]
        CMD -->|contains| CMDL
    end

    subgraph Livraison_State["Livraison State"]
        LIV["Livraison"]
        LIVL["LivraisonLine<br/>(qty requested,<br/>qty delivered)"]
        LIV -->|contains| LIVL
    end

    subgraph Facture_State["Facture State"]
        FAC["Facture"]
        FACL["FactureLine<br/>(copied from<br/>Commande)"]
        FAC -->|contains| FACL
    end

    subgraph Inventory_Impact["Inventory Impact"]
        SM["StockMovement<br/>(VENTE)"]
        SI["StockItem<br/>quantity -= delivered"]
        SM -->|updates| SI
    end

    CMD -->|parent of| LIV
    LIV -->|qty delivered<br/>reference| LIVL
    LIVL -->|triggers| SM
    
    CMD -->|parent of| FAC
    CMDL -->|data copied to| FACL
    
    LIV -->|completion<br/>triggers| FAC
    
    style Commande_State fill:#f3e5f5,stroke:#9c27b0
    style Livraison_State fill:#e3f2fd,stroke:#2196f3
    style Facture_State fill:#fff3e0,stroke:#ff9800
    style Inventory_Impact fill:#fce4ec,stroke:#e91e63
```

---

## 5. Multi-Tenancy Enforcement

```mermaid
graph TB
    subgraph Request["HTTP Request"]
        H["Headers:<br/>X-Tenant-Id: UUID<br/>Authorization: JWT"]
    end

    subgraph Auth["Authentication & Authorization"]
        KC["Keycloak<br/>(JWT Validation)"]
        CLAIM["JWT Claim:<br/>tenant_id"]
        KC -->|validates| CLAIM
    end

    subgraph Isolation["Data Isolation Layers"]
        FILTER["@Filter<br/>tenantId = ?"]
        RLS["PostgreSQL RLS<br/>Policy"]
        APP["Application Code<br/>Checks"]
    end

    subgraph Database["Database Level"]
        TENANT["Tenant 1"]
        DATA1["All entities<br/>scoped by<br/>tenantId"]
        TENANT -->|isolates| DATA1
        
        TENANT2["Tenant 2"]
        DATA2["Separate<br/>data<br/>schema"]
        TENANT2 -->|isolates| DATA2
    end

    Request -->|includes| H
    H -->|sent to| KC
    KC -->|enforces| CLAIM
    
    CLAIM -->|passed to| FILTER
    FILTER -->|filters| RLS
    RLS -->|enforces| APP
    
    APP -->|queries| Database
    DATABASE -->|isolates| TENANT
    DATABASE -->|isolates| TENANT2
    
    style Request fill:#e3f2fd
    style Auth fill:#c8e6c9
    style Isolation fill:#fff9c4
    style Database fill:#fce4ec
```

---

## 6. Event-Driven Architecture

```mermaid
graph TB
    subgraph Services["Services"]
        SALES["Sales Service"]
        ACHAT["Achat Service"]
        INV["Inventory Service"]
        EMAIL["Email Service"]
        REPORT["Reporting Service"]
    end

    subgraph Events["Domain Events"]
        E1["devis.accepted"]
        E2["commande.confirmed"]
        E3["livraison.completed"]
        E4["bonReception.completed"]
        E5["facture.sent"]
        E6["facture.paid"]
    end

    subgraph Queue["RabbitMQ Message Queue"]
        MQ["Message Broker<br/>(Durable, Acknowledged)"]
    end

    SALES -->|publishes| E1
    SALES -->|publishes| E2
    SALES -->|publishes| E3
    SALES -->|publishes| E5
    SALES -->|publishes| E6
    
    ACHAT -->|publishes| E4
    
    E1 & E2 & E3 & E4 & E5 & E6 -->|routes via| MQ
    
    MQ -->|devis.accepted| INV
    MQ -->|commande.confirmed| INV
    MQ -->|livraison.completed| INV
    MQ -->|bonReception.completed| INV
    
    MQ -->|devis.accepted| SALES
    MQ -->|facture.sent| EMAIL
    MQ -->|facture.paid| EMAIL
    MQ -->|commande.confirmed| REPORT
    MQ -->|livraison.completed| REPORT
    
    INV -->|stock.updated| REPORT
    
    style Services fill:#e3f2fd
    style Events fill:#f3e5f5
    style Queue fill:#c8e6c9
```

---

## 7. Cross-Service Dependencies

```mermaid
graph TB
    subgraph Modules["Microservices"]
        SALES["Sales Service<br/>Devis, Commande<br/>Livraison, Facture"]
        ACHAT["Achat Service<br/>BonCommande<br/>BonReception"]
        INV["Inventory Service<br/>StockItem<br/>StockMovement"]
        CRM["CRM Service<br/>Prospect, Client<br/>Opportunity"]
        GATEWAY["API Gateway<br/>Auth, Routing"]
        IDENTITY["Identity Service<br/>Tenant, User<br/>Keycloak"]
        CMS["CMS Service<br/>Branding, Config"]
        AI["AI Service<br/>Forecast<br/>Recommendations"]
    end

    GATEWAY -.->|routes| SALES
    GATEWAY -.->|routes| ACHAT
    GATEWAY -.->|routes| INV
    GATEWAY -.->|routes| CRM
    GATEWAY -.->|routes| CMS
    
    IDENTITY -.->|tenant isolation| SALES
    IDENTITY -.->|tenant isolation| ACHAT
    IDENTITY -.->|tenant isolation| INV
    IDENTITY -.->|tenant isolation| CRM
    
    CRM -.->|provides clients| SALES
    SALES -.->|reserves stock| INV
    ACHAT -.->|receives goods| INV
    INV -.->|stock history| AI
    
    CMS -.->|customizes UI| GATEWAY
    
    style SALES fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    style ACHAT fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style INV fill:#fce4ec,stroke:#e91e63,stroke-width:2px
    style CRM fill:#e0f2f1,stroke:#009688,stroke-width:2px
    style GATEWAY fill:#eceff1,stroke:#455a64,stroke-width:2px
    style IDENTITY fill:#fff9c4,stroke:#fbc02d,stroke-width:2px
    style CMS fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    style AI fill:#e8eaf6,stroke:#5e35b1,stroke-width:2px
```

