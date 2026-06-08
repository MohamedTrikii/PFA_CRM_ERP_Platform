-- ─────────────────────────────────────────────────────────────────────────────
-- Achat module schema: fournisseurs, bons_commande, bons_reception
-- ─────────────────────────────────────────────────────────────────────────────

-- Fournisseurs (suppliers)
CREATE TABLE IF NOT EXISTS fournisseurs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID        NOT NULL,
    nom          VARCHAR(255) NOT NULL,
    code         VARCHAR(64)  NOT NULL,
    email        VARCHAR(255),
    telephone    VARCHAR(64),
    adresse      TEXT,
    pays         VARCHAR(64)  DEFAULT 'MA',
    actif        BOOLEAN      NOT NULL DEFAULT TRUE,
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs FORCE ROW LEVEL SECURITY;
CREATE POLICY fournisseurs_tenant_isolation ON fournisseurs
    USING (tenant_id = current_tenant_id());

-- Bons de commande fournisseur
CREATE TABLE IF NOT EXISTS bons_commande (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    fournisseur_id  UUID        NOT NULL REFERENCES fournisseurs(id),
    reference       VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'BROUILLON',
    date_commande   DATE,
    date_livraison_prevue DATE,
    total_ht        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_tva       NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_ttc       NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, reference)
);

ALTER TABLE bons_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_commande FORCE ROW LEVEL SECURITY;
CREATE POLICY bons_commande_tenant_isolation ON bons_commande
    USING (tenant_id = current_tenant_id());

-- Lignes de bon de commande
CREATE TABLE IF NOT EXISTS bons_commande_lignes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bon_commande_id UUID        NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
    product_id      UUID,
    designation     VARCHAR(255) NOT NULL,
    unite           VARCHAR(32)  DEFAULT 'unité',
    quantite        NUMERIC(14,3) NOT NULL,
    prix_unitaire_ht NUMERIC(14,2) NOT NULL,
    tva_rate        NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    total_ht        NUMERIC(14,2) NOT NULL,
    position        INTEGER      NOT NULL DEFAULT 0
);

-- Bons de réception
CREATE TABLE IF NOT EXISTS bons_reception (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    bon_commande_id UUID        NOT NULL REFERENCES bons_commande(id),
    reference       VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'EN_COURS',
    date_reception  DATE         NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE bons_reception ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_reception FORCE ROW LEVEL SECURITY;
CREATE POLICY bons_reception_tenant_isolation ON bons_reception
    USING (tenant_id = current_tenant_id());

-- Lignes de bon de réception
CREATE TABLE IF NOT EXISTS bons_reception_lignes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bon_reception_id UUID        NOT NULL REFERENCES bons_reception(id) ON DELETE CASCADE,
    bon_commande_ligne_id UUID   REFERENCES bons_commande_lignes(id),
    product_id       UUID,
    designation      VARCHAR(255) NOT NULL,
    quantite_commandee NUMERIC(14,3) NOT NULL DEFAULT 0,
    quantite_recue   NUMERIC(14,3) NOT NULL,
    location_id      UUID,
    position         INTEGER      NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fournisseurs_tenant       ON fournisseurs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bons_commande_tenant      ON bons_commande(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bons_commande_fournisseur ON bons_commande(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_bons_reception_tenant     ON bons_reception(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bons_reception_bc         ON bons_reception(bon_commande_id);
