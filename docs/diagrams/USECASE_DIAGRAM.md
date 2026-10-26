# Use-Case Diagram: CRM/ERP Platform

```mermaid
graph TB
    subgraph Actors
        Admin["👤 Super Admin"]
        Employer["👤 Employer/Manager"]
        Employee["👤 Employee"]
        Client["👤 Client/Prospect"]
        Supplier["👤 Supplier"]
    end

    subgraph CRM_Module["CRM Module"]
        UC1["Manage Prospects"]
        UC2["Track Opportunities"]
        UC3["Manage Clients"]
    end

    subgraph Sales_Module["Sales Module"]
        UC4["View Catalog Products"]
        UC5["Create Quote Request"]
        UC6["Generate Devis Quote"]
        UC7["Create Sales Order"]
        UC8["Record Delivery"]
        UC9["Generate Invoice"]
        UC10["Record Payment"]
    end

    subgraph Achat_Module["Procurement Module"]
        UC11["Manage Suppliers"]
        UC12["Create PO"]
        UC13["Receive Goods GRN"]
    end

    subgraph Inventory_Module["Inventory Module"]
        UC14["View Stock Levels"]
        UC15["View Stock Ledger"]
        UC16["Adjust Stock"]
    end

    subgraph Admin_Module["Admin Module"]
        UC17["Manage Tenants"]
        UC18["Manage Users"]
        UC19["Audit Logs"]
        UC20["Configure Branding"]
    end

    subgraph AI_Module["AI Service"]
        UC21["Forecast Demand"]
        UC22["Suggest Reorder Levels"]
    end

    %% Admin Relationships
    Admin -->|manage| UC17
    Admin -->|manage| UC18
    Admin -->|view| UC19
    Admin -->|configure| UC20

    %% Employer/Manager Relationships
    Employer -->|create| UC1
    Employer -->|create| UC2
    Employer -->|manage| UC3
    Employer -->|view| UC4
    Employer -->|convert to| UC6
    Employer -->|create| UC7
    Employer -->|receive| UC13
    Employer -->|create| UC12
    Employer -->|view| UC14

    %% Employee Relationships
    Employee -->|view| UC4
    Employee -->|record| UC8
    Employee -->|view| UC14
    Employee -->|record| UC16
    Employee -->|receive| UC13

    %% Client Relationships
    Client -->|submit| UC5
    Client -->|view| UC6
    Client -->|track| UC7
    Client -->|view| UC9

    %% Supplier Relationships
    Supplier -->|receive| UC12
    Supplier -->|ship| UC13

    %% Cross-Module Dependencies
    UC5 -->|triggers| UC6
    UC6 -->|converts to| UC7
    UC7 -->|triggers| UC8
    UC8 -->|triggers| UC9
    UC9 -->|updates| UC10
    UC14 -.->|uses| UC21
    UC14 -.->|suggests| UC22
    UC8 -->|updates| UC14
    UC13 -->|updates| UC14
    UC12 -->|affects| UC14

    style Admin fill:#ff9999
    style Employer fill:#99ccff
    style Employee fill:#99ff99
    style Client fill:#ffcc99
    style Supplier fill:#cc99ff
    style CRM_Module fill:#fff0f5
    style Sales_Module fill:#f0fff0
    style Achat_Module fill:#fffaf0
    style Inventory_Module fill:#f0f8ff
    style Admin_Module fill:#fff5ee
    style AI_Module fill:#f5f5ff
```

## Use Cases by Module

### **CRM Module**
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **Manage Prospects** | Create, qualify, and convert prospects to clients | Employer |
| **Track Opportunities** | Monitor sales opportunities through pipeline | Employer |
| **Manage Clients** | Maintain client information and relationships | Employer |

### **Sales Module** (Main Revenue Workflow)
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **View Catalog Products** | Browse available products for quoting | Employee/Employer |
| **Create Quote Request** | Client submits quote request via portal | Client |
| **Generate Devis Quote** | Convert request to formal quote | Employer |
| **Create Sales Order** | Accept quote and create binding order | Employer |
| **Record Delivery** | Ship goods and update inventory | Employee |
| **Generate Invoice** | Create billing document from order | Employer |
| **Record Payment** | Log customer payments received | Employee |

### **Procurement Module**
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **Manage Suppliers** | Maintain supplier information | Employer |
| **Create PO** | Generate purchase order for supplier | Employer |
| **Receive Goods GRN** | Record goods receipt and update stock | Employee |

### **Inventory Module**
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **View Stock Levels** | Monitor available stock by location | Employee/Employer |
| **View Stock Ledger** | Track all stock movements with audit trail | Employee |
| **Adjust Stock** | Make manual inventory adjustments | Employee |

### **Admin Module**
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **Manage Tenants** | Create and configure tenant organizations | Super Admin |
| **Manage Users** | Add/remove users and assign roles | Super Admin |
| **Audit Logs** | Monitor system activities and changes | Super Admin |
| **Configure Branding** | Customize tenant UI appearance | Super Admin |

### **AI Service**
| Use Case | Description | Primary Actor |
|----------|-------------|----------------|
| **Forecast Demand** | Predict future product demand | System |
| **Suggest Reorder Levels** | Recommend when to reorder stock | System |

---

## Key Workflows

### **UC5 → UC10: Quote-to-Payment Workflow**
```
1. Client submits quote request (DevisRequest)
   ↓
2. Employer converts to Devis quote
   ↓
3. Client accepts → creates Commande (sales order)
   ↓
4. Employee records Livraison (delivery)
   ↓
5. System generates Facture (invoice)
   ↓
6. Client records payment via portal
```

### **UC12 → UC13: Procurement Workflow**
```
1. Employer creates BonCommande (PO) to supplier
   ↓
2. Supplier ships goods
   ↓
3. Employee creates BonReception (goods receipt)
   ↓
4. Stock automatically updated
```

### **UC14 Integration**
- Stock is reserved when Commande is confirmed
- Stock is updated when Livraison is completed
- Stock is updated when BonReception is completed
- AI service uses stock history to forecast demand

