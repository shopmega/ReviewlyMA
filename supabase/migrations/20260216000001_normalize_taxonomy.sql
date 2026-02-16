
-- Taxonomy Normalization Migration
-- Standardizes Category and Subcategory naming across the businesses table

BEGIN;

-- 1. Standardize Categories in businesses table
-- Fix apostrophes and merge outliers
UPDATE businesses 
SET category = 'Centres d’Appel & BPO' 
WHERE category = 'Centres d''Appel & BPO';

UPDATE businesses 
SET category = 'Distribution & Commerce' 
WHERE category = 'Distribution';

UPDATE businesses 
SET category = 'Services Professionnels' 
WHERE category = 'Services';

-- 2. Standardize Subcategories (Naming, Translation, and Deduplication)
UPDATE businesses SET subcategory = 'Banque' WHERE subcategory IN ('Banking', 'Banque');
UPDATE businesses SET subcategory = 'Assurance' WHERE subcategory = 'Insurance';
UPDATE businesses SET subcategory = 'Comptabilité & Audit' WHERE subcategory = 'Accounting & Audit';
UPDATE businesses SET subcategory = 'Fintech & Paiement' WHERE subcategory = 'Fintech & paiement';
UPDATE businesses SET subcategory = 'Centre d''Appels & BPO' WHERE subcategory IN ('BPO / Call Center', 'Centre d''appels', 'Centre d’appels', 'BPO & relation client', 'BPO & services');
UPDATE businesses SET subcategory = 'Externalisation (BPO)' WHERE subcategory = 'Outsourcing';
UPDATE businesses SET subcategory = 'Import & Export' WHERE subcategory = 'Import/Export';
UPDATE businesses SET subcategory = 'Alimentation & Boissons' WHERE subcategory = 'Food & Beverage';
UPDATE businesses SET subcategory = 'Commerce de détail' WHERE subcategory = 'Retail';
UPDATE businesses SET subcategory = 'Hôtellerie' WHERE subcategory = 'Hospitality';
UPDATE businesses SET subcategory = 'Construction & BTP' WHERE subcategory IN ('Construction', 'Construction BTP');
UPDATE businesses SET subcategory = 'Immobilier' WHERE subcategory = 'Real Estate';
UPDATE businesses SET subcategory = 'Industrie Manufacturière' WHERE subcategory = 'Manufacturing';
UPDATE businesses SET subcategory = 'Automobile' WHERE subcategory = 'Automotive';
UPDATE businesses SET subcategory = 'Mines & Extraction' WHERE subcategory IN ('Mining', 'Mines', 'Extraction Minière');
UPDATE businesses SET subcategory = 'Industrie Pharmaceutique' WHERE subcategory = 'Pharmaceuticals';
UPDATE businesses SET subcategory = 'Impression & Emballage' WHERE subcategory = 'Printing & Packaging';
UPDATE businesses SET subcategory = 'Santé' WHERE subcategory = 'Healthcare';
UPDATE businesses SET subcategory = 'Marketing & Publicité' WHERE subcategory = 'Marketing & Advertising';
UPDATE businesses SET subcategory = 'Services Juridiques' WHERE subcategory = 'Legal Services';
UPDATE businesses SET subcategory = 'Conseil & Audit' WHERE subcategory IN ('Consulting', 'Audit & conseil');
UPDATE businesses SET subcategory = 'Services de Nettoyage' WHERE subcategory = 'Cleaning Services';
UPDATE businesses SET subcategory = 'Services de Maintenance' WHERE subcategory = 'Maintenance Services';
UPDATE businesses SET subcategory = 'Ingénierie' WHERE subcategory = 'Engineering';
UPDATE businesses SET subcategory = 'Services de Sécurité' WHERE subcategory = 'Security Services';
UPDATE businesses SET subcategory = 'Télécommunications' WHERE subcategory = 'Telecom';
UPDATE businesses SET subcategory = 'Informatique & Logiciels' WHERE subcategory = 'IT & Software';
UPDATE businesses SET subcategory = 'Éducation' WHERE subcategory = 'Education';
UPDATE businesses SET subcategory = 'Énergie' WHERE subcategory = 'Energy';
UPDATE businesses SET subcategory = 'Transport & Logistique' WHERE subcategory = 'Logistics & Transport';

-- 3. Cleanup empty/null strings
UPDATE businesses SET subcategory = NULL WHERE subcategory = '';

COMMIT;
