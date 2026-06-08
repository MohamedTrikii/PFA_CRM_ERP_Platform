-- V3 – Seed catalog products for demo tenant
-- Demo tenant UUID: 00000000-0000-0000-0000-000000000002
-- Uses ON CONFLICT DO NOTHING so re-running (e.g. after data already applied) is safe.

INSERT INTO catalog_products (id, tenant_id, reference, name, description, unit_price, tva_rate, unit, category, active)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'ALU-PRO-6060', 'Profilé aluminium 60x60 mm', 'Profilé aluminium anodisé 6060 T6, longueur 6m',
   85.00, 20.00, 'ml', 'Profilés', true),
  ('a0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'ALU-PRO-4040', 'Profilé aluminium 40x40 mm', 'Profilé aluminium anodisé 6060 T6, longueur 6m',
   62.00, 20.00, 'ml', 'Profilés', true),
  ('a0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'VIT-DOUBLE-4', 'Vitrage double 4/16/4 mm', 'Vitrage double vitrage faiblement émissif',
   45.00, 20.00, 'm²', 'Vitrage', true),
  ('a0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
   'VIT-SIMPLE-6', 'Vitrage simple 6 mm', 'Vitrage simple clair, épaisseur 6mm',
   22.00, 20.00, 'm²', 'Vitrage', true),
  ('a0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
   'JOINT-EPDM-12', 'Joint EPDM 12 mm', 'Joint d''étanchéité EPDM noir, rouleau 50m',
   18.50, 20.00, 'ml', 'Quincaillerie', true),
  ('a0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
   'PAUMELLE-3D', 'Paumelle 3D réglable', 'Paumelle à réglage 3 dimensions pour fenêtre aluminium',
   12.00, 20.00, 'unité', 'Quincaillerie', true),
  ('a0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002',
   'POIGNEE-ALU-OB', 'Poignée aluminium olive bronze', 'Poignée crémone aluminium finition bronze',
   28.00, 20.00, 'unité', 'Quincaillerie', true),
  ('a0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002',
   'POSE-FENETRE', 'Pose fenêtre standard', 'Main d''œuvre pose fenêtre jusqu''à 1.5m²',
   150.00, 20.00, 'unité', 'Main d''œuvre', true),
  ('a0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002',
   'POSE-PORTE', 'Pose porte aluminium', 'Main d''œuvre pose porte aluminium standard',
   220.00, 20.00, 'unité', 'Main d''œuvre', true),
  ('a0000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002',
   'CALFEUTREMENT', 'Calfeutrement et finition', 'Calfeutrement mousse expansive + silicone, au ml',
   8.50, 20.00, 'ml', 'Finition', true)
ON CONFLICT (id) DO NOTHING;
