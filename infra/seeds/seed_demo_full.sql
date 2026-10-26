-- ═══════════════════════════════════════════════════════════════════════════
-- Seed COMPLET demo-tenant — toutes les tables, tous les utilisateurs
-- Tenant  : 00000000-0000-0000-0000-000000000002  (demo-tenant)
-- EMPLOYER: 10000000-0000-0000-0000-000000000002  (demo-employer / Employer@123)
-- EMPLOYEE: 10000000-0000-0000-0000-000000000003  (demo-employee / Employee@123)
-- CLIENT  : 10000000-0000-0000-0000-000000000004  (demo-client   / Client@123)
-- ═══════════════════════════════════════════════════════════════════════════

SET row_security = OFF;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. TENANT BRANDING
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO tenant_branding (id, tenant_id, company_name, tagline, primary_color, secondary_color, font_family)
VALUES (
  'a1000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Demo Aluminum Joinery Co.',
  'L''aluminium de qualité, livré à temps',
  '#1565C0',
  '#37474F',
  'Inter, sans-serif'
) ON CONFLICT (tenant_id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. TENANT NOTICES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO tenant_notices (id, tenant_id, title, body, severity, active, starts_at, ends_at)
VALUES
  ('a2000001-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Fermeture annuelle 14-18 juillet 2025',
   'L''atelier sera fermé du 14 au 18 juillet inclus. Toute commande passée avant le 10 juillet sera traitée en priorité à la reprise.',
   'WARNING', TRUE,
   '2025-07-01 00:00:00+00', '2025-07-18 23:59:00+00'),

  ('a2000001-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'Nouveaux profilés RPT disponibles',
   'La gamme Rupture de Pont Thermique (RPT) série 70 est maintenant disponible au catalogue. Performances Uf = 1,4 W/m²K.',
   'INFO', TRUE,
   '2025-06-01 00:00:00+00', '2025-08-31 23:59:00+00'),

  ('a2000001-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Objectif CA T2 2025 atteint à 87 %',
   'Le chiffre d''affaires du 2ème trimestre progresse de +23 % vs T2 2024. Félicitations à toute l''équipe !',
   'INFO', TRUE,
   '2025-06-09 00:00:00+00', '2025-07-15 23:59:00+00')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. PROSPECTS SUPPLÉMENTAIRES  (assigned_to EMPLOYER et EMPLOYEE)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO prospects (id, tenant_id, name, email, phone, company, source, status, notes, assigned_to)
VALUES
  -- Attribués à EMPLOYER
  ('bb100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'Mehdi Alami','m.alami@cogest.ma','+212661445566','CoGest Immobilier',
   'WEBSITE','QUALIFIE','Résidence R+6 à Kénitra — 60 appartements, besoin menuiseries complètes.',
   '10000000-0000-0000-0000-000000000002'),

  ('bb100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'Soumia Raji','s.raji@btpmaroc.ma','+212662556677','BTP Maroc SA',
   'REFERRAL','NOUVEAU','Architecte prescripteur — grands projets résidentiels Casablanca Est.',
   '10000000-0000-0000-0000-000000000002'),

  ('bb100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'Khalid Naciri','k.naciri@villavert.ma','+212663667788','Villa Vert Résidences',
   'TRADE_SHOW','QUALIFIE','Lotissement 12 villas haut standing à Bouskoura. Demande devis façades rideau.',
   '10000000-0000-0000-0000-000000000002'),

  ('bb100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'Imane Filali','i.filali@filaligroupma.com','+212664778899','Filali Group',
   'COLD_CALL','PERDU','Centre commercial — a opté pour un concurrent sur critère prix uniquement.',
   '10000000-0000-0000-0000-000000000002'),

  -- Attribués à EMPLOYEE
  ('bb100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   'Aicha Benhima','a.benhima@gmail.com','+212670889900',NULL,
   'COLD_CALL','CONVERTI','Particulière — appartement 3 pièces Agdal. Converti en client.',
   '10000000-0000-0000-0000-000000000003'),

  ('bb100001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002',
   'Tariq Mansouri','t.mansouri@ramsa.ma','+212671990011','RAMSA',
   'REFERRAL','QUALIFIE','Direction régionale RAMSA — rénovation bâtiment administratif 3 niveaux.',
   '10000000-0000-0000-0000-000000000003'),

  ('bb100001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002',
   'Fatine Ouahbi','f.ouahbi@ensa.ac.ma','+212672001122','ENSA Agadir',
   'WEBSITE','NOUVEAU','Établissement public — extension bibliothèque, façades doubles peaux.',
   '10000000-0000-0000-0000-000000000003'),

  ('bb100001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002',
   'Said Bennouna','s.bennouna@bennouna-dev.ma','+212673112233','Bennouna Développement',
   'TRADE_SHOW','QUALIFIE','Promoteur — programme 24 lots zone Agdal Rabat.',
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. CLIENTS SUPPLÉMENTAIRES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO clients (id, tenant_id, prospect_id, reference, name, email, phone, address, type, notes, active)
VALUES
  ('cc100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'bb100001-0000-0000-0000-000000000005',
   'CLI-2025-006','Aicha Benhima',
   'a.benhima@gmail.com','+212670889900',
   '{"street":"Rue Patrice Lumumba 8","city":"Rabat","zip":"10000","country":"MA"}',
   'PARTICULIER','Appartement Agdal — 4 fenêtres + porte balcon.',TRUE),

  ('cc100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'bb100001-0000-0000-0000-000000000003',
   'CLI-2025-007','Villa Vert Résidences',
   'k.naciri@villavert.ma','+212663667788',
   '{"street":"Bd Ghandi 120","city":"Casablanca","zip":"20000","country":"MA"}',
   'PROFESSIONNEL','Lotissement 12 villas — contrat Q3 2025.',TRUE),

  ('cc100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-008','Lycée Mohammed VI Kénitra',
   'direction@lm6kenitra.ac.ma','+212537223344',
   '{"street":"Avenue Hassan II","city":"Kénitra","zip":"14000","country":"MA"}',
   'PROFESSIONNEL','Établissement scolaire — 28 fenêtres remplacement simple vitrage.',TRUE),

  ('cc100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-009','Kamal Idrissi',
   'k.idrissi@outlook.com','+212674334455',
   '{"street":"Quartier Palmier Lot 22","city":"Marrakech","zip":"40000","country":"MA"}',
   'PARTICULIER','Villa individuelle — 10 fenêtres + 2 portes-fenêtres coulissantes.',TRUE),

  -- Ce client est lié au USER CLIENT de démo (demo-client)
  ('cc100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   NULL,
   'CLI-2025-010','Omar Chrif',
   'client@demo.erp.local','+212675445566',
   '{"street":"Rue Ibn Sina 3","city":"Casablanca","zip":"20000","country":"MA"}',
   'PARTICULIER','Compte CLIENT démo — peut suivre ses commandes en ligne.',TRUE),

  ('cc100001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002',
   'bb100001-0000-0000-0000-000000000006',
   'CLI-2025-011','RAMSA Direction Régionale',
   't.mansouri@ramsa.ma','+212671990011',
   '{"street":"Route de Meknès","city":"Rabat","zip":"10100","country":"MA"}',
   'PROFESSIONNEL','Bâtiment administratif R+3 — rénovation complète menuiseries.',TRUE)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. OPPORTUNITIES SUPPLÉMENTAIRES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO opportunities (id, tenant_id, client_id, title, description, status, estimated_value, probability, expected_close_date, assigned_to)
VALUES
  ('dd100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000002',
   'Villa Vert — 12 villas menuiseries aluminium',
   'Fourniture et pose fenêtres + portes-fenêtres coulissantes 12 villas haut standing.',
   'EN_COURS',265000.00,60,'2025-11-30','10000000-0000-0000-0000-000000000002'),

  ('dd100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000003',
   'Lycée Mohammed VI — remplacement 28 fenêtres',
   'Dépose ancien simple vitrage, fourniture + pose fenêtres alu double vitrage.',
   'GAGNEE',48500.00,100,'2025-06-30','10000000-0000-0000-0000-000000000003'),

  ('dd100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000006',
   'RAMSA — rénovation bâtiment administratif',
   'Remplacement total menuiseries bâtiment R+3, 45 ouvertures.',
   'EN_COURS',125000.00,75,'2025-10-15','10000000-0000-0000-0000-000000000003'),

  ('dd100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000004',
   'Villa Idrissi — fenêtres haut de gamme',
   '10 fenêtres + 2 portes-fenêtres coulissantes grande largeur. Profilés 60x60 laqué.',
   'NOUVELLE',62000.00,40,'2025-09-01','10000000-0000-0000-0000-000000000002'),

  ('dd100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000002',
   'Résidence Al Amal — deuxième tranche',
   'Tranche 2 : 12 appartements supplémentaires, même gamme que tranche 1.',
   'NOUVELLE',90000.00,50,'2025-12-15','10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. DEVIS SUPPLÉMENTAIRES + LIGNES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO devis (id, tenant_id, client_id, opportunity_id, reference, status, valid_until, notes, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  -- Jan 2025 — Lycée (ACCEPTE → sera converti)
  ('de100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000003','dd100001-0000-0000-0000-000000000002',
   'DEV-2025-1004','ACCEPTE','2025-03-31',
   'Lycée Mohammed VI — 28 fenêtres aluminium double vitrage, dépose-pose incluse.',
   0,40416.67,8083.33,48500.00),

  -- Fév 2025 — Aicha Benhima
  ('de100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000001',NULL,
   'DEV-2025-1005','ACCEPTE','2025-04-30',
   'Appartement Agdal — 4 fenêtres oscillo-battantes + 1 porte balcon.',
   0,8250.00,1650.00,9900.00),

  -- Mar 2025 — Kamal Idrissi
  ('de100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000004','dd100001-0000-0000-0000-000000000004',
   'DEV-2025-1006','ENVOYE','2025-08-31',
   'Villa Idrissi — 10 fenêtres 60x60 + 2 portes coulissantes grande largeur.',
   0,51666.67,10333.33,62000.00),

  -- Avr 2025 — RAMSA
  ('de100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000006','dd100001-0000-0000-0000-000000000003',
   'DEV-2025-1007','ACCEPTE','2025-07-31',
   'RAMSA bâtiment R+3 — 45 ouvertures aluminium. Remise partenaire public 0%.',
   0,104166.67,20833.33,125000.00),

  -- Refusé
  ('de100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000004',NULL,
   'DEV-2025-1008','REFUSE','2025-05-15',
   'Hotel Atlas — budget réduit, remise demandée non accordée.',
   0,62500.00,12500.00,75000.00),

  -- Brouillon récent — Omar Chrif (CLIENT user)
  ('de100001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000005',NULL,
   'DEV-2025-1009','BROUILLON','2025-09-30',
   'Résidence Chrif — 3 fenêtres PVC / alu coulissantes double vitrage.',
   0,14200.00,2840.00,17040.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- Lignes des nouveaux devis
INSERT INTO devis_lines (id, devis_id, product_id, product_snapshot, description, quantity, unit_price, tva_rate, discount_pct, total_ht, position)
VALUES
  -- DEV-2025-1004 (Lycée)
  ('d2000001-0000-0000-0000-000000000001','de100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   '{"reference":"ALU-PRO-6060","name":"Profilé aluminium 60x60 mm","unit":"ml","tva_rate":20}',
   'Profilés 60x60 pour 28 fenêtres',280,85.00,20.00,0,23800.00,0),

  ('d2000001-0000-0000-0000-000000000002','de100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Double vitrage 28 ouvertures',175,45.00,20.00,0,7875.00,1),

  ('d2000001-0000-0000-0000-000000000003','de100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000008',
   '{"reference":"POSE-FENETRE","name":"Pose fenêtre standard","unit":"unité","tva_rate":20}',
   'Dépose + pose 28 fenêtres',28,150.00,20.00,0,4200.00,2),

  -- DEV-2025-1005 (Benhima)
  ('d2000001-0000-0000-0000-000000000004','de100001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002',
   '{"reference":"ALU-PRO-4040","name":"Profilé aluminium 40x40 mm","unit":"ml","tva_rate":20}',
   'Profilés 40x40 appartement Agdal',64,62.00,20.00,0,3968.00,0),

  ('d2000001-0000-0000-0000-000000000005','de100001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Double vitrage 5 ouvertures',18,45.00,20.00,0,810.00,1),

  ('d2000001-0000-0000-0000-000000000006','de100001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000009',
   '{"reference":"POSE-PORTE","name":"Pose porte aluminium","unit":"unité","tva_rate":20}',
   'Pose 1 porte balcon',1,220.00,20.00,0,220.00,2),

  -- DEV-2025-1006 (Idrissi)
  ('d2000001-0000-0000-0000-000000000007','de100001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000001',
   '{"reference":"ALU-PRO-6060","name":"Profilé aluminium 60x60 mm","unit":"ml","tva_rate":20}',
   'Profilés 60x60 villa Idrissi',380,85.00,20.00,0,32300.00,0),

  ('d2000001-0000-0000-0000-000000000008','de100001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000004',
   '{"reference":"VIT-SIMPLE-6","name":"Vitrage simple 6 mm","unit":"m²","tva_rate":20}',
   'Vitrage simple 6mm pour occultation',45,22.00,20.00,0,990.00,1),

  -- DEV-2025-1007 (RAMSA)
  ('d2000001-0000-0000-0000-000000000009','de100001-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000001',
   '{"reference":"ALU-PRO-6060","name":"Profilé aluminium 60x60 mm","unit":"ml","tva_rate":20}',
   'Profilés 60x60 bâtiment RAMSA',850,85.00,20.00,0,72250.00,0),

  ('d2000001-0000-0000-0000-000000000010','de100001-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Double vitrage 45 ouvertures',280,45.00,20.00,0,12600.00,1),

  ('d2000001-0000-0000-0000-000000000011','de100001-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000008',
   '{"reference":"POSE-FENETRE","name":"Pose fenêtre standard","unit":"unité","tva_rate":20}',
   'Pose 45 ouvertures',45,150.00,20.00,0,6750.00,2),

  -- DEV-2025-1009 (Omar Chrif — CLIENT)
  ('d2000001-0000-0000-0000-000000000012','de100001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000002',
   '{"reference":"ALU-PRO-4040","name":"Profilé aluminium 40x40 mm","unit":"ml","tva_rate":20}',
   'Profilés 40x40 résidence Chrif',48,62.00,20.00,0,2976.00,0),

  ('d2000001-0000-0000-0000-000000000013','de100001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000003',
   '{"reference":"VIT-DOUBLE-4","name":"Vitrage double 4/16/4 mm","unit":"m²","tva_rate":20}',
   'Double vitrage 3 fenêtres',12,45.00,20.00,0,540.00,1)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. DEVIS REQUESTS (demandes CLIENT + web)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO devis_requests (id, tenant_id, client_id, client_name, client_email, client_phone, client_address, project_type, description, status, converted_devis_id, notes)
VALUES
  -- Soumise par le CLIENT démo — déjà convertie
  ('da000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000005',
   'Omar Chrif','client@demo.erp.local','+212675445566',
   'Rue Ibn Sina 3, Casablanca',
   'FENETRE','3 fenêtres coulissantes double vitrage pour salon et chambres.',
   'DEVIS_CREE','de100001-0000-0000-0000-000000000006',
   'Demande traitée par l''employé — devis DEV-2025-1009 créé.'),

  -- Nouvelle demande web anonyme
  ('da000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   NULL,
   'Hamid Zeroual','h.zeroual@gmail.com','+212676556677',
   'Quartier Hay Karima, Fès',
   'PORTE','Porte d''entrée aluminium avec vitrage sécurité, laquage anthracite RAL 7016.',
   'NOUVEAU',NULL,NULL),

  -- En étude
  ('da000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   NULL,
   'Btissam Hajjaj','b.hajjaj@realestate.ma','+212677667788',
   'Boulevard Panoramique, Témara',
   'BAIE_VITREE','Baie vitrée panoramique 4m × 2.4m, double vitrage feuilleté, système coulissant galandage.',
   'EN_ETUDE',NULL,
   'En attente des plans de l''architecte pour dimensionner correctement.'),

  -- Refusée
  ('da000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   NULL,
   'Anass Berkat','a.berkat@free.fr','+33612345678',
   'Expatrié France — chantier Tanger',
   'VERANDAS','Véranda 20m² structure aluminium + polycarbonate, budget 8000 MAD.',
   'REFUSE',NULL,
   'Budget insuffisant pour ce type de prestation. Client orienté vers un prestataire plastique.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devis_request_items (id, request_id, quantity, width_mm, height_mm, profile_series, opening_type, glass_type, color, accessories, notes, position)
VALUES
  ('db000001-0000-0000-0000-000000000001','da000001-0000-0000-0000-000000000001',
   2,1200.0,1100.0,'60mm','COULISSANT','DV_4_16_4','RAL 9016 Blanc',
   'Poignée olive bronze, arrêt de frappe',NULL,0),

  ('db000001-0000-0000-0000-000000000002','da000001-0000-0000-0000-000000000001',
   1,900.0,1100.0,'60mm','OSCILLO_BATTANT','DV_4_16_4','RAL 9016 Blanc',
   'Poignée olive bronze',NULL,1),

  ('db000001-0000-0000-0000-000000000003','da000001-0000-0000-0000-000000000002',
   1,1000.0,2200.0,'60mm','BATTANT','DV_SECURITE','RAL 7016 Anthracite',
   'Serrure multipoints 5 galets, barre anti-panique, judas numérique',NULL,0),

  ('db000001-0000-0000-0000-000000000004','da000001-0000-0000-0000-000000000003',
   1,4000.0,2400.0,'60mm','COULISSANT','FEUILLETE','RAL 9016 Blanc',
   'Joint brosse, seuil bas PMR, motorisation Somfy','Structure portante à vérifier avec BE',0)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. COMMANDES SUPPLÉMENTAIRES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO commandes (id, tenant_id, devis_id, reference, status, delivery_address, expected_delivery_date, notes)
VALUES
  ('c1000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'de100001-0000-0000-0000-000000000001',
   'CMD-2025-1003','CONFIRMEE',
   '{"street":"Avenue Hassan II","city":"Kénitra","zip":"14000","country":"MA"}',
   '2025-07-15','Lycée Mohammed VI — livraison à coordonner avec le proviseur.'),

  ('c1000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'de100001-0000-0000-0000-000000000002',
   'CMD-2025-1004','LIVREE',
   '{"street":"Rue Patrice Lumumba 8","city":"Rabat","zip":"10000","country":"MA"}',
   '2025-04-20','Appartement Benhima — livraison et pose terminées.'),

  ('c1000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'de100001-0000-0000-0000-000000000004',
   'CMD-2025-1005','EN_COURS',
   '{"street":"Route de Meknès","city":"Rabat","zip":"10100","country":"MA"}',
   '2025-09-30','RAMSA — livraison en 2 tranches : 25 + 20 ouvertures.'),

  ('c1000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'de000001-0000-0000-0000-000000000003',
   'CMD-2025-1006','EN_ATTENTE',
   '{"street":"Lotissement Ain Aouda","city":"Rabat","zip":"10170","country":"MA"}',
   '2025-08-31','Berrada — en attente acompte 30%.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. LIVRAISONS SUPPLÉMENTAIRES + LIGNES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO livraisons (id, tenant_id, commande_id, reference, status, delivery_date, notes)
VALUES
  ('1e000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'c1000001-0000-0000-0000-000000000002',
   'LIV-2025-1002','LIVREE','2025-04-18',
   'Appartement Benhima livré et posé. Client satisfait. Fiche réception signée.'),

  ('1e000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000002',
   'LIV-2025-1003','EN_COURS','2025-07-05',
   'ConstructPro tranche 1 — 40% des profilés livrés chantier Hay Hassani.'),

  ('1e000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'c1000001-0000-0000-0000-000000000003',
   'LIV-2025-1004','PLANIFIEE','2025-08-01',
   'RAMSA tranche 1 — 25 ouvertures planifiées.')
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO livraison_lines (id, livraison_id, product_id, product_reference, quantity_ordered, quantity_delivered)
VALUES
  ('1f000001-0000-0000-0000-000000000001','1e000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000002','ALU-PRO-4040',64,64),
  ('1f000001-0000-0000-0000-000000000002','1e000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003','VIT-DOUBLE-4',18,18),
  ('1f000001-0000-0000-0000-000000000003','1e000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001','ALU-PRO-6060',360,360),
  ('1f000001-0000-0000-0000-000000000004','1e000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000003','VIT-DOUBLE-4',176,176)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. FACTURES SUPPLÉMENTAIRES (réparties sur Jan–Mai 2025 pour le graphe CA)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO factures (id, tenant_id, commande_id, client_id, reference, status, issue_date, due_date, notes, total_ht, total_tva, total_ttc, amount_paid)
VALUES
  -- Janvier 2025
  ('fa100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   NULL,'cc000001-0000-0000-0000-000000000003',
   'FAC-2025-0101','PAYEE','2025-01-10','2025-02-09',
   'ConstructPro — travaux urgents annexe janvier.',
   22500.00,4500.00,27000.00,27000.00),

  ('fa100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   NULL,'cc000001-0000-0000-0000-000000000002',
   'FAC-2025-0102','PAYEE','2025-01-22','2025-02-21',
   'Résidence Al Amal — acompte signature contrat.',
   8333.33,1666.67,10000.00,10000.00),

  -- Février 2025
  ('fa100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   NULL,'cc000001-0000-0000-0000-000000000004',
   'FAC-2025-0201','PAYEE','2025-02-05','2025-03-07',
   'Hotel Atlas — étude technique et métrés.',
   12500.00,2500.00,15000.00,15000.00),

  ('fa100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   NULL,'cc000001-0000-0000-0000-000000000005',
   'FAC-2025-0202','PAYEE','2025-02-18','2025-03-20',
   'Amine Berrada — acompte 30% devis signé.',
   8580.00,1716.00,10296.00,10296.00),

  -- Mars 2025
  ('fa100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   NULL,'cc000001-0000-0000-0000-000000000003',
   'FAC-2025-0301','PAYEE','2025-03-12','2025-04-11',
   'ConstructPro — livraison partielle profilés mars.',
   31250.00,6250.00,37500.00,37500.00),

  -- Avril 2025 — Benhima + lycée acompte
  ('fa100001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002',
   'c1000001-0000-0000-0000-000000000002',
   'cc100001-0000-0000-0000-000000000001',
   'FAC-2025-0401','PAYEE','2025-04-22','2025-05-22',
   'Appartement Benhima — facture finale pose incluse.',
   8250.00,1650.00,9900.00,9900.00),

  ('fa100001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002',
   NULL,'cc100001-0000-0000-0000-000000000003',
   'FAC-2025-0402','PARTIELLEMENT_PAYEE','2025-04-28','2025-05-28',
   'Lycée Mohammed VI — acompte 50% à la commande.',
   20208.33,4041.67,24250.00,24250.00),

  -- Juin 2025 — RAMSA acompte
  ('fa100001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002',
   'c1000001-0000-0000-0000-000000000003',
   'cc100001-0000-0000-0000-000000000006',
   'FAC-2025-0601','PARTIELLEMENT_PAYEE','2025-06-03','2025-07-03',
   'RAMSA — acompte 30% commande.',
   31250.00,6250.00,37500.00,37500.00)
ON CONFLICT (tenant_id, reference) DO NOTHING;

-- Lignes factures
INSERT INTO facture_lines (id, facture_id, product_id, description, quantity, unit_price, tva_rate, discount_pct, total_ht, total_tva, total_ttc)
VALUES
  ('fc000001-0000-0000-0000-000000000001','fa100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'Profilés 60x60 urgence janvier',150,85.00,20.00,0,12750.00,2550.00,15300.00),
  ('fc000001-0000-0000-0000-000000000002','fa100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000008',
   'Pose 15 fenêtres',15,150.00,20.00,0,2250.00,450.00,2700.00),

  ('fc000001-0000-0000-0000-000000000003','fa100001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000002',
   'Profilés 40x40 appartement',64,62.00,20.00,0,3968.00,793.60,4761.60),
  ('fc000001-0000-0000-0000-000000000004','fa100001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000009',
   'Pose porte balcon',1,220.00,20.00,0,220.00,44.00,264.00),

  ('fc000001-0000-0000-0000-000000000005','fa100001-0000-0000-0000-000000000007',
   'a0000001-0000-0000-0000-000000000001',
   'Profilés 60x60 lycée',280,85.00,20.00,0,23800.00,4760.00,28560.00),

  ('fc000001-0000-0000-0000-000000000006','fa100001-0000-0000-0000-000000000008',
   'a0000001-0000-0000-0000-000000000001',
   'Profilés 60x60 RAMSA tranche 1',450,85.00,20.00,0,38250.00,7650.00,45900.00)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 11. ENCAISSEMENTS SUPPLÉMENTAIRES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes)
VALUES
  ('ec100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000001',
   27000.00,'2025-01-15','VIREMENT','VIR-2025-0115','ConstructPro virement janvier.'),

  ('ec100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000002',
   10000.00,'2025-01-24','CHEQUE','CHQ-2025-0124','Al Amal acompte — chèque CIH.'),

  ('ec100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000003',
   15000.00,'2025-02-08','VIREMENT','VIR-2025-0208','Hotel Atlas paiement étude.'),

  ('ec100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000004',
   10296.00,'2025-02-20','ESPECES','ESP-2025-0220','Berrada acompte espèces.'),

  ('ec100001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000005',
   37500.00,'2025-03-14','VIREMENT','VIR-2025-0314','ConstructPro mars — virement.'),

  ('ec100001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000006',
   9900.00,'2025-04-25','VIREMENT','VIR-2025-0425','Benhima règlement total.'),

  ('ec100001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000007',
   24250.00,'2025-05-03','CHEQUE','CHQ-2025-0503','Lycée MVI acompte 50%.'),

  ('ec100001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000002',
   'fa100001-0000-0000-0000-000000000008',
   37500.00,'2025-06-05','VIREMENT','VIR-2025-0605','RAMSA acompte 30%.')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 12. STOCK ITEMS SUPPLÉMENTAIRES (+ produits à alerte stock bas)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO stock_items (id, tenant_id, product_id, product_reference, product_name, location_id, quantity, min_quantity, max_quantity, reserved_quantity)
VALUES
  -- Vitrage simple — stock bas (alerte)
  ('51100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000004','VIT-SIMPLE-6','Vitrage simple 6 mm',
   '5c000001-0000-0000-0000-000000000001',
   18,30,300,0),

  -- Poignée aluminium
  ('51100001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000007','POIGNEE-ALU-OB','Poignée aluminium olive bronze',
   '5c000001-0000-0000-0000-000000000002',
   145,50,400,0),

  -- Calfeutrement — stock bas (alerte)
  ('51100001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000010','CALFEUTREMENT','Calfeutrement et finition',
   '5c000001-0000-0000-0000-000000000002',
   22,50,500,0),

  -- Profilé 4040 en zone quincaillerie (surplus)
  ('51100001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002','ALU-PRO-4040','Profilé aluminium 40x40 mm',
   '5c000001-0000-0000-0000-000000000002',
   80,0,200,0)
ON CONFLICT (tenant_id, product_id, location_id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 13. STOCK MOVEMENTS SUPPLÉMENTAIRES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000001'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000002'::uuid,'ALU-PRO-4040',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE',500,0,500,'BR-2025-0410','RECEPTION','Réception profilés 40x40 Q2',
  '10000000-0000-0000-0000-000000000002'::uuid,
  now()-interval '50 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000001');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000002'::uuid,'ALU-PRO-4040',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'SORTIE',64,500,436,'LIV-2025-1002','LIVRAISON','Sortie appartement Benhima',
  '10000000-0000-0000-0000-000000000003'::uuid,
  now()-interval '51 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000002');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000003'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid,'ALU-PRO-6060',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'ENTREE',400,850,1250,'BR-2025-0502','RECEPTION','Réapprovisionnement mai 60x60',
  '10000000-0000-0000-0000-000000000002'::uuid,
  now()-interval '35 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000003');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000004'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid,'ALU-PRO-6060',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'SORTIE',360,1250,890,'LIV-2025-1003','LIVRAISON','Sortie ConstructPro tranche 1',
  '10000000-0000-0000-0000-000000000003'::uuid,
  now()-interval '5 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000004');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000005'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000005'::uuid,'JOINT-EPDM-12',
  '5c000001-0000-0000-0000-000000000002'::uuid,
  'INVENTAIRE',380,400,380,'INV-2025-0601','INVENTAIRE','Inventaire physique juin — écart -20ml constaté',
  '10000000-0000-0000-0000-000000000003'::uuid,
  now()-interval '8 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000005');

INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, notes, created_by, occurred_at, reference_type, reference_id)
SELECT '5a100001-0000-0000-0000-000000000006'::uuid,'00000000-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000003'::uuid,'VIT-DOUBLE-4',
  '5c000001-0000-0000-0000-000000000001'::uuid,
  'SORTIE',176,215,39,'LIV-2025-1003','LIVRAISON','Sortie vitrage ConstructPro T1',
  '10000000-0000-0000-0000-000000000003'::uuid,
  now()-interval '5 days',NULL,NULL
WHERE NOT EXISTS(SELECT 1 FROM stock_movements WHERE id='5a100001-0000-0000-0000-000000000006');

-- ───────────────────────────────────────────────────────────────────────────
-- 14. FOURNISSEUR SUPPLÉMENTAIRE
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO fournisseurs (id, tenant_id, nom, code, email, telephone, adresse, pays, actif, notes, ice, delai_paiement_jours)
VALUES
  ('f0100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'QuincailPro Maroc','FOURN-QUI-001',
   'commandes@quincailpro.ma','+212520334455',
   'Rue de la Résistance, Zone Industrielle Mohammedia',
   'MA',TRUE,
   'Fournisseur quincaillerie et joints. Catalogue 3000+ références. Livraison J+3.',
   '005566778899001',30)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 15. BONS DE COMMANDE SUPPLÉMENTAIRES + LIGNES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO bons_commande (id, tenant_id, fournisseur_id, reference, status, date_commande, date_livraison_prevue, total_ht, total_tva, total_ttc, notes, created_by)
VALUES
  ('bc200001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'f0000001-0000-0000-0000-000000000002',
   'BC-2025-0701','EN_COURS',
   '2025-06-02','2025-06-17',
   40600.00,8120.00,48720.00,
   'Commande vitrage Q3 — stock alerte + réserve chantiers RAMSA et Lycée.',
   '10000000-0000-0000-0000-000000000002'),

  ('bc200001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   'f0100001-0000-0000-0000-000000000001',
   'BC-2025-0702','BROUILLON',
   '2025-06-09',NULL,
   4350.00,870.00,5220.00,
   'Brouillon commande quincaillerie — poignées + paumelles + joints.',
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (tenant_id, reference) DO NOTHING;

INSERT INTO bons_commande_lignes (id, bon_commande_id, product_id, designation, unite, quantite, prix_unitaire_ht, tva_rate, total_ht, position, reference)
VALUES
  ('bc300001-0000-0000-0000-000000000001','bc200001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000003',
   'Vitrage double 4/16/4 faiblement émissif','m²',520,42.00,20.00,21840.00,0,'VIT-DOUBLE-4'),

  ('bc300001-0000-0000-0000-000000000002','bc200001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000004',
   'Vitrage simple clair 6mm','m²',85,22.00,20.00,1870.00,1,'VIT-SIMPLE-6'),

  ('bc300001-0000-0000-0000-000000000003','bc200001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000007',
   'Poignée aluminium olive bronze','unité',80,28.00,20.00,2240.00,0,'POIGNEE-ALU-OB'),

  ('bc300001-0000-0000-0000-000000000004','bc200001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000006',
   'Paumelle 3D réglable','unité',40,12.00,20.00,480.00,1,'PAUMELLE-3D')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 16. BONS DE RÉCEPTION SUPPLÉMENTAIRES + LIGNES
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO bons_reception (id, tenant_id, bon_commande_id, reference, status, date_reception, notes, created_by)
VALUES
  ('be100001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
   'bc000001-0000-0000-0000-000000000001',
   'BR-2025-0510','PARTIEL','2025-05-10',
   'Réception partielle — profilés 60x60 conformes (750ml). Profilés 4040 manquants, relance fournisseur.',
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bons_reception_lignes (id, bon_reception_id, bon_commande_ligne_id, product_id, designation, quantite_commandee, quantite_recue, position)
VALUES
  ('bf100001-0000-0000-0000-000000000001','be100001-0000-0000-0000-000000000001',
   'bc100001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'Profilé aluminium 60x60 mm',750,750,0),

  ('bf100001-0000-0000-0000-000000000002','be100001-0000-0000-0000-000000000001',
   'bc100001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002',
   'Profilé aluminium 40x40 mm',550,0,1)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Extra seeds for demo client (client@demo.erp.local)
-- Adds a sample quote, invoice, encaissement and a portal request for demo client
-- Tenant: demo-tenant = '00000000-0000-0000-0000-000000000002'
-- Client: Omar Chrif = 'cc100001-0000-0000-0000-000000000005'
-- ───────────────────────────────────────────────────────────────────────────

-- Ensure RLS is OFF for seed block (file top has RLS OFF during seed)

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

INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes)
VALUES
  ('ec200001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000002',
   'fa200001-0000-0000-0000-000000000009',2304.00,'2025-06-12','VIREMENT','VIR-DEMO-2025-06-12',
   'Acompte reçu via virement pour demo client.')
ON CONFLICT (id) DO NOTHING;

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

-- ─── Re-enable RLS ────────────────────────────────────────────────────────────
SET row_security = ON;

-- ─── Vérification finale ──────────────────────────────────────────────────────
SELECT table_name, count
FROM (
  SELECT 'prospects'        AS table_name, count(*) FROM prospects        WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'clients',          count(*) FROM clients          WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'opportunities',    count(*) FROM opportunities    WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'devis',            count(*) FROM devis             WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'devis_lines',      count(*) FROM devis_lines      dl JOIN devis d ON d.id=dl.devis_id WHERE d.tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'devis_requests',   count(*) FROM devis_requests   WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'commandes',        count(*) FROM commandes         WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'livraisons',       count(*) FROM livraisons        WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'factures',         count(*) FROM factures          WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'facture_lines',    count(*) FROM facture_lines    fl JOIN factures f ON f.id=fl.facture_id WHERE f.tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'encaissements',    count(*) FROM encaissements     WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'stock_locations',  count(*) FROM stock_locations   WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'stock_items',      count(*) FROM stock_items       WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'stock_movements',  count(*) FROM stock_movements   WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'fournisseurs',     count(*) FROM fournisseurs      WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'bons_commande',    count(*) FROM bons_commande     WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'bons_reception',   count(*) FROM bons_reception    WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'devis_req_items',  count(*) FROM devis_request_items dri JOIN devis_requests dr ON dr.id=dri.request_id WHERE dr.tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'tenant_branding',  count(*) FROM tenant_branding   WHERE tenant_id='00000000-0000-0000-0000-000000000002' UNION ALL
  SELECT 'tenant_notices',   count(*) FROM tenant_notices    WHERE tenant_id='00000000-0000-0000-0000-000000000002'
) t
ORDER BY table_name;
