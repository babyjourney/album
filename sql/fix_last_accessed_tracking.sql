-- Fix last_accessed tracking by resetting existing values
-- The previous migration incorrectly set last_accessed = created_at for existing families
-- This reset allows proper tracking of actual album access

-- Method 1: Reset only families where last_accessed equals created_at
UPDATE families 
SET last_accessed = NULL 
WHERE last_accessed = created_at;

-- Method 2: If you want to reset all last_accessed values completely (more thorough)
-- Uncomment the line below if you want a complete reset:
-- UPDATE families SET last_accessed = NULL;

-- Method 3: Reset only recently created families (created today)
-- UPDATE families 
-- SET last_accessed = NULL 
-- WHERE last_accessed = created_at 
-- AND created_at >= CURRENT_DATE;

-- Verify the fix
SELECT 
  id,
  name,
  created_at,
  last_accessed,
  CASE 
    WHEN last_accessed IS NULL THEN '✅ OK - Niciodată accesat'
    WHEN last_accessed = created_at THEN '❌ GREȘIT - Setat la data creării'
    ELSE '✅ OK - Acces real înregistrat'
  END as access_status,
  CASE 
    WHEN last_accessed IS NULL THEN 'N/A'
    ELSE EXTRACT(EPOCH FROM (last_accessed - created_at))::text || ' secunde diferență'
  END as time_difference
FROM families 
ORDER BY created_at DESC
LIMIT 10;

-- Summary statistics
SELECT 
  COUNT(*) as total_families,
  COUNT(CASE WHEN last_accessed IS NULL THEN 1 END) as never_accessed,
  COUNT(CASE WHEN last_accessed = created_at THEN 1 END) as incorrectly_set,
  COUNT(CASE WHEN last_accessed IS NOT NULL AND last_accessed != created_at THEN 1 END) as properly_tracked
FROM families;