# BabyJourney — album foto de familie

Aplicație Next.js (Pages Router) + Supabase (Postgres + Storage). Fiecare familie are albumul ei, accesat cu PIN (viewer 4 cifre / editor 8 cifre), opțional cu un cod de verificare de 4 cifre pe email/SMS, trimis doar după PIN-ul corect. Familiile se pot înregistra și singure (`/signup`), pe email sau prin SMS, la alegere; înregistrarea merge dacă este configurat cel puțin unul dintre Resend și Twilio, iar familia păstrează doar contactul confirmat. Codurile de login și de resetare a PIN-ului ajung pe celălalt contact al familiei (email ↔ telefon) când canalul cerut nu este configurat sau refuză trimiterea, dacă familia are un asemenea contact. Cine încearcă să se înregistreze cu un contact deja folosit nu primește cod, ci mesajul „Ai deja un album BabyJourney” cu trimitere la „Ai uitat PIN-ul?”, iar pagina răspunde la fel ca pentru un contact nou. După 10 PIN-uri greșite într-o oră sau 30 într-o zi pentru aceeași familie, orice încercare cere și un cod de verificare, trimis doar dacă PIN-ul este corect (fără Resend și Twilio răspunsul este „Prea multe încercări”); pauza se ridică la intrarea cu codul, la resetarea PIN-ului sau cu „Deblochează” din panoul de admin. Există un panou de admin pentru gestionarea familiilor și a pachetelor (starter / family / legacy — vezi `lib/tiers.js`).

## Stack

- Next.js 14, React 18, Tailwind CSS
- Supabase: toate interogările trec prin rutele API (`pages/api`) cu cheia `service_role`; RLS este activ pe toate tabelele fără politici publice
- Storage: bucket public `album_uploads` (upload direct din browser; politicile permit doar citirea și urcarea de fișiere noi, nu suprascrierea sau mutarea lor)
- Email: Resend, SMS: Twilio (opționale)
- Deploy: Vercel (proiectul `album`, deploy automat din `main`)

## Bază de date

Toată schema este în **`supabase-migration.sql`**: tabele, indecși, constrângeri, RLS, bucket-ul de storage și politicile lui. Fișierul este idempotent — merge atât pe un proiect Supabase nou, cât și peste baza existentă. Nu există un runner de migrări: când fișierul primește ceva nou, îl rulezi din nou de mână, iar până atunci codul se descurcă fără tabelul sau coloana nouă.

Supabase → SQL Editor → New query → lipești fișierul → Run.

Ultimele modificări:

- tabelul `login_failures` (PIN-urile greșite, numărate pe familie). Fără el, limitele pentru PIN greșit se țin doar în memoria fiecărei instanțe serverless, iar panoul de admin nu poate arăta familiile cu intrarea pusă pe pauză;
- politica `album_uploads_anon_update` nu mai este creată, iar re-rularea fișierului o șterge din producție: până atunci oricine are cheia publică (anon) poate suprascrie sau muta pozele și video-urile oricărei familii.

Fișierul conține și un `UPDATE` opțional care readuce denumirile implicite vechi ale categoriilor la forma canonică. Nu e obligatoriu: aplicația face același lucru la următoarea încărcare a fiecărei familii, iar denumirile alese de familie nu sunt atinse.

Separat, din dashboard: Settings → Storage → Upload file size limit → **200 MB** (trebuie să corespundă cu `STORAGE_MAX_UPLOAD_MB` din `lib/tiers.js`). Rulează migrarea după această setare.

## Variabile de mediu

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=            # openssl rand -hex 32
ADMIN_USERNAME=
ADMIN_PASSWORD=

RESEND_API_KEY=            # opțional — coduri pe email, cereri Legacy
RESEND_FROM_EMAIL=         # opțional, implicit BabyJourney <noreply@babyjourney.life>
ADMIN_NOTIFY_EMAIL=        # adresa care primește cererile Legacy (implicit concierge@babyjourney.life)
TWILIO_ACCOUNT_SID=        # opțional — coduri prin SMS
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SIGNUP_SMS_DAILY_CAP=300   # opțional — câte SMS-uri de înregistrare se trimit pe zi (implicit 300)
SIGNUP_EMAIL_DAILY_CAP=80  # opțional — câte emailuri de înregistrare se trimit pe zi (implicit 80)
LOGIN_OTP_BYPASS=true      # familiile create de admin intră doar cu PIN-ul (nu și cele înregistrate singure); false doar după ce un cod de test a ajuns
```

## Pornire locală

```
npm install
npm run dev
npm run check:setup        # verifică migrarea (coloane și tabele), bucket-ul, env-urile și contactele familiilor (doar citire)
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

Pașii manuali, în ordine, sunt în `ACTIONS-REQUIRED.md`:

1. Rulează din nou `supabase-migration.sql` (creează tabelul `login_failures`, șterge permisiunea publică de a suprascrie sau muta fișiere în `album_uploads`; conține și actualizarea opțională a denumirilor de categorii).
2. Email prin Resend: domeniul verificat, `RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`.
3. SMS prin Twilio: cheile, un expeditor care trimite în Moldova, Geo permissions doar pentru țările acceptate.
4. Verifică dacă fiecare familie are un contact pe canalul conectat (azi „DEMO” nu are email).
5. `LOGIN_OTP_BYPASS=false`, doar după ce un cod de test chiar a ajuns.
6. Opțional: `SIGNUP_EMAIL_DAILY_CAP`, `SIGNUP_SMS_DAILY_CAP`.
7. Ține proiectul Supabase activ (planul gratuit se oprește după ~7 zile fără trafic).
8. Recomandat: `SESSION_SECRET` în Vercel și secretele scoase din git.

Același document explică unde să cauți în Vercel Logs când codurile nu ajung. `NOTIFICATIONS.md` descrie configurarea Resend și Twilio. Panoul `/admin/dashboard` și `npm run check:setup` arată ce a mai rămas.
