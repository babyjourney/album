-- Add is_suspended column to families table
-- This allows admins to pause/suspend individual family albums

ALTER TABLE families ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_families_is_suspended ON families(is_suspended);
