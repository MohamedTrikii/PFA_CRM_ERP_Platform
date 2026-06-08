-- ─────────────────────────────────────────────
-- V4 – Audit log hash chain + employee function
-- ─────────────────────────────────────────────

-- Hash chain columns on audit_log
ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS hash      VARCHAR(64);

-- PostgreSQL function: compute SHA-256 hash for one audit row.
-- Called by the BEFORE INSERT trigger so the hash is always set atomically.
CREATE OR REPLACE FUNCTION audit_log_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_prev_hash TEXT;
    v_content   TEXT;
BEGIN
    -- Grab the last hash for this tenant (serialised by the INSERT lock on the table)
    SELECT hash INTO v_prev_hash
    FROM   audit_log
    WHERE  tenant_id = NEW.tenant_id
    ORDER  BY id DESC
    LIMIT  1;

    IF v_prev_hash IS NULL OR v_prev_hash = '' THEN
        v_prev_hash := 'GENESIS';
    END IF;

    NEW.prev_hash := v_prev_hash;

    -- Content string: every meaningful field separated by '|'
    v_content := CONCAT_WS('|',
        NEW.id::TEXT,
        NEW.tenant_id::TEXT,
        COALESCE(NEW.actor_id::TEXT,    'NULL'),
        NEW.action,
        COALESCE(NEW.entity_type,       'NULL'),
        COALESCE(NEW.entity_id,         'NULL'),
        COALESCE(NEW.payload::TEXT,     'NULL'),
        NEW.created_at::TEXT,
        v_prev_hash
    );

    -- encode(digest(text, 'sha256'), 'hex') requires pgcrypto (already installed)
    NEW.hash := encode(digest(v_content, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_hash
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_compute_hash();

-- Index for fast audit tail queries (verify chain integrity)
CREATE INDEX IF NOT EXISTS idx_audit_tenant_id_desc ON audit_log (tenant_id, id DESC);

-- Employee function (scopes EMPLOYEE's capabilities to a business area)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_function') THEN
        CREATE TYPE employee_function AS ENUM (
            'SALES', 'WAREHOUSE', 'BUYER', 'ACCOUNTANT', 'SUPPORT', 'MANAGER'
        );
    END IF;
END $$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_function employee_function;

-- Only EMPLOYEE rows need a function; EMPLOYER/CLIENT/SUPER_ADMIN may leave it NULL
COMMENT ON COLUMN users.employee_function IS
    'Scopes EMPLOYEE access to a business function; NULL for other roles';
