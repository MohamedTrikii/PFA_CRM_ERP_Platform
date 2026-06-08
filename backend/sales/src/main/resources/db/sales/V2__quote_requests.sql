-- ─────────────────────────────────────────────
-- V2 – Quote requests (demandes de devis),
--      attachments for any sales document
-- ─────────────────────────────────────────────

-- ── Devis Requests (customer-submitted) ──────
CREATE TABLE devis_requests (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    client_id       UUID,                        -- set after CRM client is matched/created
    client_name     VARCHAR(255) NOT NULL,
    client_email    VARCHAR(255),
    client_phone    VARCHAR(32),
    client_address  TEXT,
    project_type    VARCHAR(64)  NOT NULL,        -- FENETRE|PORTE|PORTE_FENETRE|BAIE_VITREE|VERANDAS|GARDE_CORPS|AUTRE
    description     TEXT,
    status          VARCHAR(32)  NOT NULL DEFAULT 'NOUVEAU',
    -- NOUVEAU | EN_ETUDE | DEVIS_CREE | REFUSE
    converted_devis_id UUID,                     -- set when converted to a Devis
    notes           TEXT,                        -- internal employee notes
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE devis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON devis_requests
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_devis_requests_tenant_status  ON devis_requests (tenant_id, status);
CREATE INDEX idx_devis_requests_client_email   ON devis_requests (tenant_id, client_email);

-- ── Quote request line items ──────────────────
CREATE TABLE devis_request_items (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID         NOT NULL REFERENCES devis_requests(id) ON DELETE CASCADE,
    quantity        SMALLINT     NOT NULL DEFAULT 1,
    width_mm        NUMERIC(8,1) NOT NULL,       -- overall width in mm
    height_mm       NUMERIC(8,1) NOT NULL,       -- overall height in mm
    profile_series  VARCHAR(64),                 -- e.g. 40mm, 45mm, 60mm, SERIES_II
    opening_type    VARCHAR(64),                 -- FIXE|BATTANT|COULISSANT|OSCILLO_BATTANT|PIVOTANT
    glass_type      VARCHAR(64),                 -- SIMPLE_4|DV_4_16_4|DV_SECURITE|FEUILLETE|ARGON
    color           VARCHAR(64),                 -- RAL 9016 Blanc|RAL 7016 Anthracite|Bois|Anodisé
    accessories     TEXT,                        -- free-form: serrures, poignées, grilles, etc.
    notes           TEXT,
    position        SMALLINT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_request_items_request ON devis_request_items (request_id);

-- ── Attachments (files stored in SeaweedFS) ───
CREATE TABLE devis_attachments (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL,
    entity_type     VARCHAR(32)  NOT NULL,       -- DEVIS_REQUEST | DEVIS
    entity_id       UUID         NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    content_type    VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    file_size       BIGINT       NOT NULL DEFAULT 0,
    seaweed_path    VARCHAR(512) NOT NULL,       -- path in SeaweedFS filer
    uploaded_by     UUID,                        -- user id
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE devis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON devis_attachments
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_attachments_entity ON devis_attachments (tenant_id, entity_type, entity_id);
