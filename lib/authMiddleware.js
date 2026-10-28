import crypto from 'crypto'
import { supabase } from './supabaseClient'

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(
      [
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        process.env.ADMIN_PASSWORD || '',
        'album-sergiu-session-v1'
      ].join('|')
    )
    .digest('hex')

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64'
  ).toString()
}

function sign(payloadB64) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('hex')
}

function timingSafeEq(a, b) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function issueFamilyToken({ familyId, familyName, role }) {
  const payload = {
    kind: 'family',
    familyId,
    familyName,
    role,
    timestamp: Date.now()
  }
  const p = b64url(JSON.stringify(payload))
  return `${p}.${sign(p)}`
}

export function issueAdminToken() {
  const payload = {
    kind: 'admin',
    role: 'admin',
    random: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now()
  }
  const p = b64url(JSON.stringify(payload))
  return `${p}.${sign(p)}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const payloadB64 = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = sign(payloadB64)
  if (!timingSafeEq(signature, expected)) return null
  let payload
  try {
    payload = JSON.parse(b64urlDecode(payloadB64))
  } catch {
    return null
  }
  if (!payload || typeof payload.timestamp !== 'number') return null
  if (Date.now() - payload.timestamp > SESSION_MAX_AGE_MS) return null
  return payload
}

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function validateFamilySession(req) {
  try {
    const token = extractToken(req)
    if (!token) {
      return { isValid: false, error: 'Token de autentificare lipsește', errorKey: 'errAuthTokenMissing' }
    }

    const payload = verifyToken(token)
    if (!payload || payload.kind !== 'family') {
      return { isValid: false, error: 'Token invalid sau expirat', errorKey: 'errAuthTokenInvalid' }
    }

    if (!payload.familyId || !['viewer', 'editor'].includes(payload.role)) {
      return { isValid: false, error: 'Token invalid', errorKey: 'errAuthTokenInvalid' }
    }

    const { data: family, error } = await supabase
      .from('families')
      .select('id, name, is_suspended')
      .eq('id', payload.familyId)
      .single()

    if (error || !family) {
      return { isValid: false, error: 'Familie invalidă', errorKey: 'errAuthFamilyInvalid' }
    }

    if (family.is_suspended) {
      return { isValid: false, error: 'Acest album a fost suspendat', errorKey: 'authErrSuspended' }
    }

    return {
      isValid: true,
      familyId: payload.familyId,
      familyName: payload.familyName,
      role: payload.role
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return { isValid: false, error: 'Eroare de autentificare', errorKey: 'errAuthFailed' }
  }
}

export async function validateAdminSession(req) {
  const token = extractToken(req)
  if (!token) return { isValid: false, error: 'Token de admin lipsește' }
  const payload = verifyToken(token)
  if (!payload || payload.kind !== 'admin' || payload.role !== 'admin') {
    return { isValid: false, error: 'Token admin invalid sau expirat' }
  }
  return { isValid: true, role: 'admin' }
}

export function requireAuth(handler) {
  return async (req, res) => {
    try {
      const authResult = await validateFamilySession(req)

      if (!authResult.isValid) {
        return res.status(401).json({
          error: authResult.error,
          errorKey: authResult.errorKey,
          code: 'UNAUTHORIZED'
        })
      }

      req.auth = {
        familyId: authResult.familyId,
        familyName: authResult.familyName,
        role: authResult.role
      }

      return await handler(req, res)
    } catch (err) {
      console.error('[requireAuth] unhandled error:', err)
      if (!res.headersSent) {
        return res.status(500).json({
          error: err?.message || 'Eroare internă neașteptată',
          errorKey: 'errServerInternal',
          where: 'requireAuth',
          stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
        })
      }
    }
  }
}

export function requireEditor(handler) {
  return requireAuth(async (req, res) => {
    if (req.auth.role !== 'editor') {
      return res.status(403).json({
        error: 'Acces interzis - necesită permisiuni de editor',
        errorKey: 'errEditorRole',
        code: 'FORBIDDEN'
      })
    }
    return handler(req, res)
  })
}

export function requireAdmin(handler) {
  return async (req, res) => {
    try {
      const adminResult = await validateAdminSession(req)
      if (!adminResult.isValid) {
        return res.status(401).json({
          error: adminResult.error,
          errorKey: adminResult.errorKey,
          code: 'UNAUTHORIZED'
        })
      }
      req.auth = { role: 'admin', isAdmin: true }
      return await handler(req, res)
    } catch (err) {
      console.error('[requireAdmin] unhandled error:', err)
      if (!res.headersSent) {
        return res.status(500).json({
          error: err?.message || 'Eroare internă neașteptată',
          errorKey: 'errServerInternal',
          where: 'requireAdmin',
          stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
        })
      }
    }
  }
}

export function requireAuthOrAdmin(handler, { editorOnlyForFamily = false } = {}) {
  return async (req, res) => {
    try {
      const adminResult = await validateAdminSession(req)
      if (adminResult.isValid) {
        req.auth = { role: 'admin', isAdmin: true }
        return await handler(req, res)
      }

      const famResult = await validateFamilySession(req)
      if (!famResult.isValid) {
        return res.status(401).json({
          error: famResult.error || 'Neautentificat',
          errorKey: famResult.errorKey || 'errAuthTokenMissing',
          code: 'UNAUTHORIZED'
        })
      }

      if (editorOnlyForFamily && famResult.role !== 'editor') {
        return res.status(403).json({
          error: 'Acces interzis - necesită permisiuni de editor',
          errorKey: 'errEditorRole',
          code: 'FORBIDDEN'
        })
      }

      const requestedFamilyId =
        (req.query && req.query.familyId) ||
        (req.body && req.body.familyId) ||
        null

      if (requestedFamilyId && requestedFamilyId !== famResult.familyId) {
        return res.status(403).json({
          error: 'Acces interzis - familie diferită',
          errorKey: 'errForbiddenOtherFamily',
          code: 'FORBIDDEN'
        })
      }

      req.auth = {
        role: famResult.role,
        familyId: famResult.familyId,
        familyName: famResult.familyName,
        isAdmin: false
      }
      return await handler(req, res)
    } catch (err) {
      console.error('[requireAuthOrAdmin] unhandled error:', err)
      if (!res.headersSent) {
        return res.status(500).json({
          error: err?.message || 'Eroare internă neașteptată',
          errorKey: 'errServerInternal',
          where: 'requireAuthOrAdmin',
          stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
        })
      }
    }
  }
}

export async function verifyFamilyOwnership(familyId, resourceTable, resourceId, resourceField = 'family_id') {
  try {
    const { data, error } = await supabase
      .from(resourceTable)
      .select(resourceField)
      .eq('id', resourceId)
      .single()

    if (error || !data) {
      return { isOwner: false, error: 'Resursa nu există', errorKey: 'errResourceNotFound' }
    }

    if (data[resourceField] !== familyId) {
      return { isOwner: false, error: 'Accesul la această resursă este interzis', errorKey: 'errResourceForbidden' }
    }

    return { isOwner: true }
  } catch (error) {
    console.error('Ownership verification error:', error)
    return { isOwner: false, error: 'Eroare la verificarea proprietății', errorKey: 'errServerInternal' }
  }
}
