-- ── Reference Data System ─────────────────────────────────────────────────────
-- Global catalog of dropdown / radio / checkbox choices.
-- Administered from the SuperAdmin panel — zero hard-coded values in Angular.

CREATE TABLE reference_category (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    icon        VARCHAR(100),
    is_system   BOOLEAN NOT NULL DEFAULT TRUE,   -- system categories cannot be deleted
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reference_value (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID NOT NULL REFERENCES reference_category(id) ON DELETE CASCADE,
    code         VARCHAR(100) NOT NULL,
    label        VARCHAR(255) NOT NULL,
    label_fr     VARCHAR(255),
    label_ar     VARCHAR(255),
    label_en     VARCHAR(255),
    color        VARCHAR(50),
    icon         VARCHAR(100),
    sort_order   INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    is_default   BOOLEAN NOT NULL DEFAULT FALSE,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(category_id, code)
);

CREATE INDEX idx_ref_value_cat   ON reference_value(category_id);
CREATE INDEX idx_ref_value_active ON reference_value(category_id, is_active);

-- ── Seed: Categories ───────────────────────────────────────────────────────────

INSERT INTO reference_category (code, name, description, icon, is_system, sort_order) VALUES
('TYPE_PROJET',       'Type de projet',        'Type de projet architectural',             'home',                  TRUE, 10),
('CATEGORIE_PRODUIT', 'Catégorie produit',     'Familles de produits menuiserie aluminium','category',              TRUE, 20),
('TYPE_OUVERTURE',    'Type d''ouverture',     'Systèmes d''ouverture disponibles',        'open_with',             TRUE, 30),
('TYPE_VITRAGE',      'Type de vitrage',       'Options de vitrage',                       'layers',                TRUE, 40),
('COULEUR',           'Couleurs',              'Couleurs disponibles pour les profilés',   'palette',               TRUE, 50),
('GAMME_PROFILE',     'Gamme de profilés',     'Gammes de profilés aluminium',             'straighten',            TRUE, 60),
('ACCESSOIRE',        'Accessoires',           'Accessoires installables',                 'build',                 TRUE, 70),
('STATUT_CRM',        'Statuts CRM',           'Statuts des prospects et opportunités',    'flag',                  TRUE, 80),
('STATUT_DEVIS',      'Statuts Devis',         'Cycle de vie d''un devis',                'description',           TRUE, 90),
('STATUT_FACTURE',    'Statuts Factures',      'Cycle de vie d''une facture',             'receipt',               TRUE,100),
('STATUT_PRODUCTION', 'Statuts Production',    'Étapes de fabrication',                   'precision_manufacturing',TRUE,110),
('SOURCE_PROSPECTION','Sources de prospection','Origines des leads commerciaux',           'source',                TRUE,120),
('TYPE_CLIENT',       'Types de clients',      'Catégories de clients',                   'people',                TRUE,130),
('TYPE_FOURNISSEUR',  'Types de fournisseurs', 'Catégories de fournisseurs',              'store',                 TRUE,140),
('TYPE_PAIEMENT',     'Types de paiement',     'Moyens de règlement acceptés',            'payment',               TRUE,150),
('GOUVERNORAT',       'Gouvernorats',          'Gouvernorats de Tunisie',                 'map',                   TRUE,160),
('PAYS',              'Pays',                  'Pays',                                    'public',                TRUE,170),
('UNITE_MESURE',      'Unités de mesure',      'Unités pour produits et articles',         'straighten',            TRUE,180);

-- ── Seed: TYPE_PROJET ─────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, sort_order, is_default)
SELECT id,'MAISON',      'Maison',      'Maison',      'منزل',       'House',      10,TRUE  FROM reference_category WHERE code='TYPE_PROJET'
UNION ALL SELECT id,'APPARTEMENT','Appartement','Appartement','شقة',        'Apartment',  20,FALSE FROM reference_category WHERE code='TYPE_PROJET'
UNION ALL SELECT id,'VILLA',      'Villa',      'Villa',      'فيلا',      'Villa',       30,FALSE FROM reference_category WHERE code='TYPE_PROJET'
UNION ALL SELECT id,'BUREAU',     'Bureau',     'Bureau',     'مكتب',       'Office',     40,FALSE FROM reference_category WHERE code='TYPE_PROJET'
UNION ALL SELECT id,'COMMERCE',   'Commerce',   'Commerce',   'محل تجاري', 'Shop',        50,FALSE FROM reference_category WHERE code='TYPE_PROJET'
UNION ALL SELECT id,'INDUSTRIE',  'Industrie',  'Industrie',  'صناعة',     'Industry',   60,FALSE FROM reference_category WHERE code='TYPE_PROJET';

-- ── Seed: CATEGORIE_PRODUIT ───────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, sort_order, is_default)
SELECT id,'FENETRE',       'Fenêtre',       'Fenêtre',       'نافذة',           'Window',       10,TRUE  FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'PORTE',         'Porte',         'Porte',         'باب',             'Door',         20,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'PORTE_FENETRE', 'Porte-Fenêtre', 'Porte-Fenêtre', 'باب-نافذة',       'French Door',  30,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'BAIE_VITREE',   'Baie Vitrée',   'Baie Vitrée',   'واجهة زجاجية',   'Sliding Bay',  40,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'VERANDA',       'Véranda',       'Véranda',       'شرفة مغطاة',     'Veranda',      50,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'PERGOLA',       'Pergola',       'Pergola',       'بيرغولا',         'Pergola',      60,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'FACADE_RIDEAU', 'Façade Rideau', 'Façade Rideau', 'واجهة ستائر',    'Curtain Wall', 70,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT'
UNION ALL SELECT id,'GARDE_CORPS',   'Garde-Corps',   'Garde-Corps',   'حاجز حماية',     'Handrail',     80,FALSE FROM reference_category WHERE code='CATEGORIE_PRODUIT';

-- ── Seed: TYPE_OUVERTURE ──────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, sort_order, is_default)
SELECT id,'COULISSANT',      'Coulissante',      'Coulissante',      'منزلق',       'Sliding',   10,FALSE FROM reference_category WHERE code='TYPE_OUVERTURE'
UNION ALL SELECT id,'BATTANT',         'Battante',         'Battante',         'ذو مصراعين', 'Casement',  20,TRUE  FROM reference_category WHERE code='TYPE_OUVERTURE'
UNION ALL SELECT id,'OSCILLO_BATTANT', 'Oscillo-battante', 'Oscillo-battante', 'تأرجح',      'Tilt&Turn', 30,FALSE FROM reference_category WHERE code='TYPE_OUVERTURE'
UNION ALL SELECT id,'FIXE',            'Fixe',             'Fixe',             'ثابت',        'Fixed',    40,FALSE FROM reference_category WHERE code='TYPE_OUVERTURE'
UNION ALL SELECT id,'ACCORDEON',       'Accordéon',        'Accordéon',        'أكورديون',   'Folding',   50,FALSE FROM reference_category WHERE code='TYPE_OUVERTURE';

-- ── Seed: TYPE_VITRAGE ────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, color, sort_order, is_default)
SELECT id,'SIMPLE',   'Simple',   'Simple',   'بسيط',  'Single',   '#94a3b8',10,FALSE FROM reference_category WHERE code='TYPE_VITRAGE'
UNION ALL SELECT id,'DOUBLE',   'Double',   'Double',   'مزدوج', 'Double',   '#3b82f6',20,TRUE  FROM reference_category WHERE code='TYPE_VITRAGE'
UNION ALL SELECT id,'TRIPLE',   'Triple',   'Triple',   'ثلاثي', 'Triple',   '#6366f1',30,FALSE FROM reference_category WHERE code='TYPE_VITRAGE'
UNION ALL SELECT id,'SECURISE', 'Sécurisé', 'Sécurisé', 'مؤمّن', 'Secure',   '#f59e0b',40,FALSE FROM reference_category WHERE code='TYPE_VITRAGE'
UNION ALL SELECT id,'FEUILLETE','Feuilleté','Feuilleté','مصفّح',  'Laminated','#10b981',50,FALSE FROM reference_category WHERE code='TYPE_VITRAGE';

-- ── Seed: COULEUR ─────────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, color, sort_order, is_default)
SELECT id,'BLANC',           'Blanc',           'Blanc',           'أبيض',       'White',          '#f8fafc',10,TRUE  FROM reference_category WHERE code='COULEUR'
UNION ALL SELECT id,'NOIR',            'Noir',            'Noir',            'أسود',       'Black',          '#0f172a',20,FALSE FROM reference_category WHERE code='COULEUR'
UNION ALL SELECT id,'GRIS_ANTHRACITE', 'Gris Anthracite', 'Gris Anthracite', 'رمادي فحمي', 'Anthracite Gray','#475569',30,FALSE FROM reference_category WHERE code='COULEUR'
UNION ALL SELECT id,'ASPECT_BOIS',     'Aspect Bois',     'Aspect Bois',     'لون خشبي',   'Wood Effect',    '#92400e',40,FALSE FROM reference_category WHERE code='COULEUR';

-- ── Seed: GAMME_PROFILE ───────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, sort_order, is_default)
SELECT id,'GAMME_40',     'Gamme 40',     'Gamme 40',     'سلسلة 40',      'Range 40',     10,FALSE FROM reference_category WHERE code='GAMME_PROFILE'
UNION ALL SELECT id,'GAMME_45',     'Gamme 45',     'Gamme 45',     'سلسلة 45',      'Range 45',     20,FALSE FROM reference_category WHERE code='GAMME_PROFILE'
UNION ALL SELECT id,'GAMME_50',     'Gamme 50',     'Gamme 50',     'سلسلة 50',      'Range 50',     30,TRUE  FROM reference_category WHERE code='GAMME_PROFILE'
UNION ALL SELECT id,'GAMME_PREMIUM','Gamme Premium','Gamme Premium','سلسلة ممتازة', 'Premium Range',40,FALSE FROM reference_category WHERE code='GAMME_PROFILE';

-- ── Seed: ACCESSOIRE ──────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_fr, label_ar, label_en, sort_order)
SELECT id,'MOUSTIQUAIRE',      'Moustiquaire',      'Moustiquaire',      'ناموسية',     'Mosquito Net',  10 FROM reference_category WHERE code='ACCESSOIRE'
UNION ALL SELECT id,'VOLET_ROULANT',     'Volet roulant',     'Volet roulant',     'ستارة لفافة', 'Roller Shutter',20 FROM reference_category WHERE code='ACCESSOIRE'
UNION ALL SELECT id,'MOTORISATION',      'Motorisation',      'Motorisation',      'تحريك آلي',   'Motorization',  30 FROM reference_category WHERE code='ACCESSOIRE'
UNION ALL SELECT id,'SERRURE_CONNECTEE', 'Serrure connectée', 'Serrure connectée', 'قفل ذكي',     'Smart Lock',    40 FROM reference_category WHERE code='ACCESSOIRE';

-- ── Seed: STATUT_CRM ──────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, color, sort_order, is_default)
SELECT id,'NOUVEAU',     'Nouveau',     '#94a3b8',10,TRUE  FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'CONTACTE',    'Contacté',    '#3b82f6',20,FALSE FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'QUALIFIE',    'Qualifié',    '#8b5cf6',30,FALSE FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'PROPOSITION', 'Proposition', '#f59e0b',40,FALSE FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'NEGOCIE',     'Négociation', '#f97316',50,FALSE FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'GAGNE',       'Gagné',       '#22c55e',60,FALSE FROM reference_category WHERE code='STATUT_CRM'
UNION ALL SELECT id,'PERDU',       'Perdu',       '#ef4444',70,FALSE FROM reference_category WHERE code='STATUT_CRM';

-- ── Seed: STATUT_DEVIS ────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, color, sort_order, is_default)
SELECT id,'BROUILLON','Brouillon','#94a3b8',10,TRUE  FROM reference_category WHERE code='STATUT_DEVIS'
UNION ALL SELECT id,'ENVOYE',   'Envoyé',   '#3b82f6',20,FALSE FROM reference_category WHERE code='STATUT_DEVIS'
UNION ALL SELECT id,'ACCEPTE',  'Accepté',  '#22c55e',30,FALSE FROM reference_category WHERE code='STATUT_DEVIS'
UNION ALL SELECT id,'REFUSE',   'Refusé',   '#ef4444',40,FALSE FROM reference_category WHERE code='STATUT_DEVIS'
UNION ALL SELECT id,'EXPIRE',   'Expiré',   '#f59e0b',50,FALSE FROM reference_category WHERE code='STATUT_DEVIS'
UNION ALL SELECT id,'ANNULE',   'Annulé',   '#6b7280',60,FALSE FROM reference_category WHERE code='STATUT_DEVIS';

-- ── Seed: STATUT_FACTURE ──────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, color, sort_order, is_default)
SELECT id,'BROUILLON',          'Brouillon',           '#94a3b8',10,TRUE  FROM reference_category WHERE code='STATUT_FACTURE'
UNION ALL SELECT id,'EMISE',              'Émise',               '#3b82f6',20,FALSE FROM reference_category WHERE code='STATUT_FACTURE'
UNION ALL SELECT id,'PARTIELLEMENT_PAYEE','Partiellement payée', '#f59e0b',30,FALSE FROM reference_category WHERE code='STATUT_FACTURE'
UNION ALL SELECT id,'PAYEE',              'Payée',               '#22c55e',40,FALSE FROM reference_category WHERE code='STATUT_FACTURE'
UNION ALL SELECT id,'EN_RETARD',          'En retard',           '#ef4444',50,FALSE FROM reference_category WHERE code='STATUT_FACTURE'
UNION ALL SELECT id,'ANNULEE',            'Annulée',             '#6b7280',60,FALSE FROM reference_category WHERE code='STATUT_FACTURE';

-- ── Seed: STATUT_PRODUCTION ───────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, color, sort_order, is_default)
SELECT id,'EN_ATTENTE','En attente','#94a3b8',10,TRUE  FROM reference_category WHERE code='STATUT_PRODUCTION'
UNION ALL SELECT id,'EN_COURS',  'En cours',  '#3b82f6',20,FALSE FROM reference_category WHERE code='STATUT_PRODUCTION'
UNION ALL SELECT id,'CONTROLE',  'Contrôle',  '#8b5cf6',30,FALSE FROM reference_category WHERE code='STATUT_PRODUCTION'
UNION ALL SELECT id,'TERMINE',   'Terminé',   '#22c55e',40,FALSE FROM reference_category WHERE code='STATUT_PRODUCTION'
UNION ALL SELECT id,'ANNULE',    'Annulé',    '#ef4444',50,FALSE FROM reference_category WHERE code='STATUT_PRODUCTION';

-- ── Seed: SOURCE_PROSPECTION ──────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, sort_order, is_default)
SELECT id,'BOUCHE_A_OREILLE','Bouche à oreille',10,TRUE  FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'SITE_WEB',        'Site web',        20,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'RESEAUX_SOCIAUX', 'Réseaux sociaux', 30,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'APPEL_ENTRANT',   'Appel entrant',   40,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'EMAIL',           'Email',           50,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'FOIRE_SALON',     'Foire / Salon',   60,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'PARTENAIRE',      'Partenaire',      70,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION'
UNION ALL SELECT id,'PUBLICITE',       'Publicité',       80,FALSE FROM reference_category WHERE code='SOURCE_PROSPECTION';

-- ── Seed: TYPE_CLIENT ─────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, sort_order, is_default)
SELECT id,'PARTICULIER',  'Particulier',  10,TRUE  FROM reference_category WHERE code='TYPE_CLIENT'
UNION ALL SELECT id,'PROFESSIONNEL','Professionnel',20,FALSE FROM reference_category WHERE code='TYPE_CLIENT'
UNION ALL SELECT id,'PROMOTEUR',   'Promoteur',    30,FALSE FROM reference_category WHERE code='TYPE_CLIENT'
UNION ALL SELECT id,'ADMINISTRE',  'Administré',   40,FALSE FROM reference_category WHERE code='TYPE_CLIENT';

-- ── Seed: TYPE_FOURNISSEUR ────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, sort_order, is_default)
SELECT id,'FABRICANT',    'Fabricant',    10,TRUE  FROM reference_category WHERE code='TYPE_FOURNISSEUR'
UNION ALL SELECT id,'DISTRIBUTEUR', 'Distributeur', 20,FALSE FROM reference_category WHERE code='TYPE_FOURNISSEUR'
UNION ALL SELECT id,'GROSSISTE',    'Grossiste',    30,FALSE FROM reference_category WHERE code='TYPE_FOURNISSEUR'
UNION ALL SELECT id,'SOUS_TRAITANT','Sous-traitant',40,FALSE FROM reference_category WHERE code='TYPE_FOURNISSEUR';

-- ── Seed: TYPE_PAIEMENT ───────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, icon, sort_order, is_default)
SELECT id,'VIREMENT', 'Virement bancaire','account_balance',10,FALSE FROM reference_category WHERE code='TYPE_PAIEMENT'
UNION ALL SELECT id,'CHEQUE',   'Chèque',           'receipt',        20,TRUE  FROM reference_category WHERE code='TYPE_PAIEMENT'
UNION ALL SELECT id,'ESPECES',  'Espèces',           'payments',       30,FALSE FROM reference_category WHERE code='TYPE_PAIEMENT'
UNION ALL SELECT id,'TRAITE',   'Traite',            'credit_card',    40,FALSE FROM reference_category WHERE code='TYPE_PAIEMENT'
UNION ALL SELECT id,'CB',       'Carte bancaire',    'credit_card',    50,FALSE FROM reference_category WHERE code='TYPE_PAIEMENT';

-- ── Seed: GOUVERNORAT (Tunisie) ───────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, sort_order)
SELECT id,'TUNIS',      'Tunis',       10 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'ARIANA',    'Ariana',      20 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'BEN_AROUS', 'Ben Arous',   30 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'MANOUBA',   'Manouba',     40 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'NABEUL',    'Nabeul',      50 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'ZAGHOUAN',  'Zaghouan',    60 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'BIZERTE',   'Bizerte',     70 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'BEJA',      'Béja',        80 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'JENDOUBA',  'Jendouba',    90 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'KEF',       'Le Kef',     100 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'SILIANA',   'Siliana',    110 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'KAIROUAN',  'Kairouan',   120 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'KASSERINE', 'Kasserine',  130 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'SIDI_BOUZID','Sidi Bouzid',140 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'SOUSSE',    'Sousse',     150 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'MONASTIR',  'Monastir',   160 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'MAHDIA',    'Mahdia',     170 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'SFAX',      'Sfax',       180 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'GABES',     'Gabès',      190 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'MEDENINE',  'Médenine',   200 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'TATAOUINE', 'Tataouine',  210 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'GAFSA',     'Gafsa',      220 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'TOZEUR',    'Tozeur',     230 FROM reference_category WHERE code='GOUVERNORAT'
UNION ALL SELECT id,'KEBILI',    'Kébili',     240 FROM reference_category WHERE code='GOUVERNORAT';

-- ── Seed: PAYS ────────────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, sort_order, is_default)
SELECT id,'TN',   'Tunisie',   10,TRUE  FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'MA',   'Maroc',     20,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'DZ',   'Algérie',   30,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'FR',   'France',    40,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'BE',   'Belgique',  50,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'DE',   'Allemagne', 60,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'IT',   'Italie',    70,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'ES',   'Espagne',   80,FALSE FROM reference_category WHERE code='PAYS'
UNION ALL SELECT id,'OTHER','Autre',     99,FALSE FROM reference_category WHERE code='PAYS';

-- ── Seed: UNITE_MESURE ────────────────────────────────────────────────────────

INSERT INTO reference_value (category_id, code, label, label_en, sort_order, is_default)
SELECT id,'UNITE',  'Unité',   'Unit',        10,TRUE  FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'PIECE',  'Pièce',   'Piece',       20,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'ML',     'ml',      'ml',          30,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'M',      'm',       'm',           40,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'M2',     'm²',      'm²',          50,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'M3',     'm³',      'm³',          60,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'KG',     'kg',      'kg',          70,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'LOT',    'Lot',     'Lot',         80,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'HEURE',  'Heure',   'Hour',        90,FALSE FROM reference_category WHERE code='UNITE_MESURE'
UNION ALL SELECT id,'PAQUET', 'Paquet',  'Pack',       100,FALSE FROM reference_category WHERE code='UNITE_MESURE';
