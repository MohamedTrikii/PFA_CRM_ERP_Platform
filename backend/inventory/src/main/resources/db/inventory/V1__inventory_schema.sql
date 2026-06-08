-- ─────────────────────────────────────────────
-- V1 – Inventory schema:
--       Stock Locations, Stock Items, Stock Movements
-- ─────────────────────────────────────────────

-- ── Stock Locations ──────────────────────────
CREATE TABLE stock_locations (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL,
    code        VARCHAR(32)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(32)  NOT NULL DEFAULT 'WAREHOUSE', -- WAREHOUSE|SHELF|ZONE|EXTERNAL
    description TEXT,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_locations
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_locations_tenant ON stock_locations (tenant_id);

-- ── Stock Items (current on-hand per product × location) ──
CREATE TABLE stock_items (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID          NOT NULL,
    product_id          UUID          NOT NULL,   -- soft ref → sales.catalog_products
    product_reference   VARCHAR(64)   NOT NULL,   -- snapshot for display
    location_id         UUID          NOT NULL REFERENCES stock_locations(id),
    quantity            NUMERIC(10,3) NOT NULL DEFAULT 0,
    min_quantity        NUMERIC(10,3) NOT NULL DEFAULT 0,
    max_quantity        NUMERIC(10,3),
    last_movement_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, product_id, location_id)
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_items
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_stock_items_tenant_product ON stock_items (tenant_id, product_id);
CREATE INDEX idx_stock_items_low_stock
    ON stock_items (tenant_id, product_id)
    WHERE quantity <= min_quantity AND min_quantity > 0;

-- ── Stock Movements (immutable ledger) ────────
CREATE TABLE stock_movements (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID          NOT NULL,
    product_id        UUID          NOT NULL,
    product_reference VARCHAR(64)   NOT NULL,
    location_id       UUID          NOT NULL REFERENCES stock_locations(id),
    movement_type     VARCHAR(32)   NOT NULL,
    -- ENTREE | SORTIE | INVENTAIRE | TRANSFERT_SORTIE | TRANSFERT_ENTREE | RETOUR
    quantity          NUMERIC(10,3) NOT NULL,         -- always positive; direction encoded in type
    quantity_before   NUMERIC(10,3) NOT NULL DEFAULT 0,
    quantity_after    NUMERIC(10,3) NOT NULL DEFAULT 0,
    reference         VARCHAR(64),                    -- e.g. "LIV-1042" or "INV-2024-01"
    source_type       VARCHAR(32),                    -- LIVRAISON | RECEPTION | INVENTAIRE | MANUAL
    source_id         UUID,                           -- FK to the source document
    notes             TEXT,
    created_by        UUID,                           -- soft ref → users.id
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
    -- Immutable: no UPDATE or DELETE allowed (enforced by service layer + RLS INSERT-only policy)
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON stock_movements
    FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_insert ON stock_movements
    FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
-- No UPDATE / DELETE policies → movements are append-only by policy

CREATE INDEX idx_movements_tenant_product ON stock_movements (tenant_id, product_id, created_at DESC);
CREATE INDEX idx_movements_source ON stock_movements (source_type, source_id);
CREATE INDEX idx_movements_tenant_date ON stock_movements (tenant_id, created_at DESC);
