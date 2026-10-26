-- Flyway migration: normalize legacy bons_reception.status values
-- Map legacy values like 'COMPLET' to current enum names

UPDATE bons_reception
SET status = 'CONFIRME'
WHERE status ILIKE 'COMPLET';

UPDATE bons_reception
SET status = 'EN_COURS'
WHERE status ILIKE 'ENCOURS'
   OR status ILIKE 'EN-COURS'
   OR status ILIKE 'EN COURS';

UPDATE bons_reception
SET status = 'ANNULE'
WHERE status ILIKE 'ANNULEE'
   OR status ILIKE 'ANNULÉ'
   OR status ILIKE 'ANNULÉE';
