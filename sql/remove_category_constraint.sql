-- Remove the category check constraint to allow custom categories
-- This fixes the "photos_category_check" constraint violation error

-- First, try to drop the constraint (it may or may not exist)
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_category_check;

-- Also check for any other category-related constraints and remove them
-- (Supabase may have created variations of the constraint name)
DO $$
DECLARE 
    constraint_name TEXT;
BEGIN
    -- Find all check constraints on photos table that mention 'category'
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'photos'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%category%'
    LOOP
        -- Drop each constraint
        EXECUTE format('ALTER TABLE photos DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Verify no category constraints remain
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'photos'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%category%';