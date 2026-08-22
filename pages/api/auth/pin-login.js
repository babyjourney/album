import { supabase } from '../../../lib/supabaseClient'
import { isValidPhone, normalizePhone, phoneLookupVariants } from '../../../lib/phone'
import rateLimiter from '../../../lib/rateLimiter'
import { issueFamilyToken } from '../../../lib/authMiddleware'
import { verifyOtp } from '../../../lib/otpStore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  // `email` and `otpCode` are optional. They're only required when the
  // family has `require_otp_login = true` (Task #3 — 2FA login).
  const { pin, phoneNumber, email, otpCode } = req.body

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu', errorKey: 'authErrPinRequired' })
  }

  // Either phone OR email must be provided. Phone remains the primary path
  // for backward compatibility; email is allowed for 2FA-enabled families.
  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Numărul de telefon sau email-ul este obligatoriu', errorKey: 'authErrContactRequired' })
  }

  // Remove any spaces and validate formats first
  const cleanPin = pin.toString().replace(/\s/g, '')
  const cleanPhone = phoneNumber ? phoneNumber.toString().replace(/\s/g, '') : ''
  const cleanEmail = email ? String(email).trim().toLowerCase() : ''

  // Get client identifier for rate limiting (include phone or email for better tracking)
  const clientId = rateLimiter.getClientId(req, cleanPhone || cleanEmail)
  
  // Check if client is currently blocked
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    const timeRemaining = rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)
    const level = blockStatus.level === 1 ? '10 minute' : '24 hour'
    
    return res.status(429).json({ 
      error: `Prea multe încercări. ${level} cooldown activ.`,
      errorKey: 'errRateLimited',
      rateLimited: true,
      level: blockStatus.level,
      timeRemaining: timeRemaining,
      blockedUntil: blockStatus.blockedUntil
    })
  }
  
  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre', errorKey: 'authErrPinFormat' })
  }

  // Phone in any spelling — national "069010712" or international
  // "+37369010712" (lib/phone.js). Only enforced when the caller supplied a
  // phone (email-only login is allowed for 2FA-enabled families).
  if (cleanPhone && !isValidPhone(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid (ex. 069010712 sau +37369010712)', errorKey: 'authErrPhoneInvalid' })
  }

  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
    }
  }

  try {
    let family = null
    let role = null

    // PIN + contact (phone OR email) must both match an existing family.
    // We try the role implied by PIN length first.
    const pinColumn = cleanPin.length === 4 ? 'viewer_pin' : 'editor_pin'
    const roleForPin = cleanPin.length === 4 ? 'viewer' : 'editor'

    // self_registered arrives with sql/sergiu_batch2.sql — select it defensively
    // so login still works if the migration hasn't been run.
    const buildQuery = (cols) => {
      let q = supabase.from('families').select(cols).eq(pinColumn, cleanPin)
      // Stored numbers may be national ("069…") or E.164 ("+373…") — match both.
      if (cleanPhone) q = q.in('phone_number', phoneLookupVariants(cleanPhone)).limit(1)
      else if (cleanEmail) q = q.ilike('email', cleanEmail)
      return q
    }

    const FULL_COLS = 'id, name, phone_number, email, viewer_pin, editor_pin, is_suspended, package, require_otp_login, self_registered'
    const LEGACY_COLS = 'id, name, phone_number, email, viewer_pin, editor_pin, is_suspended, package, require_otp_login'

    let { data, error } = await buildQuery(FULL_COLS).maybeSingle()
    if (error && /self_registered/i.test(error.message || '')) {
      ;({ data, error } = await buildQuery(LEGACY_COLS).maybeSingle())
    }

    if (!error && data) {
      family = data
      role = roleForPin
    }

    // If no family found with this PIN
    if (!family) {
      // Record failed attempt for rate limiting (include phone number for analysis)
      const attemptResult = rateLimiter.recordFailedAttempt(clientId, cleanPin, cleanPhone)
      
      let errorMessage = 'Numărul de telefon sau PIN-ul sunt incorecte'
      if (attemptResult.blocked) {
        const timeRemaining = rateLimiter.formatTimeRemaining(attemptResult.timeRemaining)
        const level = attemptResult.level === 1 ? '10 minute' : '24 hour'
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. ${level} cooldown activat din cauza prea multor încercări.`
      } else if (attemptResult.attemptsRemaining <= 2) {
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. Mai aveți ${attemptResult.attemptsRemaining} încercări înainte de cooldown.`
      }
      
      // Get security analysis for logging
      const securityAnalysis = rateLimiter.getSecurityAnalysis(clientId)
      if (securityAnalysis?.isLikelyBruteForce) {
        console.warn(`🚨 Possible brute force attack detected from ${clientId.substring(0, 20)}... - ${securityAnalysis.uniquePins} unique PINs, ${securityAnalysis.uniquePhoneNumbers} unique phones tried`)
      }
      
      return res.status(401).json({ 
        error: errorMessage,
        errorKey: 'authErrWrongCredentials',
        rateLimited: attemptResult.blocked || false,
        level: attemptResult.level || null,
        attemptsRemaining: attemptResult.attemptsRemaining || 0
      })
    }

    // Check if album is suspended
    if (family.is_suspended) {
      return res.status(403).json({
        error: 'Acest album a fost suspendat. Contactați administratorul pentru mai multe informații.',
        errorKey: 'authErrSuspended',
        suspended: true
      })
    }

    // 2FA gate (Task #3): if this family requires OTP login, we need to
    // verify the OTP code BEFORE issuing the session token. The OTP was
    // requested earlier via /api/auth/request-otp.
    //
    // LOGIN_OTP_BYPASS is the temporary escape hatch from when Resend/Twilio
    // weren't configured. It deliberately does NOT apply to self-registered
    // families (item 14): they exist only because they received a signup code by
    // email, so delivery demonstrably works for them, and they were promised a
    // code on every login. Must stay in lockstep with request-otp.js.
    const otpBypass = process.env.LOGIN_OTP_BYPASS === 'true' && !family.self_registered
    if (family.require_otp_login && !otpBypass) {
      if (!otpCode) {
        return res.status(401).json({
          error: 'Cod de verificare necesar.',
          errorKey: 'authErrOtpRequired',
          code: 'OTP_REQUIRED',
          otpRequired: true,
          deliveryHint: cleanEmail ? 'email' : 'phone',
        })
      }
      // Must equal what request-otp stored: lowercase email, or E.164 phone.
      const otpContactValue = cleanEmail || normalizePhone(cleanPhone)
      const otpResult = await verifyOtp({
        familyId: family.id,
        contactValue: otpContactValue,
        purpose: 'login_2fa',
        code: otpCode,
      })
      if (!otpResult.ok) {
        return res.status(401).json({
          error: otpResult.error,
          errorKey: 'authErrOtpInvalid',
          code: 'OTP_INVALID',
          otpRequired: true,
        })
      }
    }

    // Success! Clear any rate limiting for this client
    rateLimiter.recordSuccessfulAttempt(clientId)

    // 5a: stamp last_accessed on EVERY successful login (both 4-digit viewer
    // and 8-digit editor PINs). Best-effort — never block login if it fails.
    try {
      await supabase
        .from('families')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', family.id)
    } catch (accessErr) {
      console.error('last_accessed update failed:', accessErr)
    }

    // Issue a signed session token. Client stores it opaquely and sends it
    // as a Bearer token; the signature prevents tampering with familyId/role.
    const token = issueFamilyToken({
      familyId: family.id,
      familyName: family.name,
      role
    })

    // Default to 'free' for any legacy families where the column hasn't been
    // backfilled (the migration adds DEFAULT 'free', but be defensive).
    const familyPackage = family.package || 'free'

    // Return success with family info and role
    return res.status(200).json({
      success: true,
      token,
      family: {
        id: family.id,
        name: family.name,
        package: familyPackage
      },
      role,
      message: `Conectat ca ${role === 'viewer' ? 'vizualizator' : 'editor'} pentru ${family.name}`,
      user: {
        familyId: family.id,
        familyName: family.name,
        role: role,
        package: familyPackage
      }
    })

  } catch (error) {
    console.error('PIN login error:', error)
    return res.status(500).json({ error: 'Eroare internă a serverului', errorKey: 'authErrServer' })
  }
}