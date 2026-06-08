-- ─────────────────────────────────────────────
-- V1 – Initial identity schema
-- Tenants, Users, Roles (Phase 0 skeleton)
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tenants ──────────────────────────────────
CREATE TABLE tenants (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        VARCHAR(63) NOT NULL UNIQUE,          -- used as subdomain
    name        VARCHAR(255) NOT NULL,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users ─────────────────────────────────────
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id),
    keycloak_id     VARCHAR(36) NOT NULL UNIQUE,       -- Keycloak subject (sub)
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    role            VARCHAR(32) NOT NULL,               -- SUPER_ADMIN | EMPLOYER | EMPLOYEE | CLIENT
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_keycloak ON users (keycloak_id);

-- ── Row Level Security ────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Application connections use set_config('app.tenant_id', ...) per session.
-- SUPER_ADMIN (keycloak role) bypass is handled at the application layer —
-- the policy below isolates all other roles to their tenant.
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- Audit log (append-only, hash-chained — Phase 2 will add the chain column)
CREATE TABLE audit_log (
    id          BIGSERIAL   PRIMARY KEY,
    tenant_id   UUID        NOT NULL,
    actor_id    UUID,                           -- NULL for system events
    action      VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id   TEXT,
    payload     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_log (tenant_id, created_at DESC);
