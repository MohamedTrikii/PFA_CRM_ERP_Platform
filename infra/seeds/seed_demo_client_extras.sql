-- Extra seeds for demo client (client@demo.erp.local)
-- Tenant: demo-tenant = '00000000-0000-0000-0000-000000000002'
-- Client: Omar Chrif = 'cc100001-0000-0000-0000-000000000005'

SET row_security = OFF;

-- 1) Nouveau devis envoyé par le client (DEV-2025-1010)
INSERT INTO devis (id, tenant_id, client_id, opportunity_id, reference, status, valid_until, notes, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('de200001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000005', NULL,
   'DEV-2025-1010','ENVOYE','2025-10-15',
   'Demande client demo — 2 fenêtres coulissantes + 1 porte-fenêtre.',
   0, 6400.00, 1280.00, 7680.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO devis_lines (id, devis_id, product_id, product_snapshot, description, quantity, unit_price, tva_rate, discount_pct, total_ht, position)
VALUES
  ('d3000001-0000-0000-0000-000000000001','de200001-0000-0000-0000-000000000010',
   'a0000001-0000-0000-0000-000000000002',
   '{"reference":"ALU-PRO-4040","name":"Profilé aluminium 40x40 mm","unit":"ml","tva_rate":20}',
   'Profilés 40x40 pour fenêtres coulissantes', 40, 62.00, 20.00, 0, 2480.00, 0),

  ('d3000001-0000-0000-0000-000000000002','de200001-0000-0000-0000-000000000010',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Double vitrage pour 2 fenêtres + 1 porte', 16, 45.00, 20.00, 0, 720.00, 1),

  ('d3000001-0000-0000-0000-000000000003','de200001-0000-0000-0000-000000000010',
   'a0000001-0000-0000-0000-000000000009',
   '{"reference":"POSE-PORTE","name":"Pose porte aluminium","unit":"unité","tva_rate":20}',
   'Pose et calage 1 porte-fenêtre', 1, 3200.00, 20.00, 0, 3200.00, 2)
ON CONFLICT (id) DO NOTHING;

-- 2) Facture partielle pour le client demo (FAC-2025-1009)
INSERT INTO factures (id, tenant_id, commande_id, client_id, reference, status, issue_date, due_date, notes, total_ht, total_tva, total_ttc, amount_paid)
VALUES
  ('fa200001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002',
   NULL,'cc100001-0000-0000-0000-000000000005',
   'FAC-2025-1009','PARTIELLEMENT_PAYEE','2025-06-10','2025-07-10',
   'Acompte 30% reçu pour DEV-2025-1010 (démo).',
   6400.00,1280.00,7680.00,2304.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO facture_lines (id, facture_id, product_id, description, quantity, unit_price, tva_rate, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('fc200001-0000-0000-0000-000000000009','fa200001-0000-0000-0000-000000000009',
   'a0000001-0000-0000-0000-000000000002','Profilés 40x40 résidence demo',40,62.00,20.00,0,2480.00,496.00,2976.00),
  ('fc200001-0000-0000-0000-000000000010','fa200001-0000-0000-0000-000000000009',
   'a0000001-0000-0000-0000-000000000003','Vitrage double demo',16,45.00,20.00,0,720.00,144.00,864.00),
  ('fc200001-0000-0000-0000-000000000011','fa200001-0000-0000-0000-000000000009',
   'a0000001-0000-0000-0000-000000000009','Pose porte-fenêtre demo',1,3200.00,20.00,0,3200.00,640.00,3840.00)
ON CONFLICT (id) DO NOTHING;

-- Encaissement partiel (acompte 30%)
INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes)
VALUES
  ('ec200001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002',
   'fa200001-0000-0000-0000-000000000009',2304.00,'2025-06-12','VIREMENT','VIR-DEMO-2025-06-12',
   'Acompte reçu via virement pour demo client.')
ON CONFLICT (id) DO NOTHING;

-- 3) Nouvelle demande de devis soumise par le CLIENT via portail (status = NOUVEAU)
INSERT INTO devis_requests (id, tenant_id, client_id, client_name, client_email, client_phone, client_address, project_type, description, status, converted_devis_id, notes)
VALUES
  ('da200001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000005','Omar Chrif','client@demo.erp.local','+212675445566',
   'Rue Ibn Sina 3, Casablanca','FENETRE','Demande additionnelle : 1 baie coulissante 3m x 2.2m, motorisation possible.',
   'NOUVEAU',NULL,'Soumise depuis portail client demo.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devis_request_items (id, request_id, quantity, width_mm, height_mm, profile_series, opening_type, glass_type, color, accessories, notes, position)
VALUES
  ('db200001-0000-0000-0000-000000000005','da200001-0000-0000-0000-000000000005',
   1,3000.0,2200.0,'70mm','COULISSANT','DV_4_16_4','RAL 7016',
   'Motorisation Somfy possible, seuil bas PMR',NULL,0)
ON CONFLICT (id) DO NOTHING;

SET row_security = ON;
