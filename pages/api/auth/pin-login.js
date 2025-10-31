import { supabase } from '../../../lib/supabaseClient'
import rateLimiter from '../../../lib/rateLimiter'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { pin, phoneNumber } = req.body

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu' })
  }

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Numărul de telefon este obligatoriu' })
  }

  // Remove any spaces and validate formats first
  const cleanPin = pin.toString().replace(/\s/g, '')
  const cleanPhone = phoneNumber.toString().replace(/\s/g, '')

  // Get client identifier for rate limiting (include phone number for better tracking)
  const clientId = rateLimiter.getClientId(req, cleanPhone)
  
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
  
  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre' })
  }

  // Validate phone number format (Romanian format: 068327082 or 68327082)
  const phoneRegex = /^(0)?[67][0-9]{7}$/
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid (format: 061234567 sau 61234567)' })
  }

  try {
    let family = null
    let role = null

    // Check if it's a 4-digit viewer PIN with matching phone number
    if (cleanPin.length === 4) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, phone_number, viewer_pin')
        .eq('viewer_pin', cleanPin)
        .eq('phone_number', cleanPhone)
        .single()

      if (!error && data) {
        family = data
        role = 'viewer'
      }
    }

    // Check if it's an 8-digit editor PIN with matching phone number
    if (cleanPin.length === 8 && !family) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, phone_number, editor_pin')
        .eq('editor_pin', cleanPin)
        .eq('phone_number', cleanPhone)
        .single()

      if (!error && data) {
        family = data
        role = 'editor'
      }
    }

    // If no family found with this PIN
    if (!family) {
      // Record failed attempt for rate limiting (include phone number for analysis)
      const attemptResult = rateLimiter.recordFailedAttempt(clientId, cleanPin, cleanPhone)
      
      let errorMessage = 'Numărul de telefon sau PIN-ul sunt incorecte'
      if (attemptResult.blocked) {
        const timeRemaining = rateLimiter.formatTimeRemaining(attemptResult.timeRemaining)
        const level = attemptResult.level === 1 ? '10 minute' : '24 hour'
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. ${level} cooldown activat din cauza prea multor încercări.`
      } else if (attemptResult.attemptsRemaining <= 2) {
        errorMessage = `Numărul de telefon sau PIN-ul sunt incorecte. Mai aveți ${attemptResult.attemptsRemaining} încercări înainte de cooldown.`
      }
      
      // Get security analysis for logging
      const securityAnalysis = rateLimiter.getSecurityAnalysis(clientId)
      if (securityAnalysis?.isLikelyBruteForce) {
        console.warn(`🚨 Possible brute force attack detected from ${clientId.substring(0, 20)}... - ${securityAnalysis.uniquePins} unique PINs, ${securityAnalysis.uniquePhoneNumbers} unique phones tried`)
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