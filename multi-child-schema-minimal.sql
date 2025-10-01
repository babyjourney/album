-- Multi-Child Album Database Schema - Minimal Version
-- Run this SQL in your Supabase SQL editor
-- This version has no foreign keys or RLS policies for maximum compatibility

-- Create children table
CREATE TABLE children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    profile_picture_url TEXT,
    birth_date DATE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create album_settings table
CREATE TABLE album_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL UNIQUE,
    is_multi_child BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create child_posts junction table
CREATE TABLE child_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL,
    child_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(photo_id, child_id)
);

-- Add basic indexes
CREATE INDEX idx_children_family_id ON children(family_id);
CREATE INDEX idx_album_settings_family_id ON album_settings(family_id);
CREATE INDEX idx_child_posts_photo_id ON child_posts(photo_id);
CREATE INDEX idx_child_posts_child_id ON child_posts(child_id);