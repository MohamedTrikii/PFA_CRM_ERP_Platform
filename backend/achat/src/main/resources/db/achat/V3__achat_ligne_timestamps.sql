-- ─────────────────────────────────────────────────────────────────────────────
-- V3: Add created_at / updated_at to ligne tables (BaseEntity columns missing)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE bons_commande_lignes
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE bons_reception_lignes
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
