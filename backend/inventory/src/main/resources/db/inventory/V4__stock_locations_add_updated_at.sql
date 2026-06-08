-- V4 – Add updated_at to stock_locations (BaseEntity column missing from V1 DDL)
ALTER TABLE stock_locations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
