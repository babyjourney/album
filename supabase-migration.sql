BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;


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
  package TEXT NOT NULL DEFAULT 'starter',
  require_otp_login BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  self_registered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE families ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE families ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE families ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;
ALTER TABLE families ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS package TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE families ADD COLUMN IF NOT EXISTS require_otp_login BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS self_registered BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE families DROP CONSTRAINT IF EXISTS families_package_check;
UPDATE families SET package = 'starter' WHERE package IS NULL OR package IN ('free', '');
UPDATE families SET package = 'family' WHERE package = 'premium';
ALTER TABLE families ALTER COLUMN package SET DEFAULT 'starter';
ALTER TABLE families ADD CONSTRAINT families_package_check
  CHECK (package IN ('starter', 'family', 'legacy'));

CREATE INDEX IF NOT EXISTS idx_families_last_accessed ON families(last_accessed);
CREATE INDEX IF NOT EXISTS idx_families_email ON families(email);
CREATE INDEX IF NOT EXISTS idx_families_is_suspended ON families(is_suspended);
CREATE INDEX IF NOT EXISTS idx_families_phone_number ON families(phone_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_email_unique
  ON families (lower(email)) WHERE email IS NOT NULL;


CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);


CREATE TABLE IF NOT EXISTS album_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  is_multi_child BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_album_settings_family_id ON album_settings(family_id);


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


CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_url TEXT,
  file_urls JSONB,
  file_sizes JSONB,
  poster_urls JSONB,
  file_type TEXT,
  type TEXT DEFAULT 'image',
  hashtags TEXT[],
  category TEXT,
  cover_index INTEGER DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  quality TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_urls JSONB;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_sizes JSONB;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS poster_urls JSONB;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS cover_index INTEGER DEFAULT 0;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

UPDATE photos
   SET uploaded_at = to_timestamp(
         (regexp_match(
            COALESCE(file_urls->>0, file_url),
            '/(\d{13})-\d+(?:-[a-z]+)?-[a-z0-9]+\.[A-Za-z0-9]+'
         ))[1]::bigint / 1000.0
       )
 WHERE uploaded_at IS NULL
   AND COALESCE(file_urls->>0, file_url) ~ '/\d{13}-\d+(-[a-z]+)?-[a-z0-9]+\.[A-Za-z0-9]+';
UPDATE photos SET uploaded_at = COALESCE(updated_at, created_at, NOW()) WHERE uploaded_at IS NULL;
ALTER TABLE photos ALTER COLUMN uploaded_at SET DEFAULT NOW();
ALTER TABLE photos ALTER COLUMN uploaded_at SET NOT NULL;

ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_category_check;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_quality_check;
ALTER TABLE photos ADD CONSTRAINT photos_quality_check
  CHECK (quality IS NULL OR quality IN ('sd', 'hd'));

CREATE INDEX IF NOT EXISTS idx_photos_family_id ON photos(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(family_id, category);
CREATE INDEX IF NOT EXISTS idx_photos_family_private ON photos(family_id, is_private);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(family_id, uploaded_at DESC);


CREATE TABLE IF NOT EXISTS child_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_child_posts_photo_id ON child_posts(photo_id);
CREATE INDEX IF NOT EXISTS idx_child_posts_child_id ON child_posts(child_id);


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
CREATE INDEX IF NOT EXISTS idx_family_categories_value ON family_categories(family_id, category_value);


CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_skills_family_id ON skills(family_id);


CREATE TABLE IF NOT EXISTS skills_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  skill_id VARCHAR(200),
  skill_name VARCHAR(200),
  skill_category VARCHAR(200),
  progress INTEGER DEFAULT 0,
  notes TEXT,
  updated_by UUID,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE skills_progress ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;

DELETE FROM skills_progress a
 USING skills_progress b
 WHERE a.family_id = b.family_id
   AND a.skill_id = b.skill_id
   AND a.child_id IS NOT DISTINCT FROM b.child_id
   AND (a.last_updated, a.id) < (b.last_updated, b.id);

CREATE INDEX IF NOT EXISTS idx_skills_progress_family_id ON skills_progress(family_id);
CREATE INDEX IF NOT EXISTS idx_skills_progress_skill_id ON skills_progress(family_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_skills_progress_child ON skills_progress(family_id, child_id, skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_progress_child
  ON skills_progress (family_id, child_id, skill_id) WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_progress_family
  ON skills_progress (family_id, skill_id) WHERE child_id IS NULL;


CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  contact_kind TEXT NOT NULL CHECK (contact_kind IN ('email', 'phone')),
  contact_value TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  role TEXT,
  payload JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE verification_codes ALTER COLUMN family_id DROP NOT NULL;
ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_purpose_check;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_purpose_check
  CHECK (purpose IN ('reset_pin', 'login_2fa', 'signup'));

CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup
  ON verification_codes (family_id, contact_value, purpose, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires
  ON verification_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_signup
  ON verification_codes (contact_value, purpose, used, created_at DESC);


CREATE TABLE IF NOT EXISTS child_biography (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  body TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_child_biography_family ON child_biography(family_id);


CREATE TABLE IF NOT EXISTS health_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  blood_type TEXT,
  allergies TEXT,
  pediatrician TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_health_records_family ON health_records(family_id);


CREATE TABLE IF NOT EXISTS growth_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_growth_entries_family ON growth_entries(family_id);
CREATE INDEX IF NOT EXISTS idx_growth_entries_child ON growth_entries(child_id, measured_on);


CREATE TABLE IF NOT EXISTS education_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  body TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_education_notes_family ON education_notes(family_id);


CREATE TABLE IF NOT EXISTS life_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  hashtags TEXT[],
  color TEXT DEFAULT '#7c3aed',
  start_date DATE,
  end_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE life_chapters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE life_chapters ADD COLUMN IF NOT EXISTS hashtags TEXT[];
CREATE INDEX IF NOT EXISTS idx_life_chapters_family ON life_chapters(family_id);


CREATE TABLE IF NOT EXISTS growth_compare (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  then_url TEXT,
  now_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_growth_compare_family ON growth_compare(family_id);


CREATE TABLE IF NOT EXISTS family_tree_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  parent_id UUID REFERENCES family_tree_nodes(id) ON DELETE SET NULL,
  photo_url TEXT,
  birth_year INTEGER,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_tree_nodes_family ON family_tree_nodes(family_id);


ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_biography ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_compare ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_nodes ENABLE ROW LEVEL SECURITY;

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
         'verification_codes','child_biography','health_records',
         'growth_entries','education_notes','life_chapters',
         'growth_compare','family_tree_nodes'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END
$$;


INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('album_uploads', 'album_uploads', true, 209715200)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 209715200;

DROP POLICY IF EXISTS "album_uploads_public_read" ON storage.objects;
DROP POLICY IF EXISTS "album_uploads_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "album_uploads_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "Public read album_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload album_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone update album_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone delete album_uploads" ON storage.objects;

CREATE POLICY "album_uploads_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'album_uploads');

CREATE POLICY "album_uploads_anon_insert"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'album_uploads');

CREATE POLICY "album_uploads_anon_update"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'album_uploads')
  WITH CHECK (bucket_id = 'album_uploads');


COMMIT;
