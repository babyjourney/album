import { supabase } from '../../../lib/supabaseClient'
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
    return res.status(400).json({ error: 'PIN-ul este obligatoriu' })
  }

  // Either phone OR email must be provided. Phone remains the primary path
  // for backward compatibility; email is allowed for 2FA-enabled families.
  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Numărul de telefon sau email-ul este obligatoriu' })
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
      rateLimited: true,
      level: blockStatus.level,
      timeRemaining: timeRemaining,
      blockedUntil: blockStatus.blockedUntil
    })
  }
  
  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre' })
  }

  // Validate phone number format (Romanian format: 068327082 or 68327082).
  // Only enforced when caller supplied a phone (email-only login is allowed
  // for 2FA-enabled families).
  if (cleanPhone) {
    const phoneRegex = /^(0)?[67][0-9]{7}$/
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Numărul de telefon nu este valid (format: 061234567 sau 61234567)' })
    }
  }

  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Adresa de email nu este validă' })
    }
  }

  try {
    let family = null
    let role = null

    // PIN + contact (phone OR email) must both match an existing family.
    // We try the role implied by PIN length first.
    const pinColumn = cleanPin.length === 4 ? 'viewer_pin' : 'editor_pin'
    const roleForPin = cleanPin.length === 4 ? 'viewer' : 'editor'

    let query = supabase
      .from('families')
      .select('id, name, phone_number, email, viewer_pin, editor_pin, is_suspended, package, require_otp_login')
      .eq(pinColumn, cleanPin)

    if (cleanPhone) {
      query = query.eq('phone_number', cleanPhone)
    } else if (cleanEmail) {
      query = query.ilike('email', cleanEmail)
    }

    const { data, error } = await query.maybeSingle()
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
        rateLimited: attemptResult.blocked || false,
        level: attemptResult.level || null,
        attemptsRemaining: attemptResult.attemptsRemaining || 0
      })
    }

    // Check if album is suspended
    if (family.is_suspended) {
      return res.status(403).json({
        error: 'Acest album a fost suspendat. Contactați administratorul pentru mai multe informații.',
        suspended: true
      })
    }

    // 2FA gate (Task #3): if this family requires OTP login, we need to
    // verify the OTP code BEFORE issuing the session token. The OTP was
    // requested earlier via /api/auth/request-otp.
    if (family.require_otp_login) {
      if (!otpCode) {
        return res.status(401).json({
          error: 'Cod de verificare necesar.',
          code: 'OTP_REQUIRED',
          otpRequired: true,
          deliveryHint: cleanEmail ? 'email' : 'phone',
        })
      }
      const otpContactValue = cleanEmail || cleanPhone
      const otpResult = await verifyOtp({
        familyId: family.id,
        contactValue: otpContactValue,
        purpose: 'login_2fa',
        code: otpCode,
      })
      if (!otpResult.ok) {
        return res.status(401).json({
          error: otpResult.error,
          code: 'OTP_INVALID',
          otpRequired: true,
        })
      }
    }

    // Success! Clear any rate limiting for this client
    rateLimiter.recordSuccessfulAttempt(clientId)

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
    return res.status(500).json({ error: 'Eroare internă a serverului' })
  }
}