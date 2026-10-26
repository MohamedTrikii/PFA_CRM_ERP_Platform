-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Atlas Menuiserie SARL (2ème tenant — pour démontrer l'isolation RLS)
-- Tenant UUID: 00000000-0000-0000-0000-000000000003
-- Logins Keycloak:
--   employer@atlas.erp.local  /  AtlasEmployer@123  (rôle EMPLOYER)
--   employee@atlas.erp.local  /  AtlasEmployee@123  (rôle EMPLOYEE)
--   client@atlas.erp.local    /  AtlasClient@123    (rôle CLIENT)
-- ─────────────────────────────────────────────────────────────────────────────

SET row_security = OFF;

-- ─── Tenant ───────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, slug, name, active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'atlas-menuiserie',
  'Atlas Menuiserie SARL',
  TRUE
) ON CONFLICT (slug) DO NOTHING;

-- ─── Users (keycloak_id réels extraits de Keycloak) ──────────────────────────

INSERT INTO users (id, tenant_id, keycloak_id, email, display_name, role, active)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   '65555b2d-eaef-4764-886c-9b87edf535c7',
   'employer@atlas.erp.local',
   'Atlas Employer', 'EMPLOYER', TRUE),

  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '4c3b49fa-d40d-45f8-93a7-e1a67bcb4f99',
   'employee@atlas.erp.local',
   'Atlas Employee', 'EMPLOYEE', TRUE),

  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   '2113402c-6866-461b-8eb3-ba37606019d5',
   'client@atlas.erp.local',
   'Atlas Client', 'CLIENT', TRUE)
ON CONFLICT (keycloak_id) DO NOTHING;

-- ─── Catalog Products (propres au tenant Atlas) ───────────────────────────────

INSERT INTO catalog_products (id, tenant_id, reference, name, description, unit_price, tva_rate, unit, category, active)
VALUES
  ('a3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'ATL-PRO-80', 'Profilé aluminium série 80 mm', 'Profilé thermique rupture de pont, laquage RAL',
   125.00, 20.00, 'ml', 'Profilés', true),

  ('a3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'ATL-VIT-6-16-6', 'Vitrage triple 6/16/6 mm', 'Triple vitrage basse émissivité Ug=0.6',
   85.00, 20.00, 'm²', 'Vitrage', true),

  ('a3000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'ATL-JOINT-SIL', 'Joint silicone structurel', 'Cordon silicone noir, cartouche 310ml',
   35.00, 20.00, 'unité', 'Quincaillerie', true),

  ('a3000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003',
   'ATL-POSE-CUR', 'Pose menuiserie complexe', 'Pose menuiserie coulissante ou galandage',
   280.00, 20.00, 'unité', 'Main d''œuvre', true),

  ('a3000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003',
   'ATL-VOLET-ALU', 'Volet roulant aluminium motorisé', 'Volet roulant coffre tubulaire, moteur Somfy',
   450.00, 20.00, 'unité', 'Volets', true)
ON CONFLICT (id) DO NOTHING;

-- ─── CRM: Prospects (Atlas) ───────────────────────────────────────────────────

INSERT INTO prospects (id, tenant_id, name, email, phone, company, source, status, notes, assigned_to)
VALUES
  ('cb000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'Omar Kettani', 'o.kettani@promo-nord.ma', '+212661100220', 'Promo Nord SARL',
   'REFERRAL', 'QUALIFIE',
   'Résidence 18 villas à Ain Attig. Intéressé par menuiseries thermiques série 80.',
   '20000000-0000-0000-0000-000000000001'),

  ('cb000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'Nadia Alaoui', 'n.alaoui@archi-style.ma', '+212662200330', 'ArchStyle Cabinet',
   'WEBSITE', 'NOUVEAU',
   'Architecte — prescripteur potentiel pour projets résidentiels haut de gamme.',
   '20000000-0000-0000-0000-000000000001'),

  ('cb000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'Rachid Benchekroun', 'r.bench@gmail.com', '+212670330440', NULL,
   'COLD_CALL', 'CONVERTI',
   'Particulier — maison individuelle, converti en client.',
   '20000000-0000-0000-0000-000000000002'),

  ('cb000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003',
   'Leila Fassi', 'l.fassi@ministere.gov.ma', '+212537440550', 'Ministère OCP',
   'TRADE_SHOW', 'PERDU',
   'Appel d''offres public — perdu face à concurrent sur prix.',
   '20000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ─── CRM: Clients (Atlas) ─────────────────────────────────────────────────────

INSERT INTO clients (id, tenant_id, prospect_id, reference, name, email, phone, address, type, notes, active)
VALUES
  ('cd000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'cb000001-0000-0000-0000-000000000003',
   'ATL-CLI-001', 'Rachid Benchekroun',
   'r.bench@gmail.com', '+212670330440',
   '{"street": "Rue des Oliviers 7", "city": "Salé", "zip": "11000", "country": "MA"}',
   'PARTICULIER', 'Maison individuelle — 6 fenêtres + 3 volets roulants motorisés.', TRUE),

  ('cd000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'cb000001-0000-0000-0000-000000000001',
   'ATL-CLI-002', 'Promo Nord SARL',
   'o.kettani@promo-nord.ma', '+212661100220',
   '{"street": "Hay Nahda II Lot 14", "city": "Rabat", "zip": "10100", "country": "MA"}',
   'PROFESSIONNEL', 'Promoteur — résidence 18 villas. Contrat série 80 thermique.', TRUE),

  ('cd000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   NULL,
   'ATL-CLI-003', 'Clinique Al Farabi',
   'direction@clinique-farabi.ma', '+212535550660',
   '{"street": "Rue Al Massira 45", "city": "Fès", "zip": "30000", "country": "MA"}',
   'PROFESSIONNEL', 'Extension clinique — bloc opératoire 12 fenêtres triple vitrage.', TRUE)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── CRM: Opportunities (Atlas) ───────────────────────────────────────────────

INSERT INTO opportunities (id, tenant_id, client_id, title, description, status, estimated_value, probability, expected_close_date, assigned_to)
VALUES
  ('df000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'cd000001-0000-0000-0000-000000000002',
   'Promo Nord — 18 villas menuiseries thermiques',
   'Fourniture et pose menuiseries série 80 + volets roulants, 18 villas.',
   'EN_COURS', 320000.00, 65, '2025-10-31',
   '20000000-0000-0000-0000-000000000001'),

  ('df000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'cd000001-0000-0000-0000-000000000003',
   'Clinique Al Farabi — bloc opératoire triple vitrage',
   'Menuiseries haute performance triple vitrage pour environnement médical.',
   'GAGNEE', 87000.00, 100, '2025-07-15',
   '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Devis (Atlas) ─────────────────────────────────────────────────────

INSERT INTO devis (id, tenant_id, client_id, opportunity_id, reference, status, valid_until, notes, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('d3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'cd000001-0000-0000-0000-000000000001', NULL,
   'ATL-DEV-2025-001', 'ACCEPTE', '2025-07-01',
   'Maison Benchekroun — 6 fenêtres série 80 + 3 volets Somfy.',
   0, 21300.00, 4260.00, 25560.00),

  ('d3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'cd000001-0000-0000-0000-000000000003', 'df000001-0000-0000-0000-000000000002',
   'ATL-DEV-2025-002', 'ACCEPTE', '2025-06-30',
   'Clinique Al Farabi — triple vitrage bloc opératoire.',
   0, 72500.00, 14500.00, 87000.00),

  ('d3000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'cd000001-0000-0000-0000-000000000002', 'df000001-0000-0000-0000-000000000001',
   'ATL-DEV-2025-003', 'BROUILLON', '2025-09-30',
   'Promo Nord tranche 1 — 6 villas pilotes.',
   5, 98000.00, 19600.00, 117600.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO devis_lines (id, devis_id, product_id, product_snapshot, description, quantity, unit_price, tva_rate, discount_pct, total_ht, position)
VALUES
  ('d4000001-0000-0000-0000-000000000001',
   'd3000001-0000-0000-0000-000000000001',
   'a3000001-0000-0000-0000-000000000001',
   '{"reference":"ATL-PRO-80","name":"Profilé aluminium série 80 mm","unit":"ml","tva_rate":20}',
   'Profilés 80mm 6 fenêtres oscillo-battantes', 72, 125.00, 20.00, 0, 9000.00, 0),

  ('d4000001-0000-0000-0000-000000000002',
   'd3000001-0000-0000-0000-000000000001',
   'a3000001-0000-0000-0000-000000000005',
   '{"reference":"ATL-VOLET-ALU","name":"Volet roulant aluminium motorisé","unit":"unité","tva_rate":20}',
   'Volets roulants motorisés Somfy x3', 3, 450.00, 20.00, 0, 1350.00, 1),

  ('d4000001-0000-0000-0000-000000000003',
   'd3000001-0000-0000-0000-000000000002',
   'a3000001-0000-0000-0000-000000000002',
   '{"reference":"ATL-VIT-6-16-6","name":"Vitrage triple 6/16/6 mm","unit":"m²","tva_rate":20}',
   'Triple vitrage Ug=0.6 bloc opératoire', 340, 85.00, 20.00, 0, 28900.00, 0),

  ('d4000001-0000-0000-0000-000000000004',
   'd3000001-0000-0000-0000-000000000002',
   'a3000001-0000-0000-0000-000000000004',
   '{"reference":"ATL-POSE-CUR","name":"Pose menuiserie complexe","unit":"unité","tva_rate":20}',
   'Pose menuiseries complexes bloc médical', 12, 280.00, 20.00, 0, 3360.00, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Sales: Commandes (Atlas) ─────────────────────────────────────────────────

INSERT INTO commandes (id, tenant_id, devis_id, reference, status, delivery_address, expected_delivery_date, notes)
VALUES
  ('c3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'd3000001-0000-0000-0000-000000000001',
   'ATL-CMD-2025-001', 'LIVREE',
   '{"street": "Rue des Oliviers 7", "city": "Salé", "zip": "11000", "country": "MA"}',
   '2025-05-30', 'Livraison maison Benchekroun — tout livré, pose terminée.'),

  ('c3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'd3000001-0000-0000-0000-000000000002',
   'ATL-CMD-2025-002', 'CONFIRMEE',
   '{"street": "Rue Al Massira 45", "city": "Fès", "zip": "30000", "country": "MA"}',
   '2025-07-10', 'Clinique Al Farabi — matériaux sur commande fournisseur.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── Sales: Livraisons (Atlas) ────────────────────────────────────────────────

INSERT INTO livraisons (id, tenant_id, commande_id, reference, status, delivery_date, notes)
VALUES
  ('1d000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'c3000001-0000-0000-0000-000000000001',
   'ATL-LIV-2025-001', 'LIVREE', '2025-05-28',
   'Livraison + pose complète. Client satisfait, réception sans réserve.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── Sales: Factures (Atlas) ──────────────────────────────────────────────────

INSERT INTO factures (id, tenant_id, commande_id, client_id, reference, status, issue_date, due_date, notes, total_ht, total_tva, total_ttc, amount_paid)
VALUES
  ('f3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'c3000001-0000-0000-0000-000000000001',
   'cd000001-0000-0000-0000-000000000001',
   'ATL-FAC-2025-001', 'PAYEE',
   '2025-06-01', '2025-06-30',
   'Facture Benchekroun — payée intégralement.',
   21300.00, 4260.00, 25560.00, 25560.00),

  ('f3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'c3000001-0000-0000-0000-000000000002',
   'cd000001-0000-0000-0000-000000000003',
   'ATL-FAC-2025-002', 'PARTIELLEMENT_PAYEE',
   '2025-06-05', '2025-07-05',
   'Acompte 30% reçu clinique Al Farabi.',
   72500.00, 14500.00, 87000.00, 26100.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ─── Sales: Encaissements (Atlas) ────────────────────────────────────────────

INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes)
VALUES
  ('e3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'f3000001-0000-0000-0000-000000000001',
   25560.00, '2025-06-03', 'VIREMENT',
   'VIR-ATL-0603-001', 'Règlement intégral Benchekroun — virement Al Barid Bank.'),

  ('e3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'f3000001-0000-0000-0000-000000000002',
   26100.00, '2025-06-07', 'CHEQUE',
   'CHQ-ATL-567890', 'Acompte 30% clinique Al Farabi — chèque BMCE.')
ON CONFLICT (id) DO NOTHING;

-- ─── Inventory: Stock Locations (Atlas) ──────────────────────────────────────

INSERT INTO stock_locations (id, tenant_id, code, name, type, description, active)
VALUES
  ('5d000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'ATL-MAG', 'Magasin Atlas', 'WAREHOUSE',
   'Entrepôt principal Atlas Menuiserie — Salé', TRUE),

  ('5d000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'ATL-CHANT-FES', 'Dépôt chantier Fès', 'EXTERNAL',
   'Dépôt temporaire clinique Al Farabi — Fès', TRUE)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ─── Inventory: Stock Items (Atlas) ──────────────────────────────────────────

INSERT INTO stock_items (id, tenant_id, product_id, product_reference, product_name, location_id, quantity, min_quantity, max_quantity, reserved_quantity)
VALUES
  ('52000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'a3000001-0000-0000-0000-000000000001', 'ATL-PRO-80', 'Profilé aluminium série 80 mm',
   '5d000001-0000-0000-0000-000000000001',
   520, 100, 1500, 0),

  ('52000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'a3000001-0000-0000-0000-000000000002', 'ATL-VIT-6-16-6', 'Vitrage triple 6/16/6 mm',
   '5d000001-0000-0000-0000-000000000001',
   180, 50, 600, 340),

  ('52000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'a3000001-0000-0000-0000-000000000005', 'ATL-VOLET-ALU', 'Volet roulant aluminium motorisé',
   '5d000001-0000-0000-0000-000000000001',
   24, 5, 50, 0)
ON CONFLICT (tenant_id, product_id, location_id) DO NOTHING;

-- ─── Inventory: Stock Movements (Atlas) ──────────────────────────────────────

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT
  '5b000001-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'a3000001-0000-0000-0000-000000000001'::uuid, 'ATL-PRO-80',
  '5d000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE', 520, 0, 520,
  'ATL-BR-2025-001', 'RECEPTION',
  'Réception initiale stock profilés 80mm',
  '20000000-0000-0000-0000-000000000001'::uuid,
  now() - interval '45 days', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '5b000001-0000-0000-0000-000000000001');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT
  '5b000001-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'a3000001-0000-0000-0000-000000000002'::uuid, 'ATL-VIT-6-16-6',
  '5d000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE', 180, 0, 180,
  'ATL-BR-2025-002', 'RECEPTION',
  'Réception triple vitrage clinique Farabi',
  '20000000-0000-0000-0000-000000000001'::uuid,
  now() - interval '20 days', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '5b000001-0000-0000-0000-000000000002');

-- ─── Achat: Fournisseurs (Atlas) ─────────────────────────────────────────────

INSERT INTO fournisseurs (id, tenant_id, nom, code, email, telephone, adresse, pays, actif, notes, ice, delai_paiement_jours)
VALUES
  ('f1000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'ThermAlu Maroc', 'ATL-FOURN-001',
   'vente@thermalu.ma', '+212537660770',
   'Zone Industrielle Technopolis, Rabat-Salé',
   'MA', TRUE,
   'Fournisseur exclusif profilés thermiques série 80. Partenaire certifié.',
   '003344556677889', 45),

  ('f1000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'GlassUp International SARL', 'ATL-FOURN-002',
   'export@glassup.ma', '+212522770880',
   'Zone Franche Tanger Med',
   'MA', TRUE,
   'Fournisseur triple et double vitrage haute performance. Délai 15 j.',
   '007788990011223', 60)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ─── Achat: Bons de Commande (Atlas) ──────────────────────────────────────────

INSERT INTO bons_commande (id, tenant_id, fournisseur_id, reference, status, date_commande, date_livraison_prevue, total_ht, total_tva, total_ttc, notes, created_by)
VALUES
  ('bd000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'f1000001-0000-0000-0000-000000000001',
   'ATL-BC-2025-001', 'LIVRE',
   '2025-04-10', '2025-04-25',
   65000.00, 13000.00, 78000.00,
   'Commande profilés 80mm Q2 — résidence Promo Nord + stock.',
   '20000000-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO bons_commande_lignes (id, bon_commande_id, product_id, designation, unite, quantite, prix_unitaire_ht, tva_rate, total_ht, position, reference)
VALUES
  ('bd100001-0000-0000-0000-000000000001',
   'bd000001-0000-0000-0000-000000000001',
   'a3000001-0000-0000-0000-000000000001',
   'Profilé aluminium série 80mm thermique laqué',
   'ml', 520, 125.00, 20.00, 65000.00, 0, 'ATL-PRO-80')
ON CONFLICT (id) DO NOTHING;

-- ─── Re-enable RLS ────────────────────────────────────────────────────────────
SET row_security = ON;

-- ─── Vérification ────────────────────────────────────────────────────────────
SELECT 'TENANT atlas-menuiserie' AS info, slug, name FROM tenants WHERE id = '00000000-0000-0000-0000-000000000003';

SELECT t.slug AS tenant, tbl.table_name, tbl.cnt
FROM (
  SELECT 'prospects'      AS table_name, tenant_id, count(*) AS cnt FROM prospects      GROUP BY tenant_id UNION ALL
  SELECT 'clients',        tenant_id, count(*) FROM clients        GROUP BY tenant_id UNION ALL
  SELECT 'devis',          tenant_id, count(*) FROM devis           GROUP BY tenant_id UNION ALL
  SELECT 'commandes',      tenant_id, count(*) FROM commandes       GROUP BY tenant_id UNION ALL
  SELECT 'factures',       tenant_id, count(*) FROM factures        GROUP BY tenant_id UNION ALL
  SELECT 'fournisseurs',   tenant_id, count(*) FROM fournisseurs    GROUP BY tenant_id UNION ALL
  SELECT 'stock_items',    tenant_id, count(*) FROM stock_items     GROUP BY tenant_id
) tbl
JOIN tenants t ON t.id = tbl.tenant_id
ORDER BY t.slug, tbl.table_name;
