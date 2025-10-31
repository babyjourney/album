// Authentication middleware for API routes

import { supabase } from './supabaseClient'

// Validate family session from request headers
export async function validateFamilySession(req) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Token de autentificare lipsește' }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Decode the session token (this matches the format from pinAuth.js)
    let sessionData
    try {
      sessionData = JSON.parse(Buffer.from(token, 'base64').toString())
    } catch (e) {
      return { isValid: false, error: 'Token invalid' }
    }

    // Check if session has expired (24 hours)
    if (!sessionData.timestamp) {
      return { isValid: false, error: 'Token invalid - fără timestamp' }
    }

    const hoursSinceLogin = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60)
    if (hoursSinceLogin > 24) {
      return { isValid: false, error: 'Sesiunea a expirat' }
    }

    // Verify the family exists and validate the session
    const { data: family, error } = await supabase
      .from('families')
      .select('id, name')
      .eq('id', sessionData.familyId)
      .single()

    if (error || !family) {
      return { isValid: false, error: 'Familie invalidă' }
    }

    return {
      isValid: true,
      familyId: sessionData.familyId,
      familyName: sessionData.familyName,
      role: sessionData.role
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return { isValid: false, error: 'Eroare de autentificare' }
  }
}

// Middleware wrapper for API routes
export function requireAuth(handler) {
  return async (req, res) => {
    const authResult = await validateFamilySession(req)
    
    if (!authResult.isValid) {
      return res.status(401).json({ 
        error: authResult.error,
        code: 'UNAUTHORIZED'
      })
    }

    // Add auth info to request object
    req.auth = {
      familyId: authResult.familyId,
      familyName: authResult.familyName,
      role: authResult.role
    }

    return handler(req, res)
  }
}

// Check if user has editor permissions
export function requireEditor(handler) {
  return requireAuth(async (req, res) => {
    if (req.auth.role !== 'editor') {
      return res.status(403).json({ 
        error: 'Acces interzis - necesită permisiuni de editor',
        code: 'FORBIDDEN'
      })
    }

    return handler(req, res)
  })
}

// Verify family ownership of a resource
export async function verifyFamilyOwnership(familyId, resourceTable, resourceId, resourceField = 'family_id') {
  try {
    const { data, error } = await supabase
      .from(resourceTable)
      .select(resourceField)
      .eq('id', resourceId)
      .single()

    if (error || !data) {
      return { isOwner: false, error: 'Resursa nu există' }
    }

    if (data[resourceField] !== familyId) {
      return { isOwner: false, error: 'Accesul la această resursă este interzis' }
    }

    return { isOwner: true }
  } catch (error) {
    console.error('Ownership verification error:', error)
    return { isOwner: false, error: 'Eroare la verificarea proprietății' }
  }
}