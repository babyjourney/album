-- Multi-Child Album Database Schema
-- Run this SQL in your Supabase SQL editor

-- Create children table
CREATE TABLE IF NOT EXISTS children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    profile_picture_url TEXT,
    birth_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create album_settings table to control multi-child functionality per album
CREATE TABLE IF NOT EXISTS album_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL UNIQUE,
    is_multi_child BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create child_posts junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS child_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL,
    child_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(photo_id, child_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_children_family_id ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_children_display_order ON children(family_id, display_order);
CREATE INDEX IF NOT EXISTS idx_album_settings_family_id ON album_settings(family_id);
CREATE INDEX IF NOT EXISTS idx_child_posts_photo_id ON child_posts(photo_id);
CREATE INDEX IF NOT EXISTS idx_child_posts_child_id ON child_posts(child_id);

-- Add foreign key constraints
ALTER TABLE children 
    ADD CONSTRAINT fk_children_family_id 
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE album_settings 
    ADD CONSTRAINT fk_album_settings_family_id 
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE child_posts 
    ADD CONSTRAINT fk_child_posts_photo_id 
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;

ALTER TABLE child_posts 
    ADD CONSTRAINT fk_child_posts_child_id 
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

-- Add RLS policies for PIN-based auth
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_posts ENABLE ROW LEVEL SECURITY;

-- Note: Since this app uses PIN-based auth instead of Supabase Auth,
-- RLS policies should be very permissive or disabled.
-- The security is handled at the application level through PIN authentication.

-- Permissive policies that allow access (security handled by PIN auth in app)
CREATE POLICY "Allow all access to children" ON children FOR ALL USING (true);
CREATE POLICY "Allow all access to album_settings" ON album_settings FOR ALL USING (true);
CREATE POLICY "Allow all access to child_posts" ON child_posts FOR ALL USING (true);

-- Insert default album settings for existing families
INSERT INTO album_settings (family_id, is_multi_child)
SELECT id, FALSE FROM families
WHERE id NOT IN (SELECT family_id FROM album_settings);