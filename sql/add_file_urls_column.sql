-- Add file_urls column to photos table for multi-photo support
-- This migration adds support for storing multiple file URLs in a single post

-- Add file_urls column to photos table
-- This field stores JSON array of all photo/video URLs for multi-photo posts
ALTER TABLE photos 
ADD COLUMN file_urls JSONB;

-- Add comment to document the field
COMMENT ON COLUMN photos.file_urls IS 'JSON array of file URLs for multi-photo posts. Single photo posts should not use this field.';

-- Add index for better performance on JSONB queries
CREATE INDEX idx_photos_file_urls ON photos USING GIN (file_urls);

-- Update existing multi-photo posts that store URLs in description
UPDATE photos 
SET file_urls = (
  SELECT jsonb_array_elements_text(
    CASE 
      WHEN description ~ '__MULTI_PHOTO_URLS__:\[.*?\]' 
      THEN (regexp_match(description, '__MULTI_PHOTO_URLS__:(\[.*?\])'))[1]::jsonb
      ELSE NULL
    END
  )
)
WHERE type = 'multi-photo' 
  AND description LIKE '%__MULTI_PHOTO_URLS__%' 
  AND file_urls IS NULL;