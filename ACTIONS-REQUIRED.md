# Actions required (manual, one-time) — as of 2026-08-22

Everything the code can do by itself is done and deployed from `main`. The items
below can only be done by a human with access to the **Supabase dashboard** and
the **Vercel project settings** — the app has no migration runner and no way to
set hosting env vars. Until they're done, the features listed next to each stay
off, and Sergiu keeps reporting them.

**Verify at any time** (from the repo root, uses `.env.local`):

```
npm run check:setup
```

The admin dashboard (`/admin/dashboard`) shows the same checklist as an amber
banner while anything is pending, and hides it once everything is green.

---

## 1. Run the SQL migration  — `sql/sergiu_batch2.sql`

Supabase → **SQL Editor** → **New query** → paste the whole file → **Run**.
Idempotent: safe to run twice. Takes a few seconds.

It adds: `photos.uploaded_at`, `photos.poster_urls`, `photos.file_sizes`,
`skills_progress.child_id`, `life_chapters.description/hashtags`,
`verification_codes.payload` (+ nullable `family_id`, `signup` purpose),
`families.self_registered/email_verified`, the bucket size limit, and the
category remap.

What is blocked until it runs:

| Feature | Without the migration |
|---|---|
| Self-registration (signup) | Returns "Înregistrarea nu este disponibilă momentan" |
| Skills per child | Progress is family-wide; the child switcher shows a notice |
| Journey → Educație events with text/hashtags | Saved without description/tags (user is warned) |
| Real storage accounting | 2 MB/file estimate instead of real sizes |
| Video thumbnails | Captured in the browser at view time (slower) instead of stored |
| Dashboard activity (Ultima postare / 30 zile) | **Works already** — derived from the upload timestamp in the storage path. The column is still the right long-term source. |
| New categories | **Done already** on the live DB (applied 2026-08-22 via `npm run check:setup -- --fix`; the app also self-heals a family on first load). The SQL is a no-op for this. |

If the editor reports an error, paste the message to the developer — do not
run it line by line.

## 2. Raise the project-wide upload limit to 200 MB

Supabase → **Settings → Storage → Upload file size limit** → **200 MB**.
Then run (or re-run) the migration — its `UPDATE storage.buckets` line sets the
bucket to 200 MB, and Supabase clamps a bucket to the project limit, so the
order matters. (`lib/tiers.js` `STORAGE_MAX_UPLOAD_MB = 200` must match.)

Without this, a video the browser can't re-encode (iOS sometimes refuses) and
any audio/PDF over 50 MB fails with "The object exceeded the maximum allowed size".

## 3. Email delivery (Resend) — codes for signup / 2FA / PIN reset

Vercel → Project → **Settings → Environment Variables** (Production):

```
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=BabyJourney <noreply@babyjourney.life>
```

then **Redeploy**. Full walkthrough (domain verification etc.) in `NOTIFICATIONS.md`.
Without it, signup and "forgot PIN by email" now answer "temporarily
unavailable" instead of pretending a code was sent.

## 4. SMS delivery (Twilio) — codes on the phone (Sergiu 29.07: "SMS nu vine")

```
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM_NUMBER=+1…
```

Phone numbers are now stored/normalized as E.164 (`+37369010712`), which is what
Twilio needs. Moldovan numbers may require the Twilio sender to be enabled for
MD — see `NOTIFICATIONS.md`.

## 5. Turn 2FA at login on — ONLY after step 3 is verified

Vercel env: `LOGIN_OTP_BYPASS=false` → Redeploy. The migration (step 1) sets
`require_otp_login = TRUE` for every family that has an email; flipping the
bypass before email works would lock those families out.

## 6. Keep Supabase awake (or upgrade)

Free tier pauses after ~7 days without traffic; the whole app then fails with
"fetch failed". Supabase dashboard → **Restore project**, or move to Pro.
`npm run check:setup` reports "Supabase unreachable" when this is the cause.

---

### Not blocked — already live on `main`
Dashboard activity stats (upload time from the storage path), new categories,
video ≤ 60 s accepted on every plan (60.9 s counts as 60), phone in any format
(`069…` or `+373…`) on login / forgot-PIN / admin, language picker + auto-detect
on login / signup / forgot-PIN, translated server errors, export archive in the
UI language, desktop edit drag keeps the cover photo, deleted photos are removed
from storage.
