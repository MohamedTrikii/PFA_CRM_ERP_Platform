-- ─────────────────────────────────────────────
-- V3 – Seed demo data (dev/test only)
-- Creates the demo tenant and one user per role.
-- Keycloak IDs match the users in erp-realm.json.
-- ─────────────────────────────────────────────

-- Temporarily disable RLS for this admin seed (owner session)
SET row_security = OFF;

INSERT INTO tenants (id, slug, name, active)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'system',
   'ERP System Tenant',
   TRUE),
  ('00000000-0000-0000-0000-000000000002',
   'demo-tenant',
   'Demo Aluminum Joinery Co.',
   TRUE)
ON CONFLICT (slug) DO NOTHING;

-- seed users (keycloak_id values are placeholders — replaced on first login via upsertFromToken)
INSERT INTO users (id, tenant_id, keycloak_id, email, display_name, role, active)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'superadmin-keycloak-placeholder',
   'superadmin@erp.local',
   'Super Admin',
   'SUPER_ADMIN',
   TRUE),
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'employer-keycloak-placeholder',
   'employer@demo.erp.local',
   'Demo Employer',
   'EMPLOYER',
   TRUE),
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'employee-keycloak-placeholder',
   'employee@demo.erp.local',
   'Demo Employee',
   'EMPLOYEE',
   TRUE),
  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000002',
   'client-keycloak-placeholder',
   'client@demo.erp.local',
   'Demo Client',
   'CLIENT',
   TRUE)
ON CONFLICT (keycloak_id) DO NOTHING;

-- Re-enable RLS
SET row_security = ON;
