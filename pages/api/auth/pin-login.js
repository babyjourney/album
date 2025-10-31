import { supabase } from '../../../lib/supabaseClient'
import rateLimiter from '../../../lib/rateLimiter'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { pin } = req.body

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu' })
  }

  // Get client identifier for rate limiting
  const clientId = rateLimiter.getClientId(req)
  
  // Check if client is currently blocked
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    const timeRemaining = rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)
    const level = blockStatus.level === 1 ? '10 minute' : '24 hour'
    
    return res.status(429).json({ 
      error: `Prea multe încercări. ${level} cooldown activ.`,
      rateLimited: true,
      level: blockStatus.level,
      timeRemaining: timeRemaining,
      blockedUntil: blockStatus.blockedUntil
    })
  }

  // Remove any spaces and validate PIN format
  const cleanPin = pin.toString().replace(/\s/g, '')
  
  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre' })
  }

  try {
    let family = null
    let role = null

    // Check if it's a 4-digit viewer PIN
    if (cleanPin.length === 4) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, viewer_pin')
        .eq('viewer_pin', cleanPin)
        .single()

      if (!error && data) {
        family = data
        role = 'viewer'
      }
    }

    // Check if it's an 8-digit editor PIN
    if (cleanPin.length === 8 && !family) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, editor_pin')
        .eq('editor_pin', cleanPin)
        .single()

      if (!error && data) {
        family = data
        role = 'editor'
      }
    }

    // If no family found with this PIN
    if (!family) {
      // Record failed attempt for rate limiting
      const attemptResult = rateLimiter.recordFailedAttempt(clientId, cleanPin)
      
      let errorMessage = 'PIN invalid'
      if (attemptResult.blocked) {
        const timeRemaining = rateLimiter.formatTimeRemaining(attemptResult.timeRemaining)
        const level = attemptResult.level === 1 ? '10 minute' : '24 hour'
        errorMessage = `PIN invalid. ${level} cooldown activat din cauza prea multor încercări.`
      } else if (attemptResult.attemptsRemaining <= 2) {
        errorMessage = `PIN invalid. Mai aveți ${attemptResult.attemptsRemaining} încercări înainte de cooldown.`
      }
      
      // Get security analysis for logging
      const securityAnalysis = rateLimiter.getSecurityAnalysis(clientId)
      if (securityAnalysis?.isLikelyBruteForce) {
        console.warn(`🚨 Possible brute force attack detected from ${clientId.substring(0, 20)}... - ${securityAnalysis.uniquePins} unique PINs tried`)
      }
      
      return res.status(401).json({ 
        error: errorMessage,
        rateLimited: attemptResult.blocked || false,
        level: attemptResult.level || null,
        attemptsRemaining: attemptResult.attemptsRemaining || 0
      })
    }

    // Success! Clear any rate limiting for this client
    rateLimiter.recordSuccessfulAttempt(clientId)

    // Return success with family info and role
    return res.status(200).json({
      success: true,
      family: {
        id: family.id,
        name: family.name
      },
      role,
      message: `Conectat ca ${role === 'viewer' ? 'vizualizator' : 'editor'} pentru ${family.name}`,
      user: {
        familyId: family.id,
        familyName: family.name,
        role: role
      }
    })

  } catch (error) {
    console.error('PIN login error:', error)
    return res.status(500).json({ error: 'Eroare internă a serverului' })
  }
}