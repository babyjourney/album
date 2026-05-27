-- ============================================================
-- ALBUMSERGIU — COMPLETE MIGRATION SCHEMA
-- ============================================================
-- Rulează acest fișier UNA SINGURĂ DATĂ pe un proiect Supabase nou:
--   Dashboard → SQL Editor → New Query → paste → Run
--
-- Idempotent: îl poți rerula fără să strici nimic.
--
-- Acest fișier conține:
--   1. Toate tabelele (1:1 cu producția actuală)
--   2. Toate indexele
--   3. RLS STRICT — anon/authenticated nu primesc nimic;
--      service_role bypass automat (folosit de API server-side)
--      → fix pentru vulnerabilitatea #12 (USING(true) leak prin anon key)
--   4. Bucket-ul de storage `album_uploads` + politici (read public, upload anon)
--
-- Vezi MIGRATION.md pentru pașii completi (env vars, lib/supabaseClient.js etc.)
-- ============================================================

BEGIN;

-- ============================================================
-- 1) EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2) TABLES
-- ============================================================

-- families
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  viewer_pin TEXT,
  editor_pin TEXT,
  profile_picture_url TEXT,
  phone_number VARCHAR(50),
  email VARCHAR(255),
  last_accessed TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT FALSE,
  package TEXT NOT NULL DEFAULT 'free',
  require_otp_login BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- post-launch additions (idempotent for re-runs)
ALTER TABLE families ADD COLUMN IF NOT EXISTS package TEXT NOT NULL DEFAULT 'free';
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_package_check;
ALTER TABLE families ADD CONSTRAINT families_package_check
  CHECK (package IN ('free', 'premium'));

-- Task #3: 2-factor album access (email OTP or SMS OTP before PIN).
-- Default FALSE keeps existing logins unchanged; admin flips to TRUE per family.
ALTER TABLE families ADD COLUMN IF NOT EXISTS require_otp_login BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN families.viewer_pin  IS '4-digit PIN for read-only access. KNOWN ISSUE: stored plaintext — see MIGRATION.md follow-ups.';
COMMENT ON COLUMN families.editor_pin  IS '8-digit PIN for editor access. KNOWN ISSUE: stored plaintext — see MIGRATION.md follow-ups.';
COMMENT ON COLUMN families.last_accessed     IS 'Timestamp of last album access (any role).';
COMMENT ON COLUMN families.email             IS 'Family contact email — used for OTP login + PIN reset.';
COMMENT ON COLUMN families.package           IS 'Tier: free (SD, 60s max video) | premium (HD, 60s max video).';
COMMENT ON COLUMN families.require_otp_login IS 'When TRUE, the family must enter an email/SMS OTP in addition to PIN.';

CREATE INDEX IF NOT EXISTS idx_families_last_accessed ON families(last_accessed);
CREATE INDEX IF NOT EXISTS idx_families_email          ON families(email);
CREATE INDEX IF NOT EXISTS idx_families_is_suspended   ON families(is_suspended);


-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);


-- album_settings
CREATE TABLE IF NOT EXISTS album_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  is_multi_child BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_album_settings_family_id ON album_settings(family_id);


-- children
CREATE TABLE IF NOT EXISTS children (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  profile_picture_url TEXT,
  birth_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_children_family_id ON children(family_id);


-- photos (posts — image / video / text)
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_url TEXT,
  file_urls JSONB,
  file_type TEXT,
  type TEXT DEFAULT 'image',
  hashtags TEXT[],
  category TEXT,
  cover_index INTEGER DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  quality TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- post-launch additions (idempotent)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
-- Task #15: tier-based quality stamp. 'sd' = free, 'hd' = premium. Nullable
-- for legacy rows from before the column existed.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_quality_check;
ALTER TABLE photos ADD CONSTRAINT photos_quality_check
  CHECK (quality IS NULL OR quality IN ('sd', 'hd'));

COMMENT ON COLUMN photos.file_url    IS 'URL of uploaded file. NULL for text posts.';
COMMENT ON COLUMN photos.type        IS 'Post type: image | video | text.';
COMMENT ON COLUMN photos.file_urls   IS 'JSON array of file URLs for multi-photo posts.';
COMMENT ON COLUMN photos.cover_index IS 'Cover/thumbnail index inside file_urls (0 = first).';
COMMENT ON COLUMN photos.is_private  IS 'TRUE = hidden from viewer-role; editors and admins still see it.';
COMMENT ON COLUMN photos.quality     IS 'Quality tier at upload time: sd (Free) or hd (Premium).';

CREATE INDEX IF NOT EXISTS idx_photos_family_id      ON photos(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at     ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_category       ON photos(family_id, category);
CREATE INDEX IF NOT EXISTS idx_photos_family_private ON photos(family_id, is_private);


-- child_posts (junction: photos <-> children)
CREATE TABLE IF NOT EXISTS child_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_child_posts_photo_id ON child_posts(photo_id);
CREATE INDEX IF NOT EXISTS idx_child_posts_child_id ON child_posts(child_id);


-- family_categories
CREATE TABLE IF NOT EXISTS family_categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_value VARCHAR(100) NOT NULL,
  category_label VARCHAR(200) NOT NULL,
  category_emoji VARCHAR(10) DEFAULT '📝',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, category_value)
);
CREATE INDEX IF NOT EXISTS idx_family_categories_family_id ON family_categories(family_id);
CREATE INDEX IF NOT EXISTS idx_family_categories_value     ON family_categories(family_id, category_value);


-- skills
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_family_id ON skills(family_id);


-- skills_progress
CREATE TABLE IF NOT EXISTS skills_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID,
  skill_id VARCHAR(200),
  skill_name VARCHAR(200),
  skill_category VARCHAR(200),
  progress INTEGER DEFAULT 0,
  notes TEXT,
  updated_by UUID,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_progress_family_id ON skills_progress(family_id);
CREATE INDEX IF NOT EXISTS idx_skills_progress_skill_id  ON skills_progress(family_id, skill_id);


-- verification_codes — OTPs used for PIN reset (Task #2) and 2FA login
-- (Task #3). Codes are stored as HMAC-SHA256 hashes (see lib/otpStore.js);
-- never store the plaintext code.
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  contact_kind TEXT NOT NULL CHECK (contact_kind IN ('email', 'phone')),
  contact_value TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('reset_pin', 'login_2fa')),
  role TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN verification_codes.code_hash     IS 'HMAC-SHA256 of the 6-digit code with SESSION_SECRET. Never log/store plaintext.';
COMMENT ON COLUMN verification_codes.purpose       IS 'reset_pin = PIN reset flow · login_2fa = 2-factor login.';
COMMENT ON COLUMN verification_codes.role          IS 'When purpose=reset_pin, the role whose PIN is being reset (viewer | editor).';

CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup
  ON verification_codes (family_id, contact_value, purpose, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires
  ON verification_codes (expires_at);


-- ============================================================
-- 3) ROW LEVEL SECURITY — STRICT (fix vuln #12)
-- ============================================================
-- Strategy:
--   • RLS enabled on every table
--   • ZERO permissive policies for anon/authenticated → they get nothing
--   • service_role bypasses RLS by default (Postgres built-in)
--   • Therefore: ALL access must go through the API (server-side, with
--     SUPABASE_SERVICE_ROLE_KEY). See lib/supabaseClient.js — server detects
--     window=undefined and uses service_role automatically.
-- ============================================================

ALTER TABLE families            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE children            ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes  ENABLE ROW LEVEL SECURITY;

-- Drop ANY legacy permissive policy on the public-schema tables (cleans up
-- migrations from old schema.sql versions that had USING(true) FOR ALL).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'families','profiles','album_settings','children','photos',
        'child_posts','family_categories','skills','skills_progress',
        'verification_codes'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END
$$;

-- (no permissive policies created — service_role bypass is enough)


-- ============================================================
-- 4) STORAGE BUCKET — album_uploads
-- ============================================================
-- The bucket is created here so you don't have to do it from the dashboard.
-- It's public-read so <img src=...> works in the browser.
--
-- KNOWN LIMITATION (documented in MIGRATION.md follow-ups):
-- Anyone with the anon key can INSERT into this bucket at any path. The
-- existing API enforces family scoping AFTER the upload (the URL it stores
-- in `photos` is forced to req.auth.familyId). A full fix requires moving
-- to pre-signed upload URLs generated by the API. Tracked as a roadmap item.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('album_uploads', 'album_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clean up legacy / default policies on this bucket
DROP POLICY IF EXISTS "album_uploads_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "album_uploads_anon_insert"  ON storage.objects;
DROP POLICY IF EXISTS "Public read album_uploads"  ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload album_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone update album_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone delete album_uploads" ON storage.objects;

-- Public read of objects inside the bucket
CREATE POLICY "album_uploads_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'album_uploads');

-- Anon insert (browser upload). API still validates familyId server-side.
CREATE POLICY "album_uploads_anon_insert"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'album_uploads');

-- Note: UPDATE/DELETE on objects intentionally have NO public policy.
-- The API performs deletes using service_role, which bypasses RLS.


COMMIT;

-- ============================================================
-- DONE
-- ============================================================
-- Next steps (see MIGRATION.md):
--   1. Set SUPABASE_SERVICE_ROLE_KEY in .env.local (REQUIRED — without it,
--      every API query returns empty results because RLS denies anon).
--   2. Set a long random SESSION_SECRET in .env.local.
--   3. npm install (no new deps) && npm run dev
--   4. Open /admin-setup → set admin password → login → create first family.
-- ============================================================
