-- Add phone_number column to families table
-- This migration adds support for phone number authentication

-- Add phone_number column to families table
ALTER TABLE families 
ADD COLUMN phone_number VARCHAR(20);

-- Add index for faster lookups on phone_number
CREATE INDEX idx_families_phone_number ON families(phone_number);

-- Add index for faster lookups on phone_number + viewer_pin combination
CREATE INDEX idx_families_phone_viewer_pin ON families(phone_number, viewer_pin);

-- Add index for faster lookups on phone_number + editor_pin combination  
CREATE INDEX idx_families_phone_editor_pin ON families(phone_number, editor_pin);

-- Optional: Add constraint to ensure phone_number format (Romanian format)
-- ALTER TABLE families 
-- ADD CONSTRAINT chk_phone_format 
-- CHECK (phone_number ~ '^(0)?[67][0-9]{7}$');

-- Update any existing families to have a placeholder phone number (optional)
-- UPDATE families 
-- SET phone_number = '061234567' 
-- WHERE phone_number IS NULL;

-- Make phone_number NOT NULL after updating existing records (optional)
-- ALTER TABLE families 
-- ALTER COLUMN phone_number SET NOT NULL;