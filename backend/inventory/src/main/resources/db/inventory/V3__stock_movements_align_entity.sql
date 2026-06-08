-- V3 – Align stock_movements table with StockMovement entity
-- The entity uses occurred_at, reference_type, reference_id, updated_at
-- which were absent from V1.  Existing source_type / source_id columns
-- are left in place as unmapped extras.

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS reference_id   UUID,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_movements_occurred
    ON stock_movements (tenant_id, occurred_at DESC);
