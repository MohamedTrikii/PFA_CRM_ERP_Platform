-- ── CMS schema: white-label tenant branding ──────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_branding (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL UNIQUE,
    company_name     VARCHAR(255),
    tagline          VARCHAR(512),
    logo_fid         TEXT,                    -- SeaweedFS filer path
    favicon_fid      TEXT,
    primary_color    VARCHAR(16) DEFAULT '#1976D2',
    secondary_color  VARCHAR(16) DEFAULT '#424242',
    font_family      VARCHAR(128) DEFAULT 'Inter, sans-serif',
    custom_css       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_branding_isolation ON tenant_branding
    USING (tenant_id = current_tenant_id());

-- allow public read of one row by tenant_id (used by unauthenticated branding lookup)
CREATE POLICY tenant_branding_public_read ON tenant_branding
    FOR SELECT
    USING (true);

-- tenant_branding is keyed by tenant_id uniquely, so upsert on conflict
-- ── Notices (announcement banners per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_notices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        TEXT,
    severity    VARCHAR(16) NOT NULL DEFAULT 'INFO',  -- INFO, WARNING, ERROR
    active      BOOLEAN NOT NULL DEFAULT true,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_notices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_notices_isolation ON tenant_notices
    USING (tenant_id = current_tenant_id());
