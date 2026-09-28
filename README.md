# BabyJourney — album foto de familie

Aplicație Next.js (Pages Router) + Supabase (Postgres + Storage). Fiecare familie are albumul ei, accesat cu PIN (viewer 4 cifre / editor 8 cifre), opțional cu OTP pe email/SMS. Există un panou de admin pentru gestionarea familiilor și a pachetelor (starter / family / legacy — vezi `lib/tiers.js`).

## Stack

- Next.js 14, React 18, Tailwind CSS
- Supabase: toate interogările trec prin rutele API (`pages/api`) cu cheia `service_role`; RLS este activ pe toate tabelele fără politici publice
- Storage: bucket public `album_uploads` (upload direct din browser)
- Email: Resend, SMS: Twilio (opționale)
- Deploy: Vercel (proiectul `album`, deploy automat din `main`)

## Bază de date

Toată schema este în **`supabase-migration.sql`**: tabele, indecși, constrângeri, RLS, bucket-ul de storage și politicile lui. Fișierul este idempotent — merge atât pe un proiect Supabase nou, cât și peste baza existentă.

Supabase → SQL Editor → New query → lipești fișierul → Run.

Separat, din dashboard: Settings → Storage → Upload file size limit → **200 MB** (trebuie să corespundă cu `STORAGE_MAX_UPLOAD_MB` din `lib/tiers.js`). Rulează migrarea după această setare.

## Variabile de mediu

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=            # openssl rand -hex 32
ADMIN_USERNAME=
ADMIN_PASSWORD=

RESEND_API_KEY=            # opțional — OTP pe email
RESEND_FROM_EMAIL=
ADMIN_NOTIFY_EMAIL=
TWILIO_ACCOUNT_SID=        # opțional — OTP pe SMS
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
LOGIN_OTP_BYPASS=true      # dezactivează 2FA la login până sunt configurate Resend/Twilio
```

## Pornire locală

```
npm install
npm run dev
npm run check:setup        # verifică migrarea, bucket-ul și env-urile
```

Apoi: `/admin/login` → creezi o familie → `/login` cu PIN-ul de editor.

## Structură

```
pages/          pagini + rute API (pages/api)
components/     componente UI (layout/, journey/, import/)
contexts/       limbă, temă, toast; traduceri în contexts/translations
hooks/          hook-uri React
lib/            auth, OTP, notificări, pachete, utilitare
public/         imagini statice (ilustrațiile pentru skills)
scripts/        check-setup.js
```

## De făcut

Vezi `ACTIONS-REQUIRED.md` (pași manuali în Supabase/Vercel: email Resend, SMS Twilio, limita de upload) și `NOTIFICATIONS.md` (configurarea notificărilor).
