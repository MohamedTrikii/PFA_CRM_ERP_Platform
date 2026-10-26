-- ─────────────────────────────────────────────────────────────────────────────
-- Seed demo data for Demo Aluminum Joinery Co.
-- Tenant: 00000000-0000-0000-0000-000000000002 (demo-tenant)
-- Run once: docker exec erp-postgres bash -c "psql -U erp -d erp_db -f /tmp/seed_demo_data.sql"
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING / WHERE NOT EXISTS
-- ─────────────────────────────────────────────────────────────────────────────

SET row_security = OFF;

-- ─── CRM: Prospects ──────────────────────────────────────────────────────────
-- UUIDs: bb000001-... (bb = valid hex)

INSERT INTO prospects (id, tenant_id, name, email, phone, company, source, status, notes, assigned_to)
VALUES
  ('bb000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'Karim Benali', 'karim.benali@constructpro.ma', '+212661234567', 'ConstructPro SARL',
   'REFERRAL', 'QUALIFIE',
   'Projet de 12 fenêtres aluminium pour immeuble R+4. Budget estimé: 85 000 MAD.',
   '10000000-0000-0000-0000-000000000002'),

  ('bb000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'Fatima Chraibi', 'f.chraibi@archibat.ma', '+212662345678', 'ArchiBat Maroc',
   'WEBSITE', 'NOUVEAU',
   'Promoteur immobilier — cherche partenaire aluminium pour résidence 30 appartements.',
   '10000000-0000-0000-0000-000000000002'),

  ('bb000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'Youssef Tazi', 'ytazi@gmail.com', '+212670123456', NULL,
   'COLD_CALL', 'CONVERTI',
   'Client particulier — villa haut standing à Targa. Converti en client.',
   '10000000-0000-0000-0000-000000000003'),

  ('bb000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
   'Samira El Ouafi', 'samira.elouafi@radeef.ma', '+212655987654', 'RADEEF',
   'TRADE_SHOW', 'PERDU',
   'Contact salon BatiMed 2025. Budget insuffisant pour nos standards.',
   '10000000-0000-0000-0000-000000000003'),

  ('bb000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
   'Hassan Mourad', 'hassan.mourad@hmbuild.ma', '+212661876543', 'HM Build',
   'REFERRAL', 'QUALIFIE',
   'Chantier commercial — façade rideau pour centre commercial Agdal.',
   '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ─── CRM: Clients ────────────────────────────────────────────────────────────
-- UUIDs: cc000001-... (cc = valid hex)

INSERT INTO clients (id, tenant_id, prospect_id, reference, name, email, phone, address, type, notes, active)
VALUES
  ('cc000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'bb000001-0000-0000-0000-000000000003',
   'CLI-2025-001', 'Youssef Tazi',
   'ytazi@gmail.com', '+212670123456',
   '{"street": "Rue Ibn Battouta 14", "city": "Marrakech", "zip": "40000", "country": "MA"}',
   'PARTICULIER', 'Client VIP — villa haut standing Targa.', TRUE),

  ('cc000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-002', 'Résidence Al Amal SARL',
   'contact@amal-immo.ma', '+212522334455',
   '{"street": "Boulevard Anfa 220", "city": "Casablanca", "zip": "20100", "country": "MA"}',
   'PROFESSIONNEL', 'Promoteur immobilier — résidence 24 appartements Hay Riad.', TRUE),

  ('cc000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'bb000001-0000-0000-0000-000000000001',
   'CLI-2025-003', 'ConstructPro SARL',
   'karim.benali@constructpro.ma', '+212661234567',
   '{"street": "Zone Industrielle Sidi Bernoussi", "city": "Casablanca", "zip": "20600", "country": "MA"}',
   'PROFESSIONNEL', 'Entreprise construction — contrat cadre 2025.', TRUE),

  ('cc000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-004', 'Hotel Atlas Marrakech',
   'achats@atlas-hotels.ma', '+212524456789',
   '{"street": "Avenue Mohammed VI", "city": "Marrakech", "zip": "40000", "country": "MA"}',
   'PROFESSIONNEL', 'Groupe hôtelier — rénovation façades 3 hôtels.', TRUE),

  ('cc000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-005', 'Amine Berrada',
   'a.berrada@outlook.com', '+212664321987',
   '{"street": "Lotissement Ain Aouda", "city": "Rabat", "zip": "10170", "country": "MA"}',
   'PARTICULIER', 'Maison individuelle — 8 fenêtres + 2 portes.', TRUE)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── CRM: Opportunities ──────────────────────────────────────────────────────
-- UUIDs: dd000001-... (dd = valid hex)

INSERT INTO opportunities (id, tenant_id, client_id, title, description, status, estimated_value, probability, expected_close_date, assigned_to)
VALUES
  ('dd000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000002',
   'Résidence Al Amal — 24 appartements fenêtres',
   'Fourniture et pose de fenêtres aluminium double vitrage pour résidence 24 lots.',
   'EN_COURS', 180000.00, 70, '2025-09-30',
   '10000000-0000-0000-0000-000000000002'),

  ('dd000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000004',
   'Hotel Atlas — rénovation façades',
   'Remplacement total menuiseries extérieures, 3 bâtiments.',
   'NOUVELLE', 450000.00, 35, '2025-12-31',
   '10000000-0000-0000-0000-000000000002'),

  ('dd000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000003',
   'ConstructPro — chantier bureaux Hay Hassani',
   'Fourniture menuiseries aluminium pour immeuble bureaux R+5.',
   'GAGNEE', 95000.00, 100, '2025-06-15',
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Devis ─────────────────────────────────────────────────────────────
-- UUIDs: de000001-... (de = valid hex)

INSERT INTO devis (id, tenant_id, client_id, opportunity_id, reference, status, valid_until, notes, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('de000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000001', NULL,
   'DEV-2025-1001', 'ACCEPTE', '2025-07-31',
   'Fenêtres villa Targa — profilés 60x60 anodisés sablé. TVA 20%.',
   0, 42500.00, 8500.00, 51000.00),

  ('de000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000003', 'dd000001-0000-0000-0000-000000000003',
   'DEV-2025-1002', 'ACCEPTE', '2025-06-30',
   'ConstructPro — chantier bureaux Hay Hassani, menuiseries extérieures.',
   5, 79800.00, 15960.00, 95760.00),

  ('de000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000005', NULL,
   'DEV-2025-1003', 'ENVOYE', '2025-08-15',
   'Maison Berrada — 8 fenêtres oscillo-battantes + 2 portes aluminium.',
   0, 28600.00, 5720.00, 34320.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── Sales: Devis Lines ───────────────────────────────────────────────────────
-- UUIDs: d1000001-... (all hex)

INSERT INTO devis_lines (id, devis_id, product_id, product_snapshot, description, quantity, unit_price, tva_rate, discount_pct, total_ht, position)
VALUES
  ('d1000001-0000-0000-0000-000000000001',
   'de000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   '{"reference":"ALU-PRO-6060","name":"Profilé aluminium 60x60 mm","unit":"ml","tva_rate":20}',
   'Profilé aluminium 60x60 anodisé sablé', 200, 85.00, 20.00, 0, 17000.00, 0),

  ('d1000001-0000-0000-0000-000000000002',
   'de000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Vitrage double vitrage faiblement émissif', 120, 45.00, 20.00, 0, 5400.00, 1),

  ('d1000001-0000-0000-0000-000000000003',
   'de000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000008',
   '{"reference":"POSE-FENETRE","name":"Pose fenêtre standard","unit":"unité","tva_rate":20}',
   'Pose et calage 14 fenêtres', 14, 150.00, 20.00, 0, 2100.00, 2),

  ('d1000001-0000-0000-0000-000000000004',
   'de000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   '{"reference":"ALU-PRO-6060","name":"Profilé aluminium 60x60 mm","unit":"ml","tva_rate":20}',
   'Profilés aluminium chantier bureaux', 600, 85.00, 20.00, 5, 48450.00, 0),

  ('d1000001-0000-0000-0000-000000000005',
   'de000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Vitrage double toutes fenêtres', 420, 45.00, 20.00, 5, 17955.00, 1),

  ('d1000001-0000-0000-0000-000000000006',
   'de000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000002',
   '{"reference":"ALU-PRO-4040","name":"Profilé aluminium 40x40 mm","unit":"ml","tva_rate":20}',
   'Profilés 40x40 fenêtres oscillo-battantes', 160, 62.00, 20.00, 0, 9920.00, 0),

  ('d1000001-0000-0000-0000-000000000007',
   'de000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000009',
   '{"reference":"POSE-PORTE","name":"Pose porte aluminium","unit":"unité","tva_rate":20}',
   'Pose 2 portes aluminium', 2, 220.00, 20.00, 0, 440.00, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Commandes ─────────────────────────────────────────────────────────
-- UUIDs: c0000001-... (all hex)

INSERT INTO commandes (id, tenant_id, devis_id, reference, status, delivery_address, expected_delivery_date, notes)
VALUES
  ('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'de000001-0000-0000-0000-000000000001',
   'CMD-2025-1001', 'LIVREE',
   '{"street": "Rue Ibn Battouta 14", "city": "Marrakech", "zip": "40000", "country": "MA"}',
   '2025-05-15',
   'Livraison villa Targa — coordonner avec gardien de chantier.'),

  ('c0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'de000001-0000-0000-0000-000000000002',
   'CMD-2025-1002', 'EN_COURS',
   '{"street": "Zone Industrielle Hay Hassani", "city": "Casablanca", "zip": "20200", "country": "MA"}',
   '2025-07-30',
   'Chantier ConstructPro — livraison en 3 tranches.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── Sales: Livraisons ────────────────────────────────────────────────────────
-- UUIDs: 1b000001-... (all hex)

INSERT INTO livraisons (id, tenant_id, commande_id, reference, status, delivery_date, notes)
VALUES
  ('1b000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000001',
   'LIV-2025-1001', 'LIVREE', '2025-05-14',
   'Livraison complète effectuée. BL signé par client.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO livraison_lines (id, livraison_id, product_id, product_reference, quantity_ordered, quantity_delivered)
VALUES
  ('1c000001-0000-0000-0000-000000000001',
   '1b000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001', 'ALU-PRO-6060', 200, 200),

  ('1c000001-0000-0000-0000-000000000002',
   '1b000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003', 'VIT-DOUBLE-4', 120, 120)
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Factures ──────────────────────────────────────────────────────────
-- UUIDs: fa000001-... (all hex)

INSERT INTO factures (id, tenant_id, commande_id, client_id, reference, status, issue_date, due_date, notes, total_ht, total_tva, total_ttc, amount_paid)
VALUES
  ('fa000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000001',
   'FAC-2025-1001', 'PAYEE',
   '2025-05-16', '2025-06-15',
   'Facture villa Targa — règlement 100% reçu.',
   42500.00, 8500.00, 51000.00, 51000.00),

  ('fa000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000003',
   'FAC-2025-1002', 'PARTIELLEMENT_PAYEE',
   '2025-06-01', '2025-07-01',
   'Acompte 40% reçu. Solde dû à la livraison finale.',
   79800.00, 15960.00, 95760.00, 38304.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO facture_lines (id, facture_id, product_id, description, quantity, unit_price, tva_rate, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('fb000001-0000-0000-0000-000000000001',
   'fa000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'Profilé aluminium 60x60 anodisé', 200, 85.00, 20.00, 0, 17000.00, 3400.00, 20400.00),

  ('fb000001-0000-0000-0000-000000000002',
   'fa000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003',
   'Vitrage double 4/16/4', 120, 45.00, 20.00, 0, 5400.00, 1080.00, 6480.00),

  ('fb000001-0000-0000-0000-000000000003',
   'fa000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'Profilé aluminium 60x60 — ConstructPro', 600, 85.00, 20.00, 5, 48450.00, 9690.00, 58140.00),

  ('fb000001-0000-0000-0000-000000000004',
   'fa000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000003',
   'Vitrage double — ConstructPro', 420, 45.00, 20.00, 5, 17955.00, 3591.00, 21546.00)
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Encaissements ────────────────────────────────────────────────────
-- UUIDs: ec000001-... (all hex)

INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes)
VALUES
  ('ec000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'fa000001-0000-0000-0000-000000000001',
   51000.00, '2025-05-20', 'VIREMENT',
   'VIR-2025-0520-001', 'Règlement intégral villa Targa par virement bancaire.'),

  ('ec000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'fa000001-0000-0000-0000-000000000002',
   38304.00, '2025-06-05', 'CHEQUE',
   'CHQ-CPC-789012', 'Acompte 40% ConstructPro — chèque CIH banque.')
ON CONFLICT (id) DO NOTHING;

-- ─── Inventory: Stock Locations ──────────────────────────────────────────────
-- UUIDs: 5c000001-... (all hex)

INSERT INTO stock_locations (id, tenant_id, code, name, type, description, active)
VALUES
  ('5c000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'MAG-PRIN', 'Magasin Principal', 'WAREHOUSE',
   'Entrepôt principal — profilés et vitrages', TRUE),

  ('5c000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'ZONE-QUINCA', 'Zone Quincaillerie', 'ZONE',
   'Zone dédiée quincaillerie, joints et accessoires', TRUE)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ─── Inventory: Stock Items ───────────────────────────────────────────────────
-- UUIDs: 51000001-... (all hex)

INSERT INTO stock_items (id, tenant_id, product_id, product_reference, product_name, location_id, quantity, min_quantity, max_quantity, reserved_quantity)
VALUES
  ('51000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001', 'ALU-PRO-6060', 'Profilé aluminium 60x60 mm',
   '5c000001-0000-0000-0000-000000000001',
   850, 200, 2000, 200),

  ('51000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002', 'ALU-PRO-4040', 'Profilé aluminium 40x40 mm',
   '5c000001-0000-0000-0000-000000000001',
   420, 100, 1000, 0),

  ('51000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000003', 'VIT-DOUBLE-4', 'Vitrage double 4/16/4 mm',
   '5c000001-0000-0000-0000-000000000001',
   95, 50, 500, 120),

  ('51000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000005', 'JOINT-EPDM-12', 'Joint EPDM 12 mm',
   '5c000001-0000-0000-0000-000000000002',
   380, 100, 1000, 0),

  ('51000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000006', 'PAUMELLE-3D', 'Paumelle 3D réglable',
   '5c000001-0000-0000-0000-000000000002',
   210, 50, 500, 0)
ON CONFLICT (tenant_id, product_id, location_id) DO NOTHING;

-- ─── Inventory: Stock Movements ───────────────────────────────────────────────
-- UUIDs: 5a000001-... (all hex)

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT
  '5a000001-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid, 'ALU-PRO-6060',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE', 1050, 0, 1050,
  'BR-2025-0401', 'RECEPTION',
  'Réception initiale stock profilés 60x60',
  '10000000-0000-0000-0000-000000000002'::uuid,
  now() - interval '60 days', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '5a000001-0000-0000-0000-000000000001');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT
  '5a000001-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid, 'ALU-PRO-6060',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'SORTIE', 200, 1050, 850,
  'LIV-2025-1001', 'LIVRAISON',
  'Sortie pour livraison villa Targa',
  '10000000-0000-0000-0000-000000000003'::uuid,
  now() - interval '25 days', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '5a000001-0000-0000-0000-000000000002');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT
  '5a000001-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000003'::uuid, 'VIT-DOUBLE-4',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE', 215, 0, 215,
  'BR-2025-0405', 'RECEPTION',
  'Réception stock vitrage double',
  '10000000-0000-0000-0000-000000000002'::uuid,
  now() - interval '55 days', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '5a000001-0000-0000-0000-000000000003');

-- ─── Achat: Fournisseurs ─────────────────────────────────────────────────────
-- UUIDs: f0000001-... (all hex)

INSERT INTO fournisseurs (id, tenant_id, nom, code, email, telephone, adresse, pays, actif, notes, ice, rc, delai_paiement_jours)
VALUES
  ('f0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'Aluminium du Maroc SA', 'FOURN-ALU-001',
   'commercial@alumaroc.ma', '+212522567890',
   'Zone Industrielle Ain Sebaâ, Casablanca',
   'MA', TRUE,
   'Fournisseur principal profilés aluminium. Partenaire depuis 2022.',
   '001234567890123', 'RC-CAS-2018-456', 60),

  ('f0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'Maroc Vitrage SARL', 'FOURN-VIT-001',
   'achats@marocvitrage.ma', '+212535123456',
   'Zone Industrielle Sidi Maârouf, Casablanca',
   'MA', TRUE,
   'Fournisseur vitrage double et simple. Délai livraison 10 jours.',
   '009876543210987', 'RC-CAS-2015-123', 45)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ─── Achat: Bons de Commande ─────────────────────────────────────────────────
-- UUIDs: bc000001-... (all hex)

INSERT INTO bons_commande (id, tenant_id, fournisseur_id, reference, status, date_commande, date_livraison_prevue, total_ht, total_tva, total_ttc, notes, created_by)
VALUES
  ('bc000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'f0000001-0000-0000-0000-000000000001',
   'BC-2025-0601', 'LIVRE',
   '2025-04-01', '2025-04-15',
   89250.00, 17850.00, 107100.00,
   'Réapprovisionnement profilés 60x60 et 40x40 — Q2 2025.',
   '10000000-0000-0000-0000-000000000002')
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO bons_commande_lignes (id, bon_commande_id, product_id, designation, unite, quantite, prix_unitaire_ht, tva_rate, total_ht, position, reference)
VALUES
  ('bc100001-0000-0000-0000-000000000001',
   'bc000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'Profilé aluminium 60x60 mm anodisé T6',
   'ml', 750, 75.00, 20.00, 56250.00, 0, 'ALU-PRO-6060'),

  ('bc100001-0000-0000-0000-000000000002',
   'bc000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000002',
   'Profilé aluminium 40x40 mm anodisé T6',
   'ml', 550, 60.00, 20.00, 33000.00, 1, 'ALU-PRO-4040')
ON CONFLICT (id) DO NOTHING;

-- ─── Achat: Bons de Réception ─────────────────────────────────────────────────
-- UUIDs: be000001-... (all hex)

INSERT INTO bons_reception (id, tenant_id, bon_commande_id, reference, status, date_reception, notes, created_by)
VALUES
  ('be000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'bc000001-0000-0000-0000-000000000001',
   'BR-2025-0401', 'COMPLET', '2025-04-01',
   'Réception complète BC-2025-0601 — profilés conformes, aucune casse.',
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bons_reception_lignes (id, bon_reception_id, bon_commande_ligne_id, product_id, designation, quantite_commandee, quantite_recue, position)
VALUES
  ('bf000001-0000-0000-0000-000000000001',
   'be000001-0000-0000-0000-000000000001',
   'bc100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'Profilé aluminium 60x60 mm', 750, 750, 0),

  ('bf000001-0000-0000-0000-000000000002',
   'be000001-0000-0000-0000-000000000001',
   'bc100001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002',
   'Profilé aluminium 40x40 mm', 550, 550, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Re-enable RLS ────────────────────────────────────────────────────────────
SET row_security = ON;

-- ─── Verification ─────────────────────────────────────────────────────────────
SELECT 'prospects'      AS table_name, count(*) FROM prospects      WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'clients',        count(*) FROM clients        WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'opportunities',  count(*) FROM opportunities  WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'devis',          count(*) FROM devis           WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'commandes',      count(*) FROM commandes       WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'livraisons',     count(*) FROM livraisons      WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'factures',       count(*) FROM factures        WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'encaissements',  count(*) FROM encaissements   WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'stock_locations',count(*) FROM stock_locations WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'stock_items',    count(*) FROM stock_items     WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'stock_movements',count(*) FROM stock_movements WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'fournisseurs',   count(*) FROM fournisseurs    WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'bons_commande',  count(*) FROM bons_commande   WHERE tenant_id = '00000000-0000-0000-0000-000000000002' UNION ALL
SELECT 'bons_reception', count(*) FROM bons_reception  WHERE tenant_id = '00000000-0000-0000-0000-000000000002';
