# Actions required (manual, one-time) — as of 2026-10-28

Everything the code can do by itself is in the code (production deploys from
`main` on push). The steps below need a person with access to the **Supabase
dashboard**, the **Vercel project settings**, **Resend** and **Twilio**. The app
cannot set hosting env vars or run SQL by itself.

**Production today** (Supabase and families: read-only check on 2026-10-28;
Vercel: last checked 2026-09-18):

- The Vercel project `album` had **no environment variables**. Production runs
  on the committed `.env.local`, which holds the Supabase keys, the admin login
  and `LOGIN_OTP_BYPASS=true`, and nothing else: **no `RESEND_API_KEY`, no
  `TWILIO_*`**.
- Supabase: all columns from `supabase-migration.sql`, the new category set and
  the 200 MB limit of the `album_uploads` bucket are in place. The new table
  **`login_failures` is missing** (step 1). The public permission to overwrite
  files in `album_uploads` came with the previous version of the migration, so
  it is most likely still active (it cannot be checked read-only from outside;
  step 1 shows a query that checks it).
- 5 families, all created by the admin. 4 have "2FA required", and all 4 have both
  an email and a phone. **"DEMO"** has a phone but **no email** (2FA off).

What families see once this code is deployed with these settings: all 5
families log in with the PIN only; `/signup` answers "Înregistrarea nu este
disponibilă momentan"; forgot-PIN answers "Trimiterea codului nu este disponibilă
momentan"; Legacy concierge requests are not delivered (the family is told to try
again later).

**Verify at any time** (from the repo root; reads production through `.env.local`,
read-only unless you add `--fix`):

```
npm run check:setup
```

---

## 1. Re-run `supabase-migration.sql` (2 minutes, do this first)

Supabase → **SQL Editor** → New query → paste the whole `supabase-migration.sql`
→ **Run**. The file is idempotent: on the existing database it only adds what is
missing, so it is safe to run again at any time.

New since the last run:

- **Removes the public permission to overwrite or move files** in the
  `album_uploads` bucket (the storage policy `album_uploads_anon_update`). Until
  now anyone holding the public anon key, which every page ships, could overwrite
  or move any family's photos and videos without logging in, and could replace a
  video after the server had checked that it is at most 60 seconds long. After the
  re-run the bucket keeps only public read and the upload of new files. The app
  always uploads under a new file name and never overwrites, so families notice
  nothing. An earlier version of this file created that policy, and it stays
  active in production until you re-run the current file.
- **`login_failures` table** (indexes, RLS on, no public policies): a shared count
  of wrong PINs per family, with a `device_hash` column (a keyed hash of the IP
  address and browser) for the per-device pause. If the table already exists
  from an earlier run, the re-run only adds that column. Until the table exists,
  the wrong-PIN limits (10 per hour and 30 per day per family) live only in the
  memory of each serverless instance, so every cold start or parallel instance
  starts from zero. Each instance logs once:
  `[pin-login] table login_failures is missing (run supabase-migration.sql); PIN failures are limited in memory only`.
  Login keeps working either way. This matters most right now, because with
  `LOGIN_OTP_BYPASS=true` the PIN is the only thing protecting the admin-created
  albums. The table also lets the dashboard list the families whose login is
  paused after wrong PINs, with a "Deblochează" button (see "The notice on
  `/admin/dashboard`" below).
- **Optional category-label clean-up**: one `UPDATE family_categories … SET
  category_label = …` turns old seeded names of the default categories
  (`Etape importante`, `Zilnic`, `Familie`, translated names, …) back into the
  canonical stored labels. The app already does the same for each family on its
  next load (and `POST /api/admin/migrate-categories` does all families at
  once), and the site shows the names translated either way. Names a family chose
  itself are never touched.

Afterwards the dashboard's technical item disappears and `npm run check:setup`
shows ✅ for "Tables from supabase-migration.sql" plus a "PIN lockouts" line.
To confirm that the overwrite permission is gone, run this in the SQL Editor:

```
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects';
```

For `album_uploads` it should list only `album_uploads_public_read` (SELECT) and
`album_uploads_anon_insert` (INSERT), with no UPDATE or DELETE row.

## 2. Email (Resend): codes, signup PINs, Legacy requests

**Findings 2026-09-18:** the domain's DNS already has Resend records (`send` and
`rsend` CNAMEs → `*.forge.rmta.net`), so a Resend account was connected at some
point, but no `RESEND_API_KEY` ever reached production. That is why "nu-mi vine
emailul cu codul".

To recover the Resend account, sign in at resend.com with the Google accounts or
email addresses you normally use. The right account shows **babyjourney.life**
under *Domains*. If none of them has it, create a new account, add the domain
again, replace the DNS records with the new values Resend shows, and wait for
**Verified**. Resend rejects every send from an unverified domain, so codes do not
arrive. The app cannot detect this from its settings; the Vercel logs show
`Resend send failed` (see "When codes don't arrive" below).

Create an API key, then set (Vercel → Project `album` → **Settings → Environment
Variables**, Production):

```
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=BabyJourney <noreply@babyjourney.life>
ADMIN_NOTIFY_EMAIL=you@your-inbox.com
```

then **Redeploy**. Only `RESEND_API_KEY` is required. Without `RESEND_FROM_EMAIL`
the app sends from `BabyJourney <noreply@babyjourney.life>` anyway.
`ADMIN_NOTIFY_EMAIL` is the inbox that receives the **Legacy concierge requests**
(printed poster, yearbook, done-for-you setup, upload help, memory organization,
data migration, from `/legacy` and `/import`). Without it they go to
`concierge@babyjourney.life`, which then has to be a mailbox someone reads.
Requests are not stored in the database, so email is the only way they reach you.
Domain verification walkthrough: `NOTIFICATIONS.md` (codes are 4 digits now).

The Resend free tier allows 100 emails per day across all mail. Signup codes by
email are capped at `SIGNUP_EMAIL_DAILY_CAP` (default 80) per day so that signup
cannot use up the whole quota (step 6).

What starts working: signup by email, forgot-PIN codes by email, login codes by
email (self-registered families now; admin-created ones after step 5), Legacy
requests. A family without an email ("DEMO") still gets no PIN-reset code until
SMS works or an email is added (step 4).

**Test:** `/forgot-password` → Email → the address of a family you control → the
code should arrive within seconds. You don't have to finish the reset; the code
expires after 10 minutes.

## 3. SMS (Twilio): codes on the phone (Sergiu 29.07: "SMS nu vine")

```
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM_NUMBER=+…
```

then **Redeploy**. The sender must be able to deliver to Moldova (+373); see
`NOTIFICATIONS.md` for the choice of number and for trial mode, which only
delivers to verified numbers. Phone numbers are stored in E.164 (`+37369010712`),
which is what Twilio needs.

**Geo permissions:** Twilio Console → Messaging → Settings → **Geo permissions** →
enable only the countries in the app's SMS-signup allow-list, or fewer (only those
where you have families): Moldova, Romania, Russia, Ukraine, Italy, Germany,
France, Spain, Portugal, United Kingdom, United States/Canada. Disable the rest.
The signup page refuses SMS to numbers from other countries (it suggests email
instead). Forgot-PIN and login codes, however, go to whatever number the family
has on file, so for those Geo permissions are the only country filter: if a family
lives elsewhere, enable that country too. The app counts every `+7` number as
Russia, so Geo permissions also decide whether Kazakh `+7` numbers get SMS.
Together with the daily cap (`SIGNUP_SMS_DAILY_CAP`, step 6) this protects you
from SMS pumping (bots requesting codes to expensive numbers that you pay for).

**Test:** `/forgot-password` → Phone → the number of a family you control.

## 4. Check that every family has a contact on the configured channel

A code can only reach a family through a contact it has on file **and** a
connected provider: an email needs Resend, a phone needs Twilio. Today only
**"DEMO"** lacks a contact: it has no email. Its 2FA is off, so its login is
never affected. However, with only Resend connected, DEMO cannot reset a
forgotten PIN. Forgot-PIN still answers "if an account exists, a code was sent",
but nothing arrives. With Twilio connected, all 5 families can be reached.

Self-registered families have **exactly one contact**: the email or the phone
they signed up with (the email route asks only for an email, the SMS route only
for a phone). They always need a code at login, so if their channel stops working
they can neither log in nor reset their PIN, until that provider works again or a
second contact is added.

To add a contact: the admin page has no edit form for an existing family's
contacts yet. Use Supabase → **Table Editor** → `families` → `email` or
`phone_number` (E.164, e.g. `+37369…`), or `POST /api/admin/families/update`
with `{ id, email }` / `{ id, phoneNumber }` from an admin session.

The admin dashboard and `npm run check:setup` list the families without an
email or phone, and every family that currently cannot receive a login code.

## 5. Turn 2FA at login on, only after a test code has arrived

Vercel env: `LOGIN_OTP_BYPASS=false` → Redeploy. A Vercel variable overrides the
`true` in the committed `.env.local`.

Do this only when:

- a test code from step 2 or 3 actually arrived, and
- the dashboard's "Verificarea în doi pași" item (technical details) shows no
  family that would be locked out ("Atenție: cu LOGIN_OTP_BYPASS=false n-ar mai
  putea intra …"). The same list is in `npm run check:setup`.

What changes: the 4 admin-created families with "2FA required" then get a code at
every login, after a correct PIN (see "Login" below). Self-registered families
always got a code; the bypass never applies to them. New families created from
"Gestionare Familii" have 2FA off, so the bypass does not affect them.

If it is flipped without a working channel, those 4 families get "Trimiterea
codului nu este disponibilă momentan" right after a correct PIN and cannot log
in. The dashboard then shows "Unele familii nu pot intra în album" with their
names. This happens even if the notice was hidden before, because a lockout that
starts counts as a new item. Fix: `LOGIN_OTP_BYPASS=true` → Redeploy.

## 6. Optional: daily caps for signup codes

```
SIGNUP_EMAIL_DAILY_CAP=80
SIGNUP_SMS_DAILY_CAP=300
```

These are the defaults when the variables are not set. Each cap counts the signup
messages sent on that channel in the last 24 hours, across all visitors: codes,
and the "you already have an album" notices sent to registered contacts. Each
request reserves its place before sending and checks the count again, so a burst
of parallel requests cannot go over the cap. Beyond the cap, signup on that
channel is refused. The page suggests the other channel only
if it is configured and under its own cap; otherwise it shows "Înregistrarea nu
este disponibilă momentan". If the count cannot be read from the database, that
channel is refused as well. Login and forgot-PIN codes are not counted here: they
have per-family limits (see below).

## 7. Keep Supabase awake (or upgrade)

The free tier pauses after about 7 days without traffic, and the whole app then
fails with "fetch failed". Supabase dashboard → **Restore project**, or move to
Pro. `npm run check:setup` reports "Supabase unreachable" when this is the cause.

## 8. Recommended: move the secrets out of git

The committed `.env.local` contains the Supabase service-role key and the admin
password. Login and admin tokens are signed with `SESSION_SECRET`. That variable
is not set, so the app derives the signing key from the public anon key and the
admin password. Anyone who can read the repository could therefore sign valid
tokens. Set `SESSION_SECRET` in Vercel (`openssl rand -hex 32`). Everyone is then
logged out once, and codes issued in the previous 10 minutes stop working. Then
rotate the admin password and the service-role key, put them in Vercel env vars,
and remove `.env.local` from the repository.

---

## When codes don't arrive: where to look

Vercel → Project `album` → **Logs** (filter by the text below). Codes are 4
digits, valid 10 minutes, 5 tries per code.

| Log line | Meaning |
|---|---|
| `[notifications] Resend send failed: 403 …` | Resend rejected the email (domain not verified, wrong key, sandbox sender) |
| `[notifications] Twilio send failed: …` | Twilio rejected the SMS (Geo permissions, trial mode, sender); details in Twilio Console → Monitor → Logs → Errors |
| `[notifications] EMAIL (MOCKED — no RESEND_API_KEY)` / `SMS (MOCKED — Twilio not configured)` | the provider is not configured in this deployment |
| `[otpStore] <purpose> <email\|phone> delivery failed` | one channel failed; the family's other contact is tried next if its provider is configured |
| `[pin-login] login code not sent (failed)` / `(unconfigured)` | correct PIN, but the code could not be sent; the user saw "Trimiterea codului nu este disponibilă momentan" |
| `[pin-login] login code not sent (capped)` | per-family login-code limit; the user saw "Ai cerut prea multe coduri…" (the last code still works) |
| `[pin-login] this family needs a login code but none of its contacts has a configured channel` | that family cannot log in (step 4 or 5) |
| `[forgot-pin] reset code not sent (unconfigured\|failed\|capped)` | forgot-PIN answered neutrally, but nothing was sent |
| `[otpStore] reset_pin: N codes issued for one family in the last hour` / `… in the last 24 hours, not sending another` | per-family PIN-reset limit |
| `[forgot-pin] neither RESEND nor TWILIO is configured` | forgot-PIN answered "Trimiterea codului nu este disponibilă momentan" |
| `[signup] … delivery is not configured` / `daily signup … cap reached` / `could not count today's signup … codes` / `send FAILED` | signup refused on that channel |
| `[signup] N signup codes\|messages for one email\|phone in the last 24 hours …, not sending another` | per-contact signup limit; the page showed the code step, nothing was sent |
| `[signup] email\|phone already registered, sending a "use Forgot PIN" notice instead of a code` | signup for an existing contact; that contact got "Ai deja un album BabyJourney" (by design) |
| `[signup] daily signup … cap reached … — refusing … signup after reserving` | a parallel burst reached the daily cap; this request was refused before sending |
| `[pin-login] wrong-PIN limit reached for this account; every attempt now needs a login code` | the family's wrong-PIN limit is reached; see "Login" below and the dashboard |
| `[pin-login] login code during the wrong-PIN limit not sent (…)` | correct PIN during the limit, but the code could not be sent (no configured channel reaches the family, or a send failure) |
| `[pin-login] one device reached 5\|10 wrong PINs for one account, pausing it` | per-device pause (10 minutes / 24 hours) |
| `[pin-login] column login_failures.device_hash is missing …` | step 1 not done yet (the per-device pause is kept in memory only) |
| `[pin-login] table login_failures is missing …` | step 1 not done yet |
| `[admin] cleared the wrong-PIN count of family <id> (store: on)` | the admin pressed "Deblochează" on the dashboard (`store: off` means the table was not available, nothing was cleared) |
| `[video-duration] <file> is not in storage; refusing the client value` | a post was created for a video that is not in storage; it was refused |
| `[concierge] request "…" from family … was NOT delivered` | a Legacy request was lost (it is not stored anywhere) |

## How login, signup and forgot-PIN behave now

**Signup (`/signup`)**: family name plus one contact. The email route asks only
for an email, the SMS route only for a phone. A 4-digit code goes to that contact.
After verification the family is created with **only that contact** ("2FA
required", self-registered), and the PINs are shown on screen and sent to the
same contact.

- Neither provider configured: "Înregistrarea nu este disponibilă momentan…" on
  both routes, with no button to switch.
- Chosen channel not configured, over its daily cap, or its send failed: the page
  suggests the other channel only when that one is configured and under its cap;
  otherwise the same "unavailable" message. SMS is accepted only for numbers from
  the allow-list countries (step 3); for others the same rule applies.
- A contact that is already registered gets no code. Instead, the same channel
  delivers "Ai deja un album BabyJourney" (the SMS: "exista deja un album pentru
  acest numar…"), with a pointer to "Ai uitat PIN-ul?". The page answers exactly
  as for a new contact: same status, same text, same time. If that message cannot
  be sent, the answer is the same "unavailable" one a new contact would get. So
  signup never reveals who is registered, and an existing family learns what to
  do. The code step therefore says "Dacă … nu are încă un cont, ți-am trimis un
  cod de 4 cifre. Ai deja cont? Folosește „Ai uitat PIN-ul?”."
- One email or phone gets at most 5 signup messages per hour and 10 per day
  (codes and "you already have an album" notices together); beyond that the page
  still shows the code step and nothing is sent. Rapid repeats from one IP
  address or for one contact first get "Prea multe încercări. Încearcă din nou
  peste …".
- The daily caps (step 6) and the per-contact limits are **reserved before
  sending, then verified**: each request first records its message, counts again,
  and only sends if it is still within the cap. A burst of parallel requests
  therefore cannot send more than the cap.
- The "send code" step always takes about 1 second, registered or not.

**Login (`/login`)**: phone or email plus PIN.

- Admin-created families while `LOGIN_OTP_BYPASS=true`, and any family without
  "2FA required": the PIN is enough.
- Otherwise (self-registered families, or "2FA required" with the bypass off) the
  code is sent only **after a correct PIN**. The code step names the real
  destination in masked form, e.g. "Codul a fost trimis pe email la
  pa•••@gmail.com". This can be the family's other contact if the typed channel
  is not configured or rejected the send. "Retrimite codul" checks the PIN again
  and issues a new code, which cancels the previous one.
- Correct PIN but the code cannot be sent (no configured channel reaches the
  family, or Resend/Twilio rejects it): "Trimiterea codului nu este disponibilă
  momentan" right away.
- Login codes per family: 10 per hour and 20 per day. Beyond that the code step
  stays open with "Ai cerut prea multe coduri. Folosește ultimul cod primit sau
  încearcă din nou mai târziu.", and the last code still works.
- Wrong PINs per family, counting every spelling of the phone and the email
  together: 10 per hour and 30 per day. Shared across all servers only after
  step 1. What happens when the limit is reached:
  - **Resend or Twilio configured** (any of them): every attempt, right or wrong
    PIN, gets the same answer after about 1.5 seconds: "Prea multe încercări
    greșite pentru acest cont. Dacă PIN-ul este corect, ți-am trimis un cod de
    verificare…". Only the correct PIN actually sends a login code, even to
    families without "2FA required" and with `LOGIN_OTP_BYPASS=true`. Someone
    guessing learns nothing and cannot get in without the code, while the real
    family types the code and is in. A successful login with the code clears the
    family's wrong-PIN count. If no configured channel reaches any of the
    family's contacts, no code can arrive: that family waits until the pause
    ends, or the admin presses "Deblochează" on the dashboard.
  - **Neither configured (production today)**: even the correct PIN gets "Prea
    multe încercări. Încearcă din nou peste …" until the oldest failure leaves the
    window, or until the admin presses "Deblochează" (after step 1).
  - A successful PIN reset (forgot-PIN) also clears the count.
  - Unknown contacts get exactly the same limits and answers, so login never
    reveals whether a contact is registered.
- Per device (IP address plus browser) and account: 5 wrong PINs give a
  10-minute pause, and 10 wrong within 24 hours give a 24-hour pause for that
  device. A successful login from that device clears its earlier wrong PINs.
  After step 1 this is kept in the database (`login_failures.device_hash`) and
  is lifted by "Deblochează" too; before, it lives in each server's memory.
- The local `0…` spelling of a phone number is recognised only for Moldovan
  (+373) numbers.

**Forgot PIN (`/forgot-password`)**

- Neither provider configured: "Trimiterea codului nu este disponibilă momentan".
- Otherwise the answer is always the neutral "if an account exists, a code was
  sent". The answer takes about 1 second and names the typed contact. If the
  typed channel is not configured, it says the code went to the other contact on
  file. Nothing is sent when the contact is unknown or suspended, when no
  configured channel reaches the family, when the provider rejects the send, or
  when the family reached 5 reset codes per hour / 10 per day. Use the logs above
  to tell these cases apart. More than 5 requests per hour for one contact, or 10
  from one IP address, get "Prea multe încercări. Încearcă din nou peste …".
- Entering the code and the new PIN also takes about 1 second, whether the
  contact is registered or not, so the timing does not reveal who is a customer.
  A successful reset clears the family's wrong-PIN count, so a family paused
  after wrong PINs can log in at once with the new PIN.

**Uploads**: photos JPG/JPEG (including `.jfif`, `.jpe`, `.pjpeg`, `.pjp`, stored as
`.jpg`), PNG, GIF, WEBP, HEIC/HEIF and JXL (HEIC/HEIF/JXL are converted to JPEG);
videos MP4, MOV, M4V and WEBM, at most 60 seconds on every plan (60.9 s counts as
60). The server re-measures each video from storage. A video whose file is not in
storage (for example a post created before its file was uploaded) is refused with
"Durata video-ului nu a putut fi verificată. Reîncarcă pagina și încearcă din
nou." and the log says `[video-duration] <file> is not in storage; refusing the client value`.
If the file is there but cannot be measured (slow storage, unreadable file), the
server uses the browser's value and logs
`[video-duration] could not measure <file> (<reason>); using the client value`.
Deleting a post never removes a file that is still used elsewhere in the family
(profile pictures, other posts, growth or family-tree photos). If that check
fails, the files are kept and the log says `kept files in storage`.

## The notice on `/admin/dashboard`

While something is pending, the dashboard shows a calm, plain-Romanian notice. It
is collapsed to a headline plus one line, with "Ce înseamnă?" for the
consequences for families and "Detalii tehnice (pentru dezvoltator)" for the exact
env vars, steps and affected families. The consequences are worked out from both
providers together and from the families' actual contacts.

- Today it reads "Notificări prin email și SMS — încă neconectate".
- The missing `login_failures` table is listed as a technical item for the
  developer ("O actualizare tehnică a bazei de date"). It never changes the
  headline.
- If any family cannot log in (for example the bypass is turned off with no
  working channel), the headline becomes "Unele familii nu pot intra în album",
  the first line names how many, the item lists them, and the icon turns amber.
- **Logins paused after wrong PINs** (only once the `login_failures` table
  exists): every family with 10 wrong PINs in the last hour or 30 in the last 24
  hours is listed directly in the notice, without opening it, with the time the
  pause ends and whether it can still get in. It can when Resend or Twilio
  reaches one of its contacts: the correct PIN then gets a login code. Otherwise
  it cannot log in until the pause ends. **"Deblochează"** next to the name
  deletes that family's wrong-PIN records
  (`POST /api/admin/families/clear-login-failures`), so the family can log in at
  once with the correct PIN; the log says
  `[admin] cleared the wrong-PIN count of family <id> (store: on)`. A successful PIN
  reset does the same. If the family did not mistype the PIN itself, someone is
  trying to guess it: check Vercel Logs for `pin-login`, and if needed give the
  family new PINs with `POST /api/admin/families/update` (`viewerPin`,
  `editorPin`; the admin page has no form for this yet). Unless a family cannot
  log in at all, the headline becomes "Intrarea unei familii în album este pusă
  pe pauză" (or "… unor familii …"). The icon turns amber only when a paused
  family cannot receive a code. Suspended families are not listed.
- "Ascunde" hides the notice in that browser. It comes back only when something
  **new** appears: a new item, another family that cannot receive a login code,
  or a new pause (another family, or the same family paused again later). Items
  and families that get resolved are forgotten, so if one of them returns later
  it counts as new. The notice disappears once everything is green.

## Already in the code, no action needed

Activity stats, the new categories (translated with the site language in
search, filters, forms, cards and the post view), the 60-second video cap on
every plan (client and server), the upload whitelist, the full country/dial-code
list, phone numbers in any format (`069…` or `+373…`) on login / forgot-PIN /
admin, signup by email or SMS with 4-digit codes, the language picker with
auto-detect on login / signup / forgot-PIN, translated server errors, the export
archive in the UI language (the admin's export is in Romanian), desktop edit drag
keeping the cover photo, storage clean-up on delete (shared files are kept),
Legacy concierge requests that say honestly when they could not be sent, signup
answering registered contacts with "you already have an album", a code instead of
a hard block after too many wrong PINs, and the dashboard's list of paused logins
with "Deblochează" (visible after step 1).
