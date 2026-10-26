-- encaissements inherits BaseEntity which maps an updated_at column,
-- but the original V1 schema omitted it. Add it so Hibernate inserts succeed.
ALTER TABLE encaissements
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
