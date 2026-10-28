import crypto from 'crypto'
import { supabase } from '../../../lib/supabaseClient'
import { isValidPhone, normalizePhone, phoneLookupVariants, maskPhone } from '../../../lib/phone'
import rateLimiter, { HOUR, DAY } from '../../../lib/rateLimiter'
import { issueFamilyToken } from '../../../lib/authMiddleware'
import { verifyOtp, familyOtpTargets, deliverableTargets, otpAttemptBudget, issueAndSendOtp, responseFloor } from '../../../lib/otpStore'
import { emailMatchPattern, maskEmail, normalizeLang, anyChannelConfigured, channelConfigured } from '../../../lib/notifications'
import {
  failureContactHash,
  failureDeviceHash,
  reserveFailureBudget,
  releaseFailures,
  pruneFailures,
  devicePause,
  memoryBudgetBuckets,
  forgiveDevice,
  clearLoginFailures,
} from '../../../lib/loginFailures'

const MAX_CANDIDATES = 10
const LOCKOUT_FLOOR_MS = 1500

const FULL_COLS = 'id, name, phone_number, email, viewer_pin, editor_pin, is_suspended, package, require_otp_login, self_registered'
const LEGACY_COLS = 'id, name, phone_number, email, viewer_pin, editor_pin, is_suspended, package, require_otp_login'

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest()

const pinMatches = (stored, typed) =>
  stored !== null && stored !== undefined && crypto.timingSafeEqual(digest(stored), digest(typed))

const maskContact = (kind, value) => (kind === 'email' ? maskEmail(value) : maskPhone(value))

const pauseBody = ({ level, retryAfterMs, blockedUntil }) => {
  const timeRemaining = rateLimiter.formatTimeRemaining(retryAfterMs)
  return {
    error: `Prea multe încercări. Încearcă din nou peste ${timeRemaining}.`,
    errorKey: 'errRateLimited',
    rateLimited: true,
    level,
    timeRemaining,
    retryAfterMs,
    blockedUntil,
  }
}

function wrongPinBody(strike) {
  let errorMessage = 'Numărul de telefon sau PIN-ul sunt incorecte'
  if (strike.blocked) {
    const timeRemaining = rateLimiter.formatTimeRemaining(strike.retryAfterMs)
    errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. Prea multe încercări — încearcă din nou peste ${timeRemaining}.`
  } else if (strike.attemptsRemaining <= 2) {
    errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. Mai aveți ${strike.attemptsRemaining} încercări înainte de blocare.`
  }
  return {
    error: errorMessage,
    errorKey: 'authErrWrongCredentials',
    rateLimited: strike.blocked || false,
    level: strike.level || null,
    retryAfterMs: strike.retryAfterMs || null,
    blockedUntil: strike.blockedUntil || null,
    attemptsRemaining: strike.attemptsRemaining || 0,
  }
}

const codeInvalidBody = () => ({
  error: 'Cod de verificare greșit sau expirat.',
  errorKey: 'authErrOtpInvalid',
  code: 'OTP_INVALID',
  otpRequired: true,
})

async function completeLogin(ctx, family, { lockout }) {
  const { res, clientId, deviceHash, budget, role } = ctx
  rateLimiter.recordSuccessfulAttempt(clientId)
  if (lockout) {
    await clearLoginFailures(family)
  } else if (budget.deviceStore && (budget.deviceSeen || []).some((row) => row.family_id === family.id)) {
    await forgiveDevice(family.id, deviceHash)
  }

  const { error: accessError } = await supabase
    .from('families')
    .update({ last_accessed: new Date().toISOString() })
    .eq('id', family.id)
  if (accessError) console.error('last_accessed update failed:', accessError)

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
}

async function lockedOut(ctx, retryAfterMs) {
  const { req, res, settle, candidates, matches, contactKind, contactValue, otpCode, lang, releaseIp } = ctx

  if (!anyChannelConfigured()) {
    releaseIp()
    return res.status(429).json(rateLimiter.tooManyBody(retryAfterMs))
  }

  console.warn('[pin-login] wrong-PIN limit reached for this account; every attempt now needs a login code')
  const index = matches.indexOf(true)
  const family = index !== -1 && !candidates[index].is_suspended ? candidates[index] : null
  const targets = family ? familyOtpTargets(family, contactKind, contactValue) : []

  if (!otpCode) {
    let devCode = null
    if (family) {
      const issuing = issueAndSendOtp({
        familyId: family.id,
        targets,
        purpose: 'login_2fa',
        lang: normalizeLang(lang),
        maxIssuedPerHour: 10,
      })
        .then((sent) => {
          if (!sent.ok) console.warn(`[pin-login] login code during the wrong-PIN limit not sent (${sent.reason})`)
          else if (sent.mocked && process.env.NODE_ENV !== 'production') devCode = sent.code
        })
        .catch((error) => console.error('[pin-login] login code during the wrong-PIN limit failed:', error))
      await Promise.race([issuing, settle()])
    }
    await settle()
    return res.status(401).json({
      error: 'Prea multe încercări greșite pentru acest cont. Dacă PIN-ul este corect, ți-am trimis un cod de verificare.',
      errorKey: 'loginOtpLockout',
      code: 'OTP_REQUIRED',
      otpRequired: true,
      deliveryHint: contactKind,
      deliveryTo: null,
      fallback: !channelConfigured(contactKind),
      retryAfterMs,
      ...(devCode ? { devCode } : {}),
    })
  }

  const otpIpBuckets = [rateLimiter.byIp('login-otp-fail', req, 15, HOUR)]
  const otpLimit = rateLimiter.check(otpIpBuckets)
  if (!otpLimit.allowed) {
    await settle()
    return res.status(429).json(rateLimiter.tooManyBody(otpLimit.retryAfterMs))
  }

  if (family) {
    const otpBudget = await otpAttemptBudget({ familyId: family.id, purpose: 'login_2fa', max: 15, windowMs: DAY })
    if (!otpBudget.blocked) {
      const result = await verifyOtp({
        familyId: family.id,
        contactValue: targets.map((target) => target.value),
        purpose: 'login_2fa',
        code: String(otpCode).trim(),
      })
      if (result.ok) {
        releaseIp()
        return completeLogin(ctx, family, { lockout: true })
      }
    }
  }

  rateLimiter.record(otpIpBuckets)
  await settle()
  return res.status(401).json(codeInvalidBody())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const settle = responseFloor(LOCKOUT_FLOOR_MS)
  const { pin, phoneNumber, email, otpCode, lang } = req.body || {}

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu', errorKey: 'authErrPinRequired' })
  }

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Numărul de telefon sau email-ul este obligatoriu', errorKey: 'authErrContactRequired' })
  }

  const cleanPin = pin.toString().replace(/\s/g, '')
  const cleanPhone = phoneNumber ? phoneNumber.toString().replace(/\s/g, '') : ''
  const cleanEmail = email ? String(email).trim().toLowerCase() : ''
  const limiterContact = cleanEmail || normalizePhone(cleanPhone) || cleanPhone

  const clientId = rateLimiter.getClientId(req, limiterContact)

  const ipBuckets = [rateLimiter.byIp('pin-login-fail', req, 30, HOUR)]
  const ipLimit = rateLimiter.check(ipBuckets)
  if (!ipLimit.allowed) {
    return res.status(429).json(rateLimiter.tooManyBody(ipLimit.retryAfterMs))
  }

  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre', errorKey: 'authErrPinFormat' })
  }

  if (cleanPhone && !isValidPhone(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
  }

  const emailPattern = cleanEmail ? emailMatchPattern(cleanEmail) : null
  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail) || !emailPattern) {
      return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
    }
  }

  const contactKind = cleanEmail ? 'email' : 'phone'
  const contactValue = cleanEmail || normalizePhone(cleanPhone)

  try {
    const lookup = (cols) => {
      const query = supabase.from('families').select(cols)
      return (cleanEmail
        ? query.ilike('email', emailPattern)
        : query.in('phone_number', phoneLookupVariants(cleanPhone))
      ).limit(MAX_CANDIDATES)
    }

    let { data: candidateRows, error: lookupError } = await lookup(FULL_COLS)
    if (lookupError && /self_registered/i.test(lookupError.message || '')) {
      ;({ data: candidateRows, error: lookupError } = await lookup(LEGACY_COLS))
    }
    if (lookupError) {
      console.error('[pin-login] family lookup failed:', lookupError)
      return res.status(500).json({ error: 'Eroare internă a serverului', errorKey: 'authErrServer' })
    }

    const candidates = candidateRows || []
    const familyIds = candidates.map((candidate) => candidate.id)

    const ipSlot = rateLimiter.take(ipBuckets)
    if (!ipSlot.allowed) {
      return res.status(429).json(rateLimiter.tooManyBody(ipSlot.retryAfterMs))
    }
    const releaseIp = () => rateLimiter.release(ipBuckets, ipSlot.at)

    const deviceHash = failureDeviceHash(req)
    const budget = await reserveFailureBudget({
      familyIds,
      contactHash: failureContactHash(contactValue),
      deviceHash,
    })
    const releaseReservation = async () => {
      if (budget.state === 'reserved') await releaseFailures(budget.ids)
    }

    if (budget.state === 'paused') {
      releaseIp()
      return res.status(429).json(pauseBody(budget.pause))
    }

    if (!budget.deviceStore) {
      const blockStatus = rateLimiter.isBlocked(clientId)
      if (blockStatus.blocked) {
        await releaseReservation()
        releaseIp()
        return res.status(429).json(pauseBody({
          level: blockStatus.level,
          retryAfterMs: blockStatus.timeRemaining,
          blockedUntil: blockStatus.blockedUntil,
        }))
      }
    }

    let exhaustedFor = budget.state === 'blocked' ? budget.retryAfterMs : 0
    const memoryBuckets = budget.state === 'off' ? memoryBudgetBuckets(limiterContact, familyIds) : []
    let memorySlot = null
    if (budget.state === 'off') {
      memorySlot = rateLimiter.take(memoryBuckets)
      if (!memorySlot.allowed) exhaustedFor = memorySlot.retryAfterMs
    }

    const pinColumn = cleanPin.length === 4 ? 'viewer_pin' : 'editor_pin'
    const role = cleanPin.length === 4 ? 'viewer' : 'editor'
    const matches = candidates.map((candidate) => pinMatches(candidate[pinColumn], cleanPin))

    const ctx = {
      req, res, settle, candidates, matches, contactKind, contactValue, otpCode, lang,
      releaseIp, clientId, deviceHash, budget, role,
    }

    if (exhaustedFor) {
      return await lockedOut(ctx, exhaustedFor)
    }

    const matchIndex = matches.indexOf(true)
    const family = matchIndex === -1 ? null : candidates[matchIndex]

    if (!family) {
      if (budget.state === 'reserved') await pruneFailures()
      let strike
      if (budget.deviceStore) {
        strike = devicePause([...(budget.deviceTimes || []), Date.now()])
        if (strike.blocked) console.warn(`[pin-login] one device reached ${strike.level === 2 ? 10 : 5} wrong PINs for one account, pausing it`)
      } else {
        const attempt = rateLimiter.recordFailedAttempt(clientId, cleanPin, cleanPhone)
        strike = { ...attempt, retryAfterMs: attempt.timeRemaining }
        const securityAnalysis = rateLimiter.getSecurityAnalysis(clientId)
        if (securityAnalysis?.isLikelyBruteForce) {
          console.warn(`🚨 Possible brute force attack detected from ${clientId.substring(0, 20)}... - ${securityAnalysis.uniquePins} unique PINs, ${securityAnalysis.uniquePhoneNumbers} unique phones tried`)
        }
      }
      return res.status(401).json(wrongPinBody(strike))
    }

    releaseIp()
    if (memorySlot && memorySlot.at) rateLimiter.release(memoryBuckets, memorySlot.at)
    await releaseReservation()

    if (family.is_suspended) {
      return res.status(403).json({
        error: 'Acest album a fost suspendat. Contactați administratorul pentru mai multe informații.',
        errorKey: 'authErrSuspended',
        suspended: true
      })
    }

    const otpBypass = process.env.LOGIN_OTP_BYPASS === 'true' && !family.self_registered
    if (family.require_otp_login && !otpBypass) {
      const otpTargets = familyOtpTargets(family, contactKind, contactValue)
      const codeUnavailable = () => res.status(503).json({
        error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'otpDeliveryUnavailable',
      })
      if (deliverableTargets(otpTargets).length === 0) {
        console.error('[pin-login] this family needs a login code but none of its contacts has a configured channel (RESEND/TWILIO env)')
        return codeUnavailable()
      }

      if (!otpCode) {
        const sent = await issueAndSendOtp({
          familyId: family.id,
          targets: otpTargets,
          purpose: 'login_2fa',
          lang: normalizeLang(lang),
          maxIssuedPerHour: 10,
        })
        if (!sent.ok && String(sent.reason || '').startsWith('capped')) {
          console.warn(`[pin-login] login code not sent (${sent.reason})`)
          return res.status(401).json({
            error: 'Ai cerut prea multe coduri. Folosește ultimul cod primit sau încearcă din nou mai târziu.',
            errorKey: 'loginOtpResendLimited',
            code: 'OTP_REQUIRED',
            otpRequired: true,
            deliveryHint: contactKind,
            deliveryTo: null,
            fallback: false,
          })
        }
        if (!sent.ok) {
          console.error(`[pin-login] login code not sent (${sent.reason})`)
          return codeUnavailable()
        }
        const sentKind = sent.kind || contactKind
        return res.status(401).json({
          error: 'Cod de verificare necesar.',
          errorKey: 'authErrOtpRequired',
          code: 'OTP_REQUIRED',
          otpRequired: true,
          deliveryHint: contactKind,
          deliveryTo: maskContact(sentKind, sent.value || contactValue) || null,
          fallback: sentKind !== contactKind,
          ...(sent.mocked && process.env.NODE_ENV !== 'production' ? { devCode: sent.code } : {}),
        })
      }

      const otpFailureBuckets = [
        rateLimiter.byIp('login-otp-fail', req, 15, HOUR),
        rateLimiter.byContact('login-otp-fail', contactValue, 8, HOUR),
      ]
      const otpLimit = rateLimiter.check(otpFailureBuckets)
      const otpBudget = otpLimit.allowed
        ? await otpAttemptBudget({ familyId: family.id, purpose: 'login_2fa', max: 15, windowMs: DAY })
        : { blocked: true, retryAfterMs: otpLimit.retryAfterMs }
      if (otpBudget.blocked) {
        return res.status(429).json(rateLimiter.tooManyBody(otpBudget.retryAfterMs))
      }

      const otpResult = await verifyOtp({
        familyId: family.id,
        contactValue: otpTargets.map((target) => target.value),
        purpose: 'login_2fa',
        code: String(otpCode).trim(),
      })
      if (!otpResult.ok) {
        rateLimiter.record(otpFailureBuckets)
        return res.status(401).json({
          error: otpResult.error,
          errorKey: otpResult.errorKey || 'authErrOtpInvalid',
          code: 'OTP_INVALID',
          otpRequired: true,
        })
      }
    }

    return await completeLogin(ctx, family, { lockout: false })
  } catch (error) {
    console.error('PIN login error:', error)
    return res.status(500).json({ error: 'Eroare internă a serverului', errorKey: 'authErrServer' })
  }
}
