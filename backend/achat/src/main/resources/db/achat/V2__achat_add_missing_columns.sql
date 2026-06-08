-- ─────────────────────────────────────────────────────────────────────────────
-- V2: Add missing columns to fournisseurs and bons_commande_lignes
-- ─────────────────────────────────────────────────────────────────────────────

-- Fournisseur: Moroccan business identifiers + payment terms
ALTER TABLE fournisseurs
    ADD COLUMN IF NOT EXISTS ice                 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rc                  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rib                 VARCHAR(20),
    ADD COLUMN IF NOT EXISTS delai_paiement_jours NUMERIC(5,0);

-- BonCommandeLigne: supplier part reference / article reference
ALTER TABLE bons_commande_lignes
    ADD COLUMN IF NOT EXISTS reference VARCHAR(64);
