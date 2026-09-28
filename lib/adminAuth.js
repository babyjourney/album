const ADMIN_SESSION_KEY = 'admin_session'

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

    if (!session.token || !session.timestamp || !session.role) {
      clearAdminSession()
      return null
    }

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

export const getAdminToken = () => {
  const session = getAdminSession()
  return session?.token || null
}

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

  const text = await response.text().catch(() => '')
  const looksLikeHtml = /^\s*<!?(doctype|html)/i.test(text)

  const extracted =
    /"message":"((?:[^"\\]|\\.)*)"/.exec(text)?.[1] ||
    />Error:\s*([^<]+)</i.exec(text)?.[1] ||
    null
  const decoded = extracted
    ? extracted.replace(/\\n/g, '\n').replace(/\\"/g, '"').slice(0, 300)
    : null

  const hint = looksLikeHtml
    ? (status === 404
        ? `Endpoint negăsit (${response.url}). Asigură-te că ai redeployat / repornit serverul de dev după ultima modificare.`
        : decoded
          ? `Server crash (status ${status}): ${decoded}`
          : `Serverul a returnat HTML în loc de JSON (status ${status}). Verifică terminalul unde rulează 'next dev' pentru eroarea reală.`)
    : `Răspuns invalid de la server (status ${status})`
  return { ok: false, status, data: null, error: hint }
}

export const clearAdminSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }
}

export const isAdminAuthenticated = () => {
  const session = getAdminSession()
  return session !== null && session.role === 'admin'
}

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
