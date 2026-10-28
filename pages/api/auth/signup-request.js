import { supabase } from '../../../lib/supabaseClient'
import { issueOtp, discardOtp, withdrawOtp, countRecentCodes, recentCodeTimes, windowCap, responseFloor } from '../../../lib/otpStore'
import {
  sendOtpEmail,
  sendOtpSms,
  sendExistingAccountNotice,
  normalizeLang,
  isDeliveryUsable,
  channelConfigured,
  anyChannelConfigured,
  emailMatchPattern,
} from '../../../lib/notifications'
import { normalizePhone, phoneLookupVariants, countryOfE164, COUNTRIES, PINNED_COUNT } from '../../../lib/phone'
import rateLimiter, { HOUR, DAY } from '../../../lib/rateLimiter'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RESPONSE_FLOOR_MS = 900
const CONTACT_HOURLY_MAX = 5
const CONTACT_DAILY_MAX = 10

const SMS_SIGNUP_COUNTRIES = new Set(COUNTRIES.slice(0, PINNED_COUNT).map((c) => c.code))
const NANP_OUTSIDE_US_CA = ['+1658', '+1829', '+1849', '+1939']

const smsSignupAllowed = (e164) => {
  const country = countryOfE164(e164)
  return !!country &&
    SMS_SIGNUP_COUNTRIES.has(country.code) &&
    !NANP_OUTSIDE_US_CA.some((prefix) => e164.startsWith(prefix))
}

const DAILY_CAP = {
  sms: { env: 'SIGNUP_SMS_DAILY_CAP', fallback: 300 },
  email: { env: 'SIGNUP_EMAIL_DAILY_CAP', fallback: 80 },
}

const dailyCap = (channel) => {
  const { env, fallback } = DAILY_CAP[channel]
  const n = parseInt(process.env[env] || '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const contactKindOf = (channel) => (channel === 'sms' ? 'phone' : 'email')
const otherChannelOf = (channel) => (channel === 'sms' ? 'email' : 'sms')

async function channelOpen(channel) {
  if (!channelConfigured(channel)) return { open: false, reason: 'unconfigured' }
  const cap = dailyCap(channel)
  const { count, error } = await countRecentCodes({
    familyId: null,
    contactKind: contactKindOf(channel),
    purpose: 'signup',
    windowMs: DAY,
  })
  if (error) return { open: false, reason: 'count-failed' }
  if (count >= cap) return { open: false, reason: 'capped', count, cap }
  return { open: true }
}

async function overSignupCaps(channel, contactValue, createdAt) {
  const cap = dailyCap(channel)
  const mineAt = createdAt ? new Date(createdAt).getTime() : NaN
  const [global, contact] = await Promise.all([
    countRecentCodes({ familyId: null, contactKind: contactKindOf(channel), purpose: 'signup', windowMs: DAY, until: createdAt || undefined }),
    recentCodeTimes({ familyId: null, contactValue, purpose: 'signup', windowMs: DAY }),
  ])
  if (global.error) return { scope: 'global', reason: 'count-failed' }
  if (global.count > cap) return { scope: 'global', reason: 'capped', count: global.count, cap }
  const upToMine = Number.isFinite(mineAt) ? contact.times.filter((t) => t <= mineAt) : contact.times
  const hour = windowCap(upToMine, { max: CONTACT_HOURLY_MAX + 1, windowMs: HOUR })
  const day = windowCap(upToMine, { max: CONTACT_DAILY_MAX + 1, windowMs: DAY })
  if (hour.capped || day.capped) return { scope: 'contact', hour: hour.count, day: day.count }
  return null
}

const SIGNUP_UNAVAILABLE = {
  error: 'Înregistrarea nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
  errorKey: 'signupUnavailable',
  otherChannelAvailable: false,
}

const CHANNEL_UNAVAILABLE = {
  sms: {
    error: 'Nu putem trimite SMS-uri momentan. Încearcă înregistrarea prin email sau revino mai târziu.',
    errorKey: 'signupSmsUnavailable',
  },
  email: {
    error: 'Nu putem trimite emailuri momentan. Încearcă înregistrarea prin SMS sau revino mai târziu.',
    errorKey: 'signupEmailUnavailable',
  },
}

const SMS_COUNTRY_UNSUPPORTED = {
  error: 'Nu putem trimite SMS în această țară. Folosește înregistrarea prin email.',
  errorKey: 'signupSmsCountryUnsupported',
}

const describeClosed = (channel, state) => (
  state.reason === 'unconfigured'
    ? `${channel} delivery is not configured (${channel === 'sms' ? 'TWILIO_*' : 'RESEND_API_KEY'})`
    : state.reason === 'capped'
      ? `daily signup ${channel} cap reached (${state.count}/${state.cap}, ${DAILY_CAP[channel].env})`
      : `could not count today's signup ${channel} codes, refusing to stay under ${DAILY_CAP[channel].env}`
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const settle = responseFloor(RESPONSE_FLOOR_MS)

  if (!anyChannelConfigured()) {
    console.error('[signup] neither RESEND_API_KEY nor TWILIO_* is configured — signup is unavailable')
    return res.status(503).json(SIGNUP_UNAVAILABLE)
  }

  const { familyName, email, phoneNumber, channel: rawChannel, lang } = req.body || {}

  const channel = rawChannel === 'sms' || rawChannel === 'phone' ? 'sms' : 'email'
  const language = normalizeLang(lang)
  const cleanName = String(familyName || '').trim()

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Introdu numele familiei', errorKey: 'signupErrNameRequired' })
  }

  let contactValue = null
  let emailPattern = null
  if (channel === 'email') {
    contactValue = String(email || '').trim().toLowerCase()
    emailPattern = emailMatchPattern(contactValue)
    if (!EMAIL_RE.test(contactValue) || !emailPattern) {
      return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
    }
  } else {
    contactValue = normalizePhone(phoneNumber)
    if (!contactValue) {
      return res.status(400).json({ error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
    }
  }

  const buckets = [
    rateLimiter.byIp('signup', req, 10, HOUR),
    rateLimiter.byContact('signup', contactValue, 4, HOUR),
  ]
  if (channel === 'sms') buckets.push(rateLimiter.byIp('signup-sms', req, 5, HOUR))
  const limit = rateLimiter.take(buckets)
  if (!limit.allowed) {
    return res.status(429).json(rateLimiter.tooManyBody(limit.retryAfterMs))
  }

  const refuse = async (body = CHANNEL_UNAVAILABLE[channel], status = 503) => {
    const other = await channelOpen(otherChannelOf(channel))
    return other.open
      ? res.status(status).json({ ...body, otherChannelAvailable: true })
      : res.status(503).json(SIGNUP_UNAVAILABLE)
  }

  const quietOk = async () => {
    await settle()
    return res.status(200).json({ ok: true, codeLength: 4, channel })
  }

  try {
    if (channel === 'sms' && !smsSignupAllowed(contactValue)) {
      return await refuse(SMS_COUNTRY_UNSUPPORTED, 400)
    }

    if (!channelConfigured(channel)) {
      console.error(`[signup] ${describeClosed(channel, { reason: 'unconfigured' })} — cannot send the signup code`)
      return await refuse()
    }

    const { error: schemaProbe } = await supabase
      .from('verification_codes')
      .select('payload')
      .limit(1)
    if (schemaProbe) {
      console.error('[signup] verification_codes.payload missing — run supabase-migration.sql. Refusing signup.')
      return res.status(503).json(SIGNUP_UNAVAILABLE)
    }

    const self = await channelOpen(channel)
    if (!self.open) {
      console.error(`[signup] ${describeClosed(channel, self)} — refusing ${channel} signup`)
      return await refuse()
    }

    const { times: contactTimes } = await recentCodeTimes({
      familyId: null,
      contactValue,
      purpose: 'signup',
      windowMs: DAY,
    })
    const contactHour = windowCap(contactTimes, { max: CONTACT_HOURLY_MAX, windowMs: HOUR })
    const contactDay = windowCap(contactTimes, { max: CONTACT_DAILY_MAX, windowMs: DAY })
    if (contactHour.capped || contactDay.capped) {
      console.warn(`[signup] ${contactDay.count} signup codes for one ${contactKindOf(channel)} in the last 24 hours (${contactHour.count} in the last hour), not sending another`)
      return await quietOk()
    }

    const { data: existing, error: lookupError } = channel === 'sms'
      ? await supabase
          .from('families')
          .select('id')
          .in('phone_number', phoneLookupVariants(contactValue))
          .limit(1)
          .maybeSingle()
      : await supabase
          .from('families')
          .select('id')
          .ilike('email', emailPattern)
          .limit(1)
          .maybeSingle()

    if (lookupError) {
      console.error(`[signup] ${channel} lookup failed, refusing to issue a code:`, lookupError)
      return await quietOk()
    }

    const registered = !!existing
    if (registered) console.info(`[signup] ${contactKindOf(channel)} already registered, sending a "use Forgot PIN" notice instead of a code`)

    const viewerPin = String(Math.floor(1000 + Math.random() * 9000))
    const editorPin = String(Math.floor(10000000 + Math.random() * 90000000))

    const { code, otpId, createdAt } = await issueOtp({
      familyId: null,
      contactKind: contactKindOf(channel),
      contactValue,
      purpose: 'signup',
      spent: registered,
      payload: registered ? null : {
        familyName: cleanName,
        email: channel === 'email' ? contactValue : null,
        phoneNumber: channel === 'sms' ? contactValue : null,
        viewerPin,
        editorPin,
        channel,
        lang: language,
      },
    })

    const over = await overSignupCaps(channel, contactValue, createdAt)
    if (over) {
      await withdrawOtp(otpId)
      if (over.scope === 'global') {
        console.error(`[signup] ${describeClosed(channel, over)} — refusing ${channel} signup after reserving`)
        await settle()
        return await refuse()
      }
      console.warn(`[signup] ${over.day} signup messages for one ${contactKindOf(channel)} in the last 24 hours (${over.hour} in the last hour), not sending another`)
      return await quietOk()
    }

    const delivery = registered
      ? await sendExistingAccountNotice({ kind: contactKindOf(channel), to: contactValue, lang: language })
      : channel === 'sms'
        ? await sendOtpSms({ to: contactValue, code, purpose: 'signup', lang: language })
        : await sendOtpEmail({ to: contactValue, code, purpose: 'signup', lang: language })

    if (!isDeliveryUsable(delivery)) {
      await discardOtp(otpId)
      console.error(`[signup] ${channel} send FAILED — refusing to claim "code sent"`)
      await settle()
      return await refuse()
    }

    if (registered) return await quietOk()

    const body = { ok: true, codeLength: 4, channel }
    if (delivery.mocked) {
      body.devCode = code
      body.devNote = channel === 'sms'
        ? 'SMS nu este configurat (TWILIO_*). Cod afișat doar în development.'
        : 'Email nu este configurat (RESEND_API_KEY). Cod afișat doar în development.'
    }

    await settle()
    return res.status(200).json(body)
  } catch (error) {
    console.error('signup-request error:', error)
    return await quietOk()
  }
}
