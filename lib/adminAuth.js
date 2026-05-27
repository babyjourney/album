// Admin authentication and session management

const ADMIN_SESSION_KEY = 'admin_session'

// Store admin session in localStorage
export const setAdminSession = (token) => {
  const session = {
    token,
    timestamp: Date.now(),
    role: 'admin'
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  }
}

// Get current admin session
export const getAdminSession = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!sessionData) {
      return null
    }

    const session = JSON.parse(sessionData)

    // Validate session structure
    if (!session.token || !session.timestamp || !session.role) {
      clearAdminSession()
      return null
    }

    // Check if session is older than 24 hours
    const hoursSinceLogin = (Date.now() - session.timestamp) / (1000 * 60 * 60)
    if (hoursSinceLogin > 24) {
      clearAdminSession()
      return null
    }

    return session
  } catch (error) {
    console.error('Error reading admin session:', error)
    clearAdminSession()
    return null
  }
}

// Get raw admin token for Authorization header
export const getAdminToken = () => {
  const session = getAdminSession()
  return session?.token || null
}

// fetch() wrapper that includes the admin Bearer token automatically
export const adminFetch = async (url, options = {}) => {
  const token = getAdminToken()
  if (!token) throw new Error('Sesiunea de admin lipsește')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  }
  return fetch(url, { ...options, headers })
}

// Parse the response body and normalize errors. Servers should always reply
// with JSON, but a 404 from Next or a crash before the route handler runs
// returns HTML — which `.json()` chokes on with the cryptic
//   "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
// This helper inspects the content-type, falls back to text, and returns
// a structured { ok, status, data, error } so callers don't have to
// double-handle.
export const parseAdminResponse = async (response) => {
  const ct = response.headers.get('content-type') || ''
  const isJson = ct.includes('application/json')
  const status = response.status

  if (isJson) {
    try {
      const data = await response.json()
      return {
        ok: response.ok,
        status,
        data,
        error: response.ok ? null : (data?.error || `HTTP ${status}`),
      }
    } catch (err) {
      return { ok: false, status, data: null, error: `JSON parse failed: ${err.message}` }
    }
  }

  // Non-JSON response — almost always a 404 or 500 HTML page. Tell the
  // user something actionable instead of the raw "<!DOCTYPE" parse error.
  const text = await response.text().catch(() => '')
  const looksLikeHtml = /^\s*<!?(doctype|html)/i.test(text)
  const hint = looksLikeHtml
    ? (status === 404
        ? `Endpoint negăsit (${response.url}). Asigură-te că ai redeployat / repornit serverul de dev după ultima modificare.`
        : `Serverul a returnat HTML în loc de JSON (status ${status}). Verifică logurile serverului — probabil endpoint-ul a crăpat în timpul încărcării.`)
    : `Răspuns invalid de la server (status ${status})`
  return { ok: false, status, data: null, error: hint }
}

// Clear admin session (logout)
export const clearAdminSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }
}

// Check if user is authenticated as admin
export const isAdminAuthenticated = () => {
  const session = getAdminSession()
  return session !== null && session.role === 'admin'
}

// Admin login function
export const loginAdmin = async (username, password) => {
  try {
    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Store session
    setAdminSession(data.token)

    return {
      success: true,
      message: data.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
