-- Add cover_index column to photos table
-- This migration adds support for selecting a cover/thumbnail for multi-photo posts

-- Add cover_index column to photos table
-- This field indicates which photo in the file_urls array should be used as the cover
-- Default is 0 (first photo), NULL means use first photo
ALTER TABLE photos 
ADD COLUMN cover_index INTEGER DEFAULT 0;

-- Add comment to document the field
COMMENT ON COLUMN photos.cover_index IS 'Index of the photo in file_urls array to use as cover/thumbnail. NULL or 0 means first photo.';

-- Update existing multi-photo posts to have cover_index = 0 explicitly
UPDATE photos 
SET cover_index = 0 
WHERE type = 'multi-photo' AND cover_index IS NULL;