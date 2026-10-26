-- ─────────────────────────────────────────────
-- V2 – RLS hardening
-- Adds a NULL-safe helper function and tightens
-- policies so an empty/missing tenant_id blocks
-- ALL rows instead of casting NULL to UUID (error).
-- ─────────────────────────────────────────────

-- Safe accessor: returns NULL (no rows) when setting is blank/absent
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v TEXT;
BEGIN
    v := current_setting('app.tenant_id', TRUE);  -- TRUE = return NULL if missing
    IF v IS NULL OR v = '' THEN
        RETURN NULL;
    END IF;
    RETURN v::UUID;
EXCEPTION WHEN others THEN
    RETURN NULL;   -- malformed UUID → deny rather than error
END;
$$;

-- Drop old policy and recreate using the function
DROP POLICY IF EXISTS tenant_isolation ON users;

CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_tenant_id());

-- FORCE ROW LEVEL SECURITY so even the table owner (erp user running migrations)
-- is subject to the policy during application queries.
-- Note: Flyway migrations run before this is enforced because Flyway executes
-- DDL which bypasses row-level checks (DDL is always owner-privileged).
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Index to speed up the RLS-filtered lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_active
    ON users (tenant_id, active)
    WHERE active = TRUE;

-- Also protect audit_log with a read policy (writes are always allowed by app)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_tenant_read ON audit_log
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        OR current_setting('app.is_super_admin', TRUE) = 'true'
    );

CREATE POLICY audit_insert_always ON audit_log
    FOR INSERT
    WITH CHECK (true);  -- app always allowed to write audit entries
