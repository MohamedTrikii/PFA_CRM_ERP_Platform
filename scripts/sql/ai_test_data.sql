-- Données de test pour AI platform
-- Ajout de données de test dans les tables AI

-- Récupérer un tenant_id réel
\set tenant_id '(SELECT id FROM tenants LIMIT 1)'

-- Insérer des documents de test (devis)
INSERT INTO ai_documents (tenant_id, source_type, source_id, title, content, metadata) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'devis', gen_random_uuid(), 'Fenêtre Aluminium 1.2m x 1.4m', 
'Devis pour fenêtre aluminium coulissante double vitrage 1.2m x 1.4m. Type de verre: DV 4-16-4. Profil: T60. Quantité: 1', 
'{"window_type": "coulissant", "dimensions": "1200x1400", "glass": "DV_4_16_4"}'),

('00000000-0000-0000-0000-000000000001'::uuid, 'devis', gen_random_uuid(), 'Porte-fenêtre Aluminium 2m x 2.4m',
'Devis pour porte-fenêtre aluminium 2m x 2.4m double vitrage. Profil haut de gamme T80. Finition: Blanc RAL 9016. Quantité: 2',
'{"window_type": "porte_fenetre", "dimensions": "2000x2400", "quantity": 2}'),

('00000000-0000-0000-0000-000000000001'::uuid, 'facture', gen_random_uuid(), 'Facture F-2026-001',
'Facture cliente pour commande de fenêtres. Total: 15,000 TND. Montant payé: 8,000 TND. Solde: 7,000 TND',
'{"invoice_number": "F-2026-001", "total": 15000, "paid": 8000, "status": "partial"}'),

('00000000-0000-0000-0000-000000000001'::uuid, 'stock', gen_random_uuid(), 'État du stock - Profils Aluminium',
'Stock actuel: Profil T60: 500 unités (critique à 100), Profil T80: 200 unités (critique à 50), Verre 4-16-4: 1000 m², Verre 6-16-6: 300 m²',
'{"product_type": "profiles", "critical_items": 2}'),

('00000000-0000-0000-0000-000000000002'::uuid, 'devis', gen_random_uuid(), 'Vitrages sur mesure - Lot commercial',
'Vitrages pour projet commercial. Dimensions: 1.5m x 3m (20 unités). Type: Teinté bleu. Délai: 10 jours',
'{"commercial_order": true, "quantity": 20}');

-- Insérer des embeddings statiques (placeholder)
INSERT INTO ai_embeddings (document_id, tenant_id, embedding, model_name) 
SELECT id, tenant_id, random()::text::vector, 'placeholder' FROM ai_documents LIMIT 1;

SELECT 'Données de test créées avec succès' as result;
