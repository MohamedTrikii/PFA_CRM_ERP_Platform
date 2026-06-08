-- V2 – Add product_name and reserved_quantity to stock_items
--      (columns added to StockItem entity after V1 was deployed)

ALTER TABLE stock_items
    ADD COLUMN IF NOT EXISTS product_name      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT 0;
