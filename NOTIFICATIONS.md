# Notificări OTP — Email & SMS

Codurile OTP de 4 cifre se folosesc pentru:
- **Înregistrare** (`/signup`) — familia alege unde primește codul: email sau SMS
- **Forgot PIN** (`/forgot-password`) — resetare PIN viewer/editor
- **2FA login** — când `families.require_otp_login = true` (codul se trimite doar după un PIN corect)

Implementarea trăiește în `lib/notifications.js`. Fără chei configurate,
**codurile se loghează în consolă** (mock mode) — doar în development. În
producție un canal fără chei este considerat indisponibil: înregistrarea pe acel
canal răspunde „indisponibil momentan” și propune celălalt canal, dacă e
configurat; codurile de login și de resetare merg pe celălalt contact al
familiei, dacă există; resetarea PIN-ului răspunde mereu neutru, iar
„indisponibil” apare doar când nu e configurat niciun canal. La login, pentru
familiile care au nevoie de cod, „indisponibil momentan” apare după PIN-ul
corect când niciun contact al familiei nu are un canal configurat sau când
trimiterea eșuează.

---

## 1. Email (Resend) — 2 minute

1. Cont gratuit pe https://resend.com (3,000 emailuri/lună, suficient).
2. **Domains** → adaugă `babyjourney.life` → copiază înregistrările DNS
   (TXT + DKIM) și pune-le pe domeniul tău (Cloudflare/Namecheap).
3. Așteaptă verificare (~5 min). Status devine **Verified**.
4. **API Keys** → **Create API Key** → permisiuni: *Sending access* →
   copiază cheia (`re_...`).
5. Adaugă în `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=BabyJourney <noreply@babyjourney.life>
   ```
6. Restart `npm run dev`. Gata.

**Test:** mergi pe `/forgot-password`, alege Email, introdu emailul unei
familii reale. Codul ajunge în inbox în ~3 secunde.

---

## 2. SMS (Twilio) — 10 minute

Twilio nu are tier gratuit pentru SMS (doar trial credit ~$15). Costuri:
- **România/Moldova:** ~$0.05-0.10/SMS
- Setup unic + număr ~$1/lună

### Pas 1 — Cont și verificare

1. Cont pe https://www.twilio.com/try-twilio (e nevoie de card; primești
   ~$15.50 credit de trial).
2. Confirmă numărul de telefon propriu (Twilio îți trimite SMS).
3. La onboarding:
   - **What do you want to build?** → `SMS`
   - **Which language?** → `Node.js`
   - **What do you want to do first?** → `Send a one-way SMS`

### Pas 2 — Cumpără un număr

1. **Phone Numbers → Manage → Buy a number**.
2. Filtre: țară `United States` (cele mai ieftine ~$1/lună) sau `United
   Kingdom`. Țări mai exotice = mai scumpe.
3. Capabilities: bifează **SMS**.
4. **Buy** (~$1.15/lună). Costul vine din creditul de trial.

> ⚠️ Numere din SUA pot ajunge cu întârziere în Moldova/România (carrier
> filtering). Dacă e nevoie de fiabilitate maximă, alege **United Kingdom**
> sau cere un **Toll-Free** verificat (proces de ~3 zile).

### Pas 3 — Copiază credențialele

1. **Account** (colț stânga sus) → **Account Info**.
2. Notează:
   - **Account SID** (începe cu `AC...`)
   - **Auth Token** (apasă pe ochi → copy)
3. Numărul cumpărat: **Phone Numbers → Manage → Active numbers** →
   copiază numărul în format E.164: `+15555555555`.

### Pas 4 — Adaugă în `.env.local`

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15555555555
```

### Pas 5 — Restart server

```bash
# Ctrl+C în terminalul unde rulează `npm run dev`
npm run dev
```

### Pas 6 — Test

1. Mergi pe `/forgot-password` → tab **Telefon** → numărul real al unei
   familii din DB.
2. SMS ajunge în ~5-15 secunde.
3. Dacă apare eroare în consola serverului `[notifications] Twilio send
   failed`, deschide Twilio Console → **Monitor → Logs → Errors** pentru
   cauza exactă (cel mai des: număr neverificat în trial mode, vezi mai jos).

> 📌 **În trial mode**, Twilio livrează SMS DOAR la numere
> **verificate** în prealabil. Mergi pe **Phone Numbers → Verified Caller
> IDs** și adaugă manual fiecare număr de test. După upgrade din trial
> (adăugare metodă de plată), restricția dispare.

---

## 3. Producție pe Vercel

Aceleași variabile, dar în **Vercel Dashboard → Project → Settings →
Environment Variables**:

| Variable                | Environments           |
|------------------------|------------------------|
| `RESEND_API_KEY`        | Production, Preview    |
| `RESEND_FROM_EMAIL`     | Production, Preview    |
| `TWILIO_ACCOUNT_SID`    | Production, Preview    |
| `TWILIO_AUTH_TOKEN`     | Production, Preview    |
| `TWILIO_FROM_NUMBER`    | Production, Preview    |
| `ADMIN_NOTIFY_EMAIL`    | Production             |
| `LOGIN_OTP_BYPASS`      | Production (`false` după ce un cod de test a ajuns) |
| `SIGNUP_EMAIL_DAILY_CAP` | opțional, implicit 80 |
| `SIGNUP_SMS_DAILY_CAP`  | opțional, implicit 300 |

La Twilio: **Messaging → Settings → Geo permissions** — activează doar țările
familiilor (MD, RO, RU, UA, IT, DE, FR, ES, PT, GB, US/CA); înregistrarea prin SMS
acceptă oricum doar aceste prefixe.

După salvare → **Deployments → Redeploy** (env vars nu se aplică la
deploy-uri vechi).

---

## 4. Verificare rapidă fără să trimiți email/SMS

În consola serverului (`npm run dev`), când o familie cere un cod:

```
[notifications] EMAIL (MOCKED — no RESEND_API_KEY): {
  from: 'BabyJourney <noreply@babyjourney.life>',
  to: 'parinte@email.com',
  subject: 'Codul tău BabyJourney: 4827',
  preview: 'Salut,\n' +
    '\n' +
    'Codul tău de verificare pentru a-ți reseta PIN-ul este: 4827\n' +
    '\n' +
    'Codul este valabil 10 minute. Dacă nu ai inițiat această cerere, ignoră acest mesaj.\n' +
    '\n' +
    '— BabyJourney'
}
```

Vezi codul direct în log → folosește-l pe UI ca să testezi fluxul complet
fără să configurezi nimic. Util pentru testare locală.

---

## 5. Alternative SMS (mai ieftine / fără card)

Dacă vrei să eviți Twilio:

- **MessageBird** — flow similar, are tier free 50 SMS/lună prima lună.
- **Vonage (fost Nexmo)** — bun pentru RO/MD, dashboard mai simplu.
- **Smsto** / **Smsbox** — operatori RO, dar n-au cont demo.
- **WhatsApp Business API** — mesaje gratuite în loc de SMS, dar setup
  mai complex (Twilio îl oferă tot, sau Meta direct).

Toți expun același tip de HTTP API: `POST` cu `{ to, body }` și header de
auth. Înlocuirea în `lib/notifications.js` e ~10 linii: schimbi URL-ul,
header-ul de auth și forma body-ului. Restul fluxului (issue/verify OTP)
rămâne identic.

Dacă alegi unul din astea, zi-mi care și îți schimb `lib/notifications.js`
+ env vars în `.env.local`.

---

## TL;DR

| Ce vrei să faci          | Ce setezi în `.env.local`                          |
|--------------------------|----------------------------------------------------|
| Doar dev/test            | nimic — codurile apar în consola serverului        |
| Email                    | `RESEND_API_KEY` + `RESEND_FROM_EMAIL`             |
| SMS                      | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` |
| Ambele                   | toate cele de mai sus                              |

După orice modificare în `.env.local` → **restart server** obligatoriu.
