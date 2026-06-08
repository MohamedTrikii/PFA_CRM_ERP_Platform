-- ─────────────────────────────────────────────
-- V1 – Sales schema: Products, Devis, Commandes,
--       Livraisons, Factures, Encaissements
-- ─────────────────────────────────────────────

-- ── Catalog Products ─────────────────────────
CREATE TABLE catalog_products (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    reference       VARCHAR(64)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    tva_rate        NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    unit            VARCHAR(32)  NOT NULL DEFAULT 'unité', -- unité|m²|ml|kg|h
    category        VARCHAR(64),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catalog_products
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_products_tenant ON catalog_products (tenant_id, active);

-- ── Devis (Quotes) ────────────────────────────
CREATE TABLE devis (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    client_id       UUID         NOT NULL,    -- soft ref → crm.clients
    opportunity_id  UUID,                     -- soft ref → crm.opportunities
    reference       VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'BROUILLON',
    -- BROUILLON | ENVOYE | ACCEPTE | REFUSE | EXPIRE
    valid_until     DATE,
    notes           TEXT,
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_ht        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_tva       NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_ttc       NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON devis
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_devis_tenant_status ON devis (tenant_id, status);
CREATE INDEX idx_devis_client ON devis (client_id);

CREATE TABLE devis_lines (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_id         UUID         NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    product_id       UUID,                       -- soft ref → catalog_products
    product_snapshot JSONB        NOT NULL,      -- {reference, name, unit, tva_rate} captured at line creation
    description      TEXT,
    quantity         NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit_price       NUMERIC(12,2) NOT NULL,
    tva_rate         NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    discount_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    total_ht         NUMERIC(14,2) NOT NULL DEFAULT 0,
    position         SMALLINT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_devis_lines_devis ON devis_lines (devis_id);

-- ── Commandes (Orders) ───────────────────────
CREATE TABLE commandes (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID         NOT NULL,
    devis_id              UUID         NOT NULL REFERENCES devis(id),
    reference             VARCHAR(64)  NOT NULL,
    status                VARCHAR(32)  NOT NULL DEFAULT 'EN_ATTENTE',
    -- EN_ATTENTE | CONFIRMEE | EN_COURS | LIVREE | ANNULEE
    delivery_address      JSONB,
    expected_delivery_date DATE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON commandes
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_commandes_tenant_status ON commandes (tenant_id, status);
CREATE INDEX idx_commandes_devis ON commandes (devis_id);

-- ── Livraisons (Deliveries) ──────────────────
CREATE TABLE livraisons (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    commande_id     UUID         NOT NULL REFERENCES commandes(id),
    reference       VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PLANIFIEE',
    -- PLANIFIEE | EN_COURS | LIVREE | ANNULEE
    delivery_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE livraisons FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON livraisons
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_livraisons_tenant_status ON livraisons (tenant_id, status);

CREATE TABLE livraison_lines (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    livraison_id        UUID          NOT NULL REFERENCES livraisons(id) ON DELETE CASCADE,
    product_id          UUID,
    product_reference   VARCHAR(64),
    quantity_ordered    NUMERIC(10,3) NOT NULL,
    quantity_delivered  NUMERIC(10,3) NOT NULL DEFAULT 0
);

CREATE INDEX idx_livraison_lines_liv ON livraison_lines (livraison_id);

-- ── Factures (Invoices) ──────────────────────
CREATE TABLE factures (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    commande_id     UUID         REFERENCES commandes(id),
    client_id       UUID         NOT NULL,
    reference       VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'BROUILLON',
    -- BROUILLON | EMISE | PARTIELLEMENT_PAYEE | PAYEE | EN_RETARD | ANNULEE
    issue_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    notes           TEXT,
    total_ht        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_tva       NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_ttc       NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON factures
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_factures_tenant_status ON factures (tenant_id, status);

CREATE TABLE facture_lines (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    facture_id      UUID          NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    product_id      UUID,
    description     TEXT,
    quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL,
    tva_rate        NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    discount_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    total_ht        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_tva       NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_ttc       NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_facture_lines_facture ON facture_lines (facture_id);

-- ── Encaissements (Payments) ─────────────────
CREATE TABLE encaissements (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID          NOT NULL,
    facture_id      UUID          NOT NULL REFERENCES factures(id),
    amount          NUMERIC(14,2) NOT NULL,
    payment_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    payment_method  VARCHAR(32)   NOT NULL DEFAULT 'VIREMENT', -- VIREMENT|CHEQUE|ESPECES|CB|PRELEVEMENT
    reference       VARCHAR(64),
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE encaissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE encaissements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON encaissements
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_encaissements_facture ON encaissements (facture_id);
CREATE INDEX idx_encaissements_tenant ON encaissements (tenant_id, payment_date DESC);

-- ── Sequence helpers for readable references ─
CREATE SEQUENCE IF NOT EXISTS seq_devis_ref     START 1000;
CREATE SEQUENCE IF NOT EXISTS seq_commande_ref  START 1000;
CREATE SEQUENCE IF NOT EXISTS seq_livraison_ref START 1000;
CREATE SEQUENCE IF NOT EXISTS seq_facture_ref   START 1000;
