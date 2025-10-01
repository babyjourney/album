-- Add profile_picture_url column to families table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE families 
ADD COLUMN profile_picture_url TEXT;

-- Success message
SELECT 'Profile picture column added successfully!' as result;