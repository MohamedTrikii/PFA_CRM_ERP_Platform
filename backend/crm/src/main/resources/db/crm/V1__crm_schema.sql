-- ─────────────────────────────────────────────
-- V1 – CRM schema: Prospects, Clients, Opportunities
-- ─────────────────────────────────────────────

CREATE TABLE prospects (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(64),
    company         VARCHAR(255),
    source          VARCHAR(32),   -- REFERRAL | WEBSITE | COLD_CALL | TRADE_SHOW | OTHER
    status          VARCHAR(32)  NOT NULL DEFAULT 'NOUVEAU',  -- NOUVEAU|QUALIFIE|CONVERTI|PERDU
    notes           TEXT,
    assigned_to     UUID,          -- FK to users.id (soft reference — no cross-schema FK)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON prospects
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_prospects_tenant ON prospects (tenant_id, status);

-- ─────────────────────────────────────────────

CREATE TABLE clients (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL,
    prospect_id     UUID        REFERENCES prospects(id) ON DELETE SET NULL,
    reference       VARCHAR(64),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(64),
    address         JSONB,         -- {street, city, zip, country}
    type            VARCHAR(32)  NOT NULL DEFAULT 'PROFESSIONNEL', -- PROFESSIONNEL|PARTICULIER
    notes           TEXT,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clients
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_clients_tenant ON clients (tenant_id);
CREATE INDEX idx_clients_tenant_email ON clients (tenant_id, email);

-- ─────────────────────────────────────────────

CREATE TABLE opportunities (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL,
    client_id           UUID        NOT NULL REFERENCES clients(id),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(32)  NOT NULL DEFAULT 'NOUVELLE', -- NOUVELLE|EN_COURS|GAGNEE|PERDUE
    estimated_value     NUMERIC(14,2),
    probability         SMALLINT     CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    assigned_to         UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON opportunities
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_opportunities_tenant ON opportunities (tenant_id, status);
CREATE INDEX idx_opportunities_client ON opportunities (client_id);
