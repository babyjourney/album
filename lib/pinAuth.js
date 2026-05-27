// PIN-based authentication and session management

const SESSION_KEY = 'family_session'

// Store session in localStorage. We persist the *server-issued signed token*
// alongside the public claims; the token is opaque to the client and is what
// API routes verify. The other fields are convenience for UI only.
//
// `pkg` is the family's tier (e.g. 'free' / 'premium'); the server is the
// source of truth — the client-side copy is purely for UX (showing limits,
// pre-validating uploads). The actual enforcement happens on the server.
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

// Get session token for API requests. Returns the server-issued signed token
// (the only thing the server will accept). If no token is present (legacy
// session predating signing), returns null so the caller treats the user as
// unauthenticated and forces re-login.
export const getSessionToken = () => {
  const session = getSession()
  if (!session || !session.token) return null
  return session.token
}

// Create authenticated fetch wrapper
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

// Get current session
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

    // Legacy sessions (pre-signed-token) are no longer accepted by the API.
    if (!session.token) {
      clearSession()
      return null
    }

    // Check if session is older than 24 hours (optional expiry)
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

// Clear session (logout)
export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}

// Check if user has editor permissions
export const isEditor = () => {
  const session = getSession()
  return session?.role === 'editor'
}

// Check if user has viewer permissions (includes editors)
export const isViewer = () => {
  const session = getSession()
  return session?.role === 'viewer' || session?.role === 'editor'
}

// Check if user is authenticated (any role)
export const isAuthenticated = () => {
  const session = getSession()
  return session !== null
}

// Return the cached package for the current family (defaults to 'free' so
// UI code can always read a known limit even before the server replies).
export const getFamilyPackage = () => {
  const session = getSession()
  return session?.package || 'free'
}

// Request an OTP for 2-factor album access (Task #3). The server replies
// with `otpRequired: true | false`:
//   • false → the family doesn't have 2FA enabled; UI can submit PIN directly
//   • true  → an OTP was sent; UI must collect it and submit alongside PIN
//
// `contact` is either { phoneNumber } or { email }.
export const requestLoginOtp = async (contact) => {
  try {
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, error: data.error || 'Eroare la trimiterea codului' }
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

// PIN login function. `params` accepts either:
//   { pin, phoneNumber }
//   { pin, email }
//   { pin, phoneNumber|email, otpCode }    when 2FA is required
export const loginWithPin = async (...args) => {
  // Backward-compatible signature: loginWithPin(pin, phoneNumber)
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

    // Store session WITH server-issued signed token. Persist the family's
    // package alongside so UploadForm can read limits synchronously.
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
