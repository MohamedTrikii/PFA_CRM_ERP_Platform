-- V5 – Fix audit_log.ip_address column type: inet → varchar(45)
-- AuditService.currentIp() returns a Java String; PostgreSQL rejects implicit
-- varchar→inet casts (error 42804). VARCHAR(45) covers IPv4 and IPv6.
-- Idempotent: no-op if the column is already a character type.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name   = 'audit_log'
          AND column_name  = 'ip_address'
          AND data_type    = 'inet'
    ) THEN
        ALTER TABLE audit_log
            ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::TEXT;
    END IF;
END $$;
