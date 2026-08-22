# Deploy notes — Sergiu feedback batch 2 (10.07.2026)

> **Start with [ACTIONS-REQUIRED.md](ACTIONS-REQUIRED.md)** — the short, ordered
> checklist of everything still pending, and `npm run check:setup` to verify.
> This file is the longer background for the batch-2 migration.

Two things must be done by hand or several features silently stay broken.

---

## 1. Run the SQL migration (REQUIRED)

Supabase → SQL Editor → New Query → paste `sql/sergiu_batch2.sql` → Run.
It is idempotent — safe to run twice.

What breaks if you skip it:

| Not run | Symptom |
|---|---|
| `photos.uploaded_at` | Dashboard keeps showing "0 posts in 30 days" and 💀 for active families |
| `photos.poster_urls` | Video thumbnails fall back to slow in-browser frame capture |
| bucket `file_size_limit` | Large videos still rejected with "object exceeded the maximum allowed size" |
| unique indexes on `skills_progress` | Concurrent saves can create duplicate skill rows |
| `skills_progress.child_id` | Skills stay family-wide instead of per-child |
| `life_chapters.description/hashtags` | Journey chapter entries save without their text/tags |
| `verification_codes.payload` + nullable `family_id` | **Self-registration fails** — it needs these |
| category remap | Old categories (Amintiri/Special/Joacă/Învățare) stick around |

The code degrades gracefully rather than crashing when the migration is missing —
each affected query probes for the column and falls back — but the *features*
won't work.

After running it, hard-refresh the app (or hit `/api/admin/clear-categories-cache`)
so the 5-minute client-side category cache picks up the new set.

### ⚠ Also raise the PROJECT-WIDE upload limit

The migration sets the `album_uploads` bucket to **200MB** — but **Supabase clamps a
bucket's limit to the project's global upload limit**, which defaults to 50MB.
If you leave the global at 50MB, the bucket is effectively still 50MB.

Supabase Dashboard → **Settings → Storage → Upload file size limit** → set to at
least **200 MB**, then re-run the migration (or just re-run the `UPDATE
storage.buckets` line).

`STORAGE_MAX_UPLOAD_MB` in `lib/tiers.js` must match this number — the upload
form checks against it *before* uploading, so the user gets a real explanation
instead of Supabase's opaque "The object exceeded the maximum allowed size".

### Categories: what happens to existing posts

The migration remaps posts, it doesn't orphan them:

```
special  -> milestones
play     -> adventures
learning -> education
memories -> everyday
milestones, family, everyday  -> unchanged
```

New default set: **Milestones · Family · Health · Education · Adventures · Everyday Life**.
Families that added their own custom categories keep them.

### Skills: what happens to existing progress

`skills_progress` rows were family-wide. The migration attaches them to the
family's **first child** (by display order). For a one-child family nothing
changes. For Sergiu's 3-child family, the existing progress lands on child #1 and
children #2/#3 start from zero — there was no per-child data to recover, since
the app never captured it.

---

## 2. Configure email (REQUIRED for self-registration + 2FA)

Self-registration (item 14) mails a 4-digit code. Right now `.env.local` has no
`RESEND_*` variables, so `lib/notifications.js` runs in **mock mode**: it logs the
code to the server console and returns success. In production that means
**nobody can complete signup** — they never receive the code.

Set these (see `NOTIFICATIONS.md` for the full walkthrough):

```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=noreply@babyjourney.life
```

In development, with email unconfigured, the signup screen shows the code
on-screen so the flow is testable. That only happens when `NODE_ENV !== 'production'`.

### About `LOGIN_OTP_BYPASS`

`.env.local` still sets `LOGIN_OTP_BYPASS=true`, which skips 2FA at login. It now
**deliberately does not apply to self-registered families** — they only exist
because they received a signup code by email, so email demonstrably works for
them, and they were promised a code on every login.

Two conditions gate 2FA, and **both** must hold:

```js
if (family.require_otp_login && !bypass) { ...demand the code... }
```

Existing, admin-created families had `require_otp_login = FALSE`, so flipping the
bypass alone would have changed nothing for them. The migration now sets it to
`TRUE` for every family **that has an email address** (phone-only families are
left off — enabling it without a working delivery channel locks them out of their
own album).

So the order is: **verify Resend first, then set `LOGIN_OTP_BYPASS=false`.** Doing
it the other way round locks out every family with an email on their next login.

---

## Notes on the video transcoder

Videos are now re-encoded in the browser before upload (`lib/videoCompress.js`),
which is what makes a 126MB clip uploadable and stops storage from tracking raw
camera output.

Two things worth knowing:

- **Encoding is real-time.** A 60-second clip takes ~60 seconds. The upload form
  shows a percentage while it works. This is inherent to the `MediaRecorder`
  approach — the alternative (ffmpeg.wasm) is a ~30MB download and needs
  COOP/COEP headers that would conflict with the current CSP.
- **Output is MP4/H.264** wherever the browser can produce it (Chrome 126+,
  Safari), because WebM/VP9 does not play reliably on iOS — and iOS is where
  these albums get viewed. Firefox falls back to WebM. If a browser can't encode
  at all, the original file uploads unchanged rather than the upload failing.
