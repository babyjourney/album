-- ============================================================
-- UPGRADE: free/premium  ->  3 tiers (starter / family / legacy)
-- Run in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Safe to run more than once (idempotent).
-- ============================================================

-- 1. Drop the old 2-value CHECK so we can migrate the data.
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_package_check;

-- 2. Migrate existing values:
--    free  -> starter   (free baseline)
--    premium -> family  (the paid mid tier)
--    legacy is brand new; no existing account is on it (promote manually).
UPDATE families SET package = 'starter' WHERE package IS NULL OR package IN ('free', '');
UPDATE families SET package = 'family'  WHERE package = 'premium';

-- 3. Default for new rows is now 'starter'.
ALTER TABLE families ALTER COLUMN package SET DEFAULT 'starter';

-- 4. Re-add the CHECK with the 3 valid tier values.
ALTER TABLE families ADD CONSTRAINT families_package_check
  CHECK (package IN ('starter', 'family', 'legacy'));

COMMENT ON COLUMN families.package IS
  'Plan tier: starter (free, SD, 1 child) | family (HD, multi-child, full toolkit) | legacy (+ export, concierge, imports).';
