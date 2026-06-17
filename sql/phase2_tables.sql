-- ============================================================
-- PHASE 2 — Family-tier feature tables
-- Run in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Idempotent (safe to re-run).
-- All tables are service_role-only (writes flow through API routes), matching
-- the existing RLS posture in schema.sql.
-- ============================================================

-- Child biography / life story (one row per child).
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

-- Health record (one row per child) — vitals shown above the health feed.
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

-- Growth entries (many per child) — height/weight over time.
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

-- Educational progress (one row per child) — narrative + relies on tagged posts.
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

-- Life chapters (many per family/child) — colored date ranges over the timeline.
CREATE TABLE IF NOT EXISTS life_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#7c3aed',
  start_date DATE,
  end_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_life_chapters_family ON life_chapters(family_id);

-- Growth photo comparison (one row per child) — "then vs now" persisted URLs.
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

-- Family tree nodes (many per family) — basic vs extended gated by tier in code.
CREATE TABLE IF NOT EXISTS family_tree_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,                       -- e.g. 'mother','father','grandparent','sibling'
  parent_id UUID REFERENCES family_tree_nodes(id) ON DELETE SET NULL,
  photo_url TEXT,
  birth_year INTEGER,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_tree_nodes_family ON family_tree_nodes(family_id);

-- RLS: service_role full access (server/API only), same pattern as schema.sql.
ALTER TABLE child_biography   ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_compare    ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_chapters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "svc child_biography"   ON child_biography   FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc health_records"    ON health_records    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc growth_entries"    ON growth_entries    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc growth_compare"    ON growth_compare    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc education_notes"   ON education_notes   FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc life_chapters"     ON life_chapters     FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  CREATE POLICY "svc family_tree_nodes" ON family_tree_nodes FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
