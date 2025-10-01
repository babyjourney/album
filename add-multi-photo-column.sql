-- Add file_urls column for multi-photo posts
-- Run this SQL in your Supabase SQL editor

-- Add the file_urls column to store multiple image URLs as JSON
ALTER TABLE photos 
ADD COLUMN file_urls JSONB;

-- Add an index for better performance when querying multi-photo posts
CREATE INDEX idx_photos_file_urls ON photos USING gin(file_urls);

-- Optional: Add a type column to distinguish post types
ALTER TABLE photos 
ADD COLUMN type VARCHAR(50) DEFAULT 'single';

-- Update existing posts to have type 'single'
UPDATE photos SET type = 'single' WHERE type IS NULL;