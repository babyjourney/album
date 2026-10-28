import translations from '../contexts/translations'

const SESSION_KEY = 'family_session'

export const setSession = (familyId, familyName, role, token, pkg = 'free') => {
  const session = {
    familyId,
    familyName,
    role,
    token,
    package: pkg || 'free',
    timestamp: Date.now()
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

const currentLanguage = () => {
  if (typeof document === 'undefined') return undefined
  return document.documentElement.lang || undefined
}

const translate = (key) => {
  const lang = currentLanguage()
  return translations[lang]?.[key] ?? translations.ro?.[key] ?? key
}

const formatUnit = (value, unit, locale, unitDisplay) => {
  try {
    return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay }).format(value)
  } catch {
    return `${value} ${unit}`
  }
}

export const formatCountdown = (milliseconds, locale) => {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const parts = h > 0
    ? [[h, 'hour'], [m, 'minute'], [s, 'second']]
    : m > 0
      ? [[m, 'minute'], [s, 'second']]
      : [[s, 'second']]
  return parts.map(([value, unit]) => formatUnit(value, unit, locale, 'narrow')).join(' ')
}

export const formatWaitTime = (milliseconds, locale) => {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000))
  if (seconds >= 3600) return formatUnit(Math.ceil(seconds / 3600), 'hour', locale, 'long')
  if (seconds >= 60) return formatUnit(Math.ceil(seconds / 60), 'minute', locale, 'long')
  return formatUnit(seconds, 'second', locale, 'long')
}

export const getSessionToken = () => {
  const session = getSession()
  if (!session || !session.token) return null
  return session.token
}

export const authenticatedFetch = async (url, options = {}) => {
  const token = getSessionToken()

  if (!token) {
    const error = new Error(translate('errAuthTokenMissing'))
    error.errorKey = 'errAuthTokenMissing'
    throw error
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  }

  return fetch(url, {
    ...options,
    headers
  })
}

export const getSession = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) {
      return null
    }

    const session = JSON.parse(sessionData)

    if (!session.token) {
      clearSession()
      return null
    }

    const hoursSinceLogin = (Date.now() - session.timestamp) / (1000 * 60 * 60)
    if (hoursSinceLogin > 24) {
      clearSession()
      return null
    }

    return session
  } catch (error) {
    console.error('Error reading session:', error)
    clearSession()
    return null
  }
}

export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}

export const isEditor = () => {
  const session = getSession()
  return session?.role === 'editor'
}

export const isViewer = () => {
  const session = getSession()
  return session?.role === 'viewer' || session?.role === 'editor'
}

export const isAuthenticated = () => {
  const session = getSession()
  return session !== null
}

export const getFamilyPackage = () => {
  const session = getSession()
  return session?.package || 'free'
}

export const loginWithPin = async (...args) => {
  let params
  if (typeof args[0] === 'string' || typeof args[0] === 'number') {
    params = { pin: args[0], phoneNumber: args[1] }
  } else {
    params = args[0] || {}
  }

  try {
    const response = await fetch('/api/auth/pin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...params, lang: params.lang || currentLanguage() })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Autentificarea a eșuat',
        errorKey: data.errorKey || null,
        suspended: data.suspended || false,
        rateLimited: data.rateLimited || false,
        level: data.level || null,
        blockedUntil: data.blockedUntil || null,
        retryAfterMs: data.retryAfterMs || null,
        timeRemaining: data.timeRemaining || null,
        attemptsRemaining: data.attemptsRemaining || null,
        otpRequired: data.otpRequired || false,
        deliveryHint: data.deliveryHint || null,
        deliveryTo: data.deliveryTo || null,
        fallback: data.fallback === true,
        devCode: data.devCode || null,
        code: data.code || null,
      }
    }

    setSession(
      data.family.id,
      data.family.name,
      data.role,
      data.token,
      data.family.package || data.user?.package || 'free'
    )

    return {
      success: true,
      family: data.family,
      role: data.role,
      message: data.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
