// PIN-based authentication and session management

const SESSION_KEY = 'family_session'

// Store session in localStorage
export const setSession = (familyId, familyName, role) => {
  const session = {
    familyId,
    familyName,
    role,
    timestamp: Date.now()
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
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

// PIN login function
export const loginWithPin = async (pin, phoneNumber) => {
  try {
    const response = await fetch('/api/auth/pin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin, phoneNumber })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Store session
    setSession(data.family.id, data.family.name, data.role)

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