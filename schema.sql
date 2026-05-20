-- ============================================================
-- SCHEMA COMPLET - AlbumSergiu
-- Rulează acest fișier în noul proiect Supabase:
-- Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- ============================================================
-- 1. TABELA: families
-- ============================================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN families.viewer_pin IS '4-digit PIN for read-only access. Should be hashed in production.';
COMMENT ON COLUMN families.editor_pin IS '8-digit PIN for full edit access. Should be hashed in production.';
COMMENT ON COLUMN families.last_accessed IS 'Timestamp of when the family album was last accessed by any user';
COMMENT ON COLUMN families.email IS 'Email address for family contact and notifications';

CREATE INDEX IF NOT EXISTS idx_families_last_accessed ON families(last_accessed);
CREATE INDEX IF NOT EXISTS idx_families_email ON families(email);
CREATE INDEX IF NOT EXISTS idx_families_is_suspended ON families(is_suspended);


-- ============================================================
-- 2. TABELA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);


-- ============================================================
-- 3. TABELA: album_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS album_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  is_multi_child BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_album_settings_family_id ON album_settings(family_id);


-- ============================================================
-- 4. TABELA: children
-- ============================================================
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


-- ============================================================
-- 5. TABELA: photos (posts - imagini, video, text)
-- ============================================================
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
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN photos.file_url IS 'URL of uploaded file. NULL for text posts';
COMMENT ON COLUMN photos.type IS 'Type of post: image, video, or text';
COMMENT ON COLUMN photos.file_urls IS 'JSON array of file URLs for multi-photo posts';
COMMENT ON COLUMN photos.cover_index IS 'Index of the photo in file_urls array to use as cover/thumbnail. NULL or 0 means first photo.';

CREATE INDEX IF NOT EXISTS idx_photos_family_id ON photos(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(family_id, category);


-- ============================================================
-- 6. TABELA: child_posts (junction: photos <-> children)
-- ============================================================
CREATE TABLE IF NOT EXISTS child_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_posts_photo_id ON child_posts(photo_id);
CREATE INDEX IF NOT EXISTS idx_child_posts_child_id ON child_posts(child_id);


-- ============================================================
-- 7. TABELA: family_categories
-- ============================================================
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


-- ============================================================
-- 8. TABELA: skills
-- ============================================================
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


-- ============================================================
-- 9. TABELA: skills_progress
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_skills_progress_skill_id ON skills_progress(family_id, skill_id);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_progress ENABLE ROW LEVEL SECURITY;

-- Permite acces complet prin service_role (folosit de server/API)
CREATE POLICY "Service role full access - families" ON families FOR ALL USING (true);
CREATE POLICY "Service role full access - profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Service role full access - album_settings" ON album_settings FOR ALL USING (true);
CREATE POLICY "Service role full access - children" ON children FOR ALL USING (true);
CREATE POLICY "Service role full access - photos" ON photos FOR ALL USING (true);
CREATE POLICY "Service role full access - child_posts" ON child_posts FOR ALL USING (true);
CREATE POLICY "Service role full access - family_categories" ON family_categories FOR ALL USING (true);
CREATE POLICY "Service role full access - skills" ON skills FOR ALL USING (true);
CREATE POLICY "Service role full access - skills_progress" ON skills_progress FOR ALL USING (true);


-- ============================================================
-- CATEGORII IMPLICITE (opțional - inserează categorii default)
-- ============================================================
-- Dezcommentează și rulează DUPĂ ce ai creat prima familie:
--
-- INSERT INTO family_categories (family_id, category_value, category_label, category_emoji)
-- VALUES
--   ('<FAMILY_ID>', 'memories', 'Amintiri', '💭'),
--   ('<FAMILY_ID>', 'milestones', 'Etape importante', '🎯'),
--   ('<FAMILY_ID>', 'everyday', 'Zilnic', '☀️'),
--   ('<FAMILY_ID>', 'special', 'Special', '✨'),
--   ('<FAMILY_ID>', 'family', 'Familie', '👨‍👩‍👧‍👦'),
--   ('<FAMILY_ID>', 'play', 'Joacă', '🎮'),
--   ('<FAMILY_ID>', 'learning', 'Învățare', '📚');

-- constientizeaza ca munca creativa si daruirea il vor stoarce, dar nu renunta: "ticaloasa asta de sculptura zice e o amanta nesatioasa iti soarbe si maduva din oase"
-- "sa lucram cot la cot" "solidari in aceiasi munca" "aceiasi mana si aceiasi gandire"

-- =========================
-- PRIVATE CONTENT (post-launch migration)
-- =========================
ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_photos_family_private ON photos(family_id, is_private);

-- =========================
-- PACKAGES / TIERS (post-launch migration)
-- =========================
ALTER TABLE families ADD COLUMN IF NOT EXISTS package TEXT NOT NULL DEFAULT 'free';
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_package_check;
ALTER TABLE families ADD CONSTRAINT families_package_check
  CHECK (package IN ('free', 'premium'));
