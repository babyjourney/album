-- Add last_accessed column to families table for tracking when albums were last accessed
-- This helps administrators monitor which families are actively using their albums

-- Add the last_accessed column
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;

-- Add comment to document the field
COMMENT ON COLUMN families.last_accessed IS 'Timestamp of when the family album was last accessed by any user';

-- Create an index for better performance when querying by last access
CREATE INDEX IF NOT EXISTS idx_families_last_accessed ON families(last_accessed);

-- Add email column if it doesn't exist (for contact data collection)
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add comment for email field
COMMENT ON COLUMN families.email IS 'Email address for family contact and notifications';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_families_email ON families(email);

-- Update any existing families to set last_accessed to their creation date if null
UPDATE families 
SET last_accessed = created_at 
WHERE last_accessed IS NULL;