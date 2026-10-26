-- ── Public-site content columns for tenant_branding ──────────────────────────

ALTER TABLE tenant_branding
    ADD COLUMN IF NOT EXISTS hero_title       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS hero_subtitle    VARCHAR(512),
    ADD COLUMN IF NOT EXISTS hero_cta_text    VARCHAR(100)  DEFAULT 'Demander un devis',
    ADD COLUMN IF NOT EXISTS about_title      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS about_text       TEXT,
    ADD COLUMN IF NOT EXISTS services_json    TEXT,   -- JSON array: [{title,description,icon}]
    ADD COLUMN IF NOT EXISTS gallery_json     TEXT,   -- JSON array: [{fid,caption,alt}]
    ADD COLUMN IF NOT EXISTS stats_json       TEXT,   -- JSON array: [{label,value}]
    ADD COLUMN IF NOT EXISTS contact_email    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_phone    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contact_address  TEXT,
    ADD COLUMN IF NOT EXISTS social_facebook  TEXT,
    ADD COLUMN IF NOT EXISTS social_linkedin  TEXT,
    ADD COLUMN IF NOT EXISTS social_instagram TEXT,
    ADD COLUMN IF NOT EXISTS social_twitter   TEXT,
    ADD COLUMN IF NOT EXISTS site_description TEXT;
