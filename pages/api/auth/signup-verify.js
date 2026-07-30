// Self-registration, step 2 (item 14).
//
// Input:  { email, code }
// Output: { ok: true, family: { name }, viewerPin, editorPin }
//
// The code proves the person controls the mailbox, so this is the first point
// at which it's safe to create the family. Everything needed was stashed in the
// OTP row's payload by signup-request.js.
//
// The new family gets require_otp_login = true: they registered with a verified
// email, so 2FA on login is exactly what item 14 asks for.

import { supabase } from '../../../lib/supabaseClient'
import { verifyOtp } from '../../../lib/otpStore'
import { sendEmail } from '../../../lib/notifications'
import rateLimiter from '../../../lib/rateLimiter'
import { ensureFamilyCategories } from '../../../lib/categoryMigration'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { email, code } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanCode = String(code || '').trim()

  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({ error: 'Email și cod sunt obligatorii', errorKey: 'signupErrEmailCodeRequired' })
  }

  // Brute-forcing a 4-digit code is only 10k guesses, so throttle hard here.
  // (verifyOtp also burns the code after 5 wrong attempts.)
  const clientId = rateLimiter.getClientId(req, cleanEmail)
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    return res.status(429).json({
      error: `Prea multe încercări. Încearcă din nou în ${rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)}.`,
    })
  }

  try {
    const result = await verifyOtp({
      familyId: null,          // signup codes aren't tied to a family yet
      contactValue: cleanEmail,
      purpose: 'signup',
      code: cleanCode,
    })

    if (!result.ok) {
      rateLimiter.recordFailedAttempt(clientId, cleanCode, cleanEmail)
      // ONE message, whatever went wrong.
      //
      // signup-request deliberately stays silent for an already-registered email
      // so it can't be used to test whether an address has an account. Passing
      // verifyOtp's own error through here would undo that: an already-registered
      // address has no OTP row ("codul nu există"), while a fresh one does and
      // reports "cod greșit, mai ai N încercări" — two distinct replies, and the
      // enumeration is back.
      return res.status(401).json({ error: 'Codul este greșit sau a expirat. Cere unul nou.', errorKey: 'signupErrCodeWrong' })
    }

    rateLimiter.recordSuccessfulAttempt(clientId)

    const payload = result.otpRow?.payload
    if (!payload || !payload.email) {
      // The row verified but carries no payload — that means the `payload`
      // column is missing, i.e. sql/sergiu_batch2.sql hasn't been run.
      console.error('signup-verify: OTP row has no payload — run sql/sergiu_batch2.sql')
      return res.status(500).json({ error: 'Înregistrarea nu este configurată complet. Contactează suportul.', errorKey: 'signupErrNotConfigured' })
    }

    // Re-check for a race: two tabs could both verify before either inserted.
    // Fail CLOSED — maybeSingle() reports data:null on error as well as on "no
    // rows", so swallowing the error here would let the insert proceed.
    // (The unique index on lower(email) from sql/sergiu_batch2.sql is the real
    // backstop; this is the friendly path.)
    const { data: existing, error: lookupError } = await supabase
      .from('families')
      .select('id')
      .ilike('email', payload.email)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      console.error('signup-verify: duplicate check failed:', lookupError)
      return res.status(500).json({ error: 'Crearea contului a eșuat. Încearcă din nou.', errorKey: 'signupErrCreateFailed' })
    }

    if (existing) {
      return res.status(409).json({ error: 'Există deja un cont cu acest email. Folosește „Am uitat PIN-ul".', errorKey: 'signupErrEmailExists' })
    }

    const { data: family, error: insertError } = await supabase
      .from('families')
      .insert({
        name: payload.familyName,
        email: payload.email,
        phone_number: payload.phoneNumber,
        viewer_pin: payload.viewerPin,
        editor_pin: payload.editorPin,
        package: 'starter',
        email_verified: true,
        self_registered: true,
        require_otp_login: true,   // item 14: 2FA on every login
      })
      .select('id, name, email')
      .single()

    if (insertError) {
      // A unique-violation here means someone else won the race.
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'Există deja un cont cu acest email.', errorKey: 'signupErrEmailExists' })
      }
      throw insertError
    }

    // Seed the default categories so the album isn't empty on first login.
    try {
      await ensureFamilyCategories(family.id)
    } catch (catErr) {
      console.warn('signup: category seed failed (non-fatal):', catErr)
    }

    // Mail the PINs — they're the only credentials, and a PIN shown once on a
    // screen and then lost is a support ticket.
    try {
      await sendEmail({
        to: payload.email,
        subject: 'Contul tău BabyJourney este gata',
        text: [
          `Salut,`,
          ``,
          `Albumul „${payload.familyName}" a fost creat.`,
          ``,
          `PIN vizualizare (4 cifre): ${payload.viewerPin}`,
          `  — pentru bunici, familie: pot vedea albumul, dar nu îl pot modifica.`,
          ``,
          `PIN editare (8 cifre): ${payload.editorPin}`,
          `  — pentru părinți: pot adăuga și șterge postări.`,
          ``,
          `Autentifică-te cu emailul acesta și PIN-ul. La fiecare login îți trimitem un cod de 4 cifre pe email.`,
          ``,
          `Păstrează acest mesaj.`,
        ].join('\n'),
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="font-size: 20px; margin: 0 0 16px;">Albumul „${payload.familyName}" a fost creat</h2>
            <p style="color: #555; margin: 0 0 20px;">Acestea sunt PIN-urile tale. Păstrează acest email.</p>
            <p style="margin: 0 0 8px; color:#555;">PIN vizualizare (bunici, familie):</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #7c3aed; margin: 0 0 20px;">${payload.viewerPin}</p>
            <p style="margin: 0 0 8px; color:#555;">PIN editare (părinți):</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #7c3aed; margin: 0 0 20px;">${payload.editorPin}</p>
            <p style="color: #888; font-size: 13px; margin: 0;">La fiecare autentificare îți trimitem un cod de 4 cifre pe email.</p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.warn('signup: PIN email failed (non-fatal, PINs are shown in the UI):', mailErr)
    }

    return res.status(200).json({
      ok: true,
      family: { name: family.name, email: family.email },
      viewerPin: payload.viewerPin,
      editorPin: payload.editorPin,
    })
  } catch (error) {
    console.error('signup-verify error:', error)
    return res.status(500).json({ error: 'Crearea contului a eșuat. Încearcă din nou.', errorKey: 'signupErrCreateFailed' })
  }
}
