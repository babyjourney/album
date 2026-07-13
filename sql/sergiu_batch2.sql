-- ============================================================
-- SERGIU FEEDBACK — BATCH 2 (10.07.2026)
-- Run in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Idempotent (safe to re-run).
-- ============================================================
--
-- Covers:
--   Item 1  — photos.uploaded_at  (real upload time, distinct from the
--             user-chosen memory date which overwrites created_at)
--   Item 2  — photos.poster_urls  (video thumbnail frames)
--   Item 3  — album_uploads bucket file_size_limit (the "object exceeded the
--             maximum allowed size" error) + UPDATE policy for upserts
--   Item 9  — new default category set
--   Item 10 — skills_progress.child_id (skills become per-child)
--   Item 11 — life_chapters.description + hashtags (Chapters merged into Journey)
--   Item 14 — families.email_verified + self-signup support
-- ============================================================

BEGIN;

-- ============================================================
-- ITEM 1 — real upload timestamp
-- ============================================================
-- `created_at` is the MEMORY date: /api/posts/create-multi overwrites it with
-- the user's custom date, so a photo of a 2019 birthday uploaded last week has
-- created_at = 2019. The admin dashboard read that column for "Ultima postare"
-- and "Postări 30 zile", which is why an active family showed as dead.
--
-- uploaded_at is stamped by the DB on insert and is NEVER overwritten by the
-- app, so it always reflects when the row actually landed.
--
-- ⚠ THE COLUMN IS ADDED WITHOUT A DEFAULT, ON PURPOSE.
-- `ADD COLUMN ... DEFAULT NOW()` does not leave existing rows NULL — Postgres
-- evaluates the default and writes it into EVERY existing row. A backfill
-- guarded by `WHERE uploaded_at IS NULL` would then match nothing, and every
-- historical photo would be stamped with the migration's timestamp: for the next
-- 90 days every family would read as 🔥 active, "Postări 30 zile" would count
-- their entire history, and retention would show 100%. That's the same bug as
-- before, just inverted.
--
-- So: add it empty, backfill it, and only then attach the default for new rows.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- Backfill. `updated_at` defaulted to NOW() at insert and is only touched on
-- edit, so it's the closest available proxy for the true upload moment (an
-- edited post reads as its edit time — still real activity, unlike a backdated
-- created_at).
UPDATE photos
   SET uploaded_at = COALESCE(updated_at, created_at)
 WHERE uploaded_at IS NULL;

-- Now new inserts get it automatically.
ALTER TABLE photos ALTER COLUMN uploaded_at SET DEFAULT NOW();

-- No NULLs left, so ordering can't be poisoned by Postgres putting NULLs first
-- on a DESC sort.
ALTER TABLE photos ALTER COLUMN uploaded_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(family_id, uploaded_at DESC);

COMMENT ON COLUMN photos.created_at  IS 'MEMORY date — user-chosen, may be backdated. Drives feed order and the calendar.';
COMMENT ON COLUMN photos.uploaded_at IS 'REAL upload time — set on insert, never overwritten. Drives activity/retention stats.';


-- ============================================================
-- ITEM 7 — real storage accounting
-- ============================================================
-- The admin "Spațiu Utilizat" number was invented: 2MB per file, hardcoded. A
-- 12MB video counted as 2MB. Sergiu's actual concern is "noi vom avea probleme
-- cu stocarea" — and the number he'd use to see that coming was fiction.
--
-- Sizes are now recorded at upload time (the browser knows them exactly), and
-- the dashboard sums them. Rows without sizes fall back to the old estimate, so
-- historical posts still count for something.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_sizes JSONB;
COMMENT ON COLUMN photos.file_sizes IS 'Byte size of each entry in file_urls, index-aligned. Written at upload; NULL for pre-existing rows.';


-- ============================================================
-- ITEM 2 — video poster frames
-- ============================================================
-- A poster JPEG is captured in the browser at upload time and stored alongside
-- the video. Index-aligned with file_urls (null for non-video entries), so
-- poster_urls[i] is the thumbnail for file_urls[i].
ALTER TABLE photos ADD COLUMN IF NOT EXISTS poster_urls JSONB;
COMMENT ON COLUMN photos.poster_urls IS 'Array index-aligned with file_urls: poster image URL for each video entry, null for images.';


-- ============================================================
-- ITEM 3 — storage bucket size limit
-- ============================================================
-- The bucket was created with no explicit file_size_limit, so it inherited the
-- Supabase project default (50MB on Free). A 126MB video was rejected with
-- "The object exceeded the maximum allowed size".
--
-- Videos are transcoded in the browser before upload (lib/videoCompress.js), so
-- a 1-minute clip normally lands at roughly 8-15MB. But when the browser can't
-- re-encode, the ORIGINAL is uploaded — and a 1-minute 4K phone clip is
-- 120-180MB. The requirement is that any video up to a minute uploads, so the
-- ceiling has to clear that.
--
-- MUST match STORAGE_MAX_UPLOAD_MB in lib/tiers.js (the upload form checks
-- against it client-side, to give a real error instead of Supabase's opaque one).
--
-- ⚠ Supabase ALSO enforces a project-wide global upload limit, and a bucket
-- cannot exceed it. Default is 50MB. Raise it first:
--     Dashboard -> Settings -> Storage -> Upload file size limit -> 200 MB
-- otherwise this UPDATE is silently clamped and large uploads still fail.
UPDATE storage.buckets
   SET file_size_limit = 209715200  -- 200 MB
 WHERE id = 'album_uploads';

-- Child/family avatars are written to a deterministic path and re-uploaded when
-- changed, which needs UPDATE (upsert). There was no public UPDATE policy, so
-- replacing an avatar failed with an RLS violation.
DROP POLICY IF EXISTS "album_uploads_anon_update" ON storage.objects;
CREATE POLICY "album_uploads_anon_update"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'album_uploads')
  WITH CHECK (bucket_id = 'album_uploads');


-- ============================================================
-- ITEM 10 — skills become per-child
-- ============================================================
ALTER TABLE skills_progress ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE skills           ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_skills_progress_child ON skills_progress(family_id, child_id, skill_id);

-- Existing rows were family-wide. Attach them to the family's first child so no
-- progress is lost; families with a single child see no change at all.
-- (Families with NO children keep child_id IS NULL — the API reads those rows
-- back with `child_id IS NULL`, and /api/children/create adopts them when the
-- family's first child is added.)
UPDATE skills_progress sp
   SET child_id = (
     SELECT c.id FROM children c
      WHERE c.family_id = sp.family_id
      ORDER BY c.display_order, c.created_at
      LIMIT 1
   )
 WHERE sp.child_id IS NULL
   AND EXISTS (SELECT 1 FROM children c WHERE c.family_id = sp.family_id);

-- The API does a read-then-write upsert, which without a unique constraint lets
-- two concurrent saves of the same skill both insert. Deduplicate (keeping the
-- most recently updated row), then make it impossible.
DELETE FROM skills_progress a
 USING skills_progress b
 WHERE a.family_id = b.family_id
   AND a.skill_id  = b.skill_id
   AND a.child_id IS NOT DISTINCT FROM b.child_id   -- NULL = NULL, for family-wide rows
   AND (a.last_updated, a.id) < (b.last_updated, b.id);

-- Two partial indexes rather than one: a plain UNIQUE over a nullable column
-- would not constrain the family-wide (child_id IS NULL) rows at all, since in
-- SQL every NULL is distinct from every other NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_progress_child
  ON skills_progress (family_id, child_id, skill_id) WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_progress_family
  ON skills_progress (family_id, skill_id) WHERE child_id IS NULL;


-- ============================================================
-- ITEM 11 — Chapters merged into Journey/Education
-- ============================================================
-- Chapters gain a multi-line description and their own hashtags so an entry can
-- pull in posts by tag, not only by date range.
ALTER TABLE life_chapters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE life_chapters ADD COLUMN IF NOT EXISTS hashtags TEXT[];


-- ============================================================
-- ITEM 14 — self-registration
-- ============================================================
ALTER TABLE families ADD COLUMN IF NOT EXISTS email_verified   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS self_registered  BOOLEAN NOT NULL DEFAULT FALSE;

-- Email is the login identity for self-registered families, so it must be
-- unique. Partial index: legacy families with a NULL email are unaffected.
-- If this fails, you have pre-existing duplicate emails — dedupe them first.
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_email_unique
  ON families (lower(email)) WHERE email IS NOT NULL;

-- Reuse the existing verification_codes table (lib/otpStore.js) rather than
-- standing up a second OTP system. Two changes are needed for signup:
--
--  1. family_id must be nullable — at signup the family does not exist yet.
--  2. purpose must accept 'signup'.
--
-- ...plus a payload column to hold the pending registration (name/phone/PINs)
-- until the code is verified, so we never create a family for an unverified
-- email address.
ALTER TABLE verification_codes ALTER COLUMN family_id DROP NOT NULL;

ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_purpose_check;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_purpose_check
  CHECK (purpose IN ('reset_pin', 'login_2fa', 'signup'));

ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS payload JSONB;

COMMENT ON COLUMN verification_codes.family_id IS 'NULL for purpose=signup — the family is only created once the code is verified.';
COMMENT ON COLUMN verification_codes.payload   IS 'Pending signup details (name, phone, PINs), applied on successful verification.';

-- Signup codes are looked up by email alone (no family_id yet).
CREATE INDEX IF NOT EXISTS idx_verification_codes_signup
  ON verification_codes (contact_value, purpose, used, created_at DESC);

-- 2FA is meant to apply to LOGIN as well as registration ("2 factory
-- authentification ... pentru autentificare/inregistrare"), not just to
-- self-registered families. Existing, admin-created families have
-- require_otp_login = FALSE, so they'd get no second factor at all — and the
-- pin-login gate is `if (require_otp_login && !bypass)`, meaning flipping
-- LOGIN_OTP_BYPASS to false would change nothing for them.
--
-- Turn it on for every family that actually has an email to receive the code at.
-- Phone-only families are left alone: enabling it for them would need Twilio,
-- and turning it on without a working channel locks them out of their album.
--
-- This is still gated by LOGIN_OTP_BYPASS, so nothing changes until you set that
-- to false — do it only once Resend is verified.
UPDATE families
   SET require_otp_login = TRUE
 WHERE email IS NOT NULL
   AND email <> ''
   AND require_otp_login = FALSE;


-- ============================================================
-- ITEM 9 — new default categories
-- ============================================================
-- Old set (memories/milestones/everyday/special/family/play/learning) clashed
-- with the hashtag system. New set:
--   milestones, family, health, education, adventures, everyday
--
-- Remap posts first so nothing is orphaned, THEN rewrite the per-family rows.
UPDATE photos SET category = 'milestones' WHERE category = 'special';
UPDATE photos SET category = 'adventures' WHERE category = 'play';
UPDATE photos SET category = 'education'  WHERE category = 'learning';
UPDATE photos SET category = 'everyday'   WHERE category = 'memories';
-- 'milestones', 'family' and 'everyday' keep their ids.

-- Rewrite the category list for every family that still has the old defaults.
-- Families that added custom categories keep them: we only delete the retired
-- ids and insert the missing new ones.
DELETE FROM family_categories WHERE category_value IN ('memories', 'special', 'play', 'learning');

INSERT INTO family_categories (family_id, category_value, category_label, category_emoji)
SELECT f.id, v.value, v.label, v.emoji
  FROM families f
 CROSS JOIN (VALUES
   ('milestones', 'Milestones',    '🎯'),
   ('family',     'Family',        '👨‍👩‍👧‍👦'),
   ('health',     'Health',        '🏥'),
   ('education',  'Education',     '📚'),
   ('adventures', 'Adventures',    '🌍'),
   ('everyday',   'Everyday Life', '☀️')
 ) AS v(value, label, emoji)
 ON CONFLICT (family_id, category_value) DO NOTHING;

COMMIT;

-- ============================================================
-- DONE
-- ============================================================
-- After running this, hit /api/admin/clear-categories-cache (or just hard-
-- refresh) so the 5-minute client-side category cache picks up the new set.
