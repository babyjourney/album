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

export const getSessionToken = () => {
  const session = getSession()
  if (!session || !session.token) return null
  return session.token
}

export const authenticatedFetch = async (url, options = {}) => {
  const token = getSessionToken()

  if (!token) {
    throw new Error('Nu sunteți autentificat')
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

export const requestLoginOtp = async (contact) => {
  try {
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, error: data.error || 'Eroare la trimiterea codului', errorKey: data.errorKey || null }
    }
    return {
      success: true,
      otpRequired: data.otpRequired === true,
      deliveryHint: data.deliveryHint || null,
      message: data.message || '',
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
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
      body: JSON.stringify(params)
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Login failed',
        errorKey: data.errorKey || null,
        suspended: data.suspended || false,
        rateLimited: data.rateLimited || false,
        level: data.level || null,
        blockedUntil: data.blockedUntil || null,
        timeRemaining: data.timeRemaining || null,
        attemptsRemaining: data.attemptsRemaining || null,
        otpRequired: data.otpRequired || false,
        deliveryHint: data.deliveryHint || null,
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
