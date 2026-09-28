import { supabase } from '../../../lib/supabaseClient'
import { isValidPhone, normalizePhone, phoneLookupVariants } from '../../../lib/phone'
import rateLimiter from '../../../lib/rateLimiter'
import { issueFamilyToken } from '../../../lib/authMiddleware'
import { verifyOtp } from '../../../lib/otpStore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { pin, phoneNumber, email, otpCode } = req.body

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu', errorKey: 'authErrPinRequired' })
  }

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Numărul de telefon sau email-ul este obligatoriu', errorKey: 'authErrContactRequired' })
  }

  const cleanPin = pin.toString().replace(/\s/g, '')
  const cleanPhone = phoneNumber ? phoneNumber.toString().replace(/\s/g, '') : ''
  const cleanEmail = email ? String(email).trim().toLowerCase() : ''

  const clientId = rateLimiter.getClientId(req, cleanPhone || cleanEmail)
  
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

    const pinColumn = cleanPin.length === 4 ? 'viewer_pin' : 'editor_pin'
    const roleForPin = cleanPin.length === 4 ? 'viewer' : 'editor'

    const buildQuery = (cols) => {
      let q = supabase.from('families').select(cols).eq(pinColumn, cleanPin)
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

    if (!family) {
      const attemptResult = rateLimiter.recordFailedAttempt(clientId, cleanPin, cleanPhone)
      
      let errorMessage = 'Numărul de telefon sau PIN-ul sunt incorecte'
      if (attemptResult.blocked) {
        const timeRemaining = rateLimiter.formatTimeRemaining(attemptResult.timeRemaining)
        const level = attemptResult.level === 1 ? '10 minute' : '24 hour'
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. ${level} cooldown activat din cauza prea multor încercări.`
      } else if (attemptResult.attemptsRemaining <= 2) {
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. Mai aveți ${attemptResult.attemptsRemaining} încercări înainte de cooldown.`
      }
      
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

    if (family.is_suspended) {
      return res.status(403).json({
        error: 'Acest album a fost suspendat. Contactați administratorul pentru mai multe informații.',
        errorKey: 'authErrSuspended',
        suspended: true
      })
    }

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

    rateLimiter.recordSuccessfulAttempt(clientId)

    try {
      await supabase
        .from('families')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', family.id)
    } catch (accessErr) {
      console.error('last_accessed update failed:', accessErr)
    }

    const token = issueFamilyToken({
      familyId: family.id,
      familyName: family.name,
      role
    })

    const familyPackage = family.package || 'free'

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