// Rate limiting system for PIN authentication
// Implements progressive cooldown: 3 attempts -> 10min cooldown -> 3 more attempts -> 24h cooldown

class RateLimiter {
  constructor() {
    // In-memory store for rate limiting (in production, use Redis or database)
    this.attempts = new Map() // key: IP_address, value: attempt data
    this.blockedIPs = new Map() // key: IP_address, value: block data
    
    // Configuration
    this.config = {
      maxAttemptsLevel1: 3,        // First level: 3 attempts
      cooldownLevel1: 10 * 60 * 1000,   // 10 minutes in milliseconds
      maxAttemptsLevel2: 6,        // Total attempts before 24h ban (3 + 3)
      cooldownLevel2: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
      cleanupInterval: 60 * 60 * 1000     // Clean up old entries every hour
    }
    
    // Start cleanup timer
    this.startCleanup()
  }

  // Get client identifier (IP + User-Agent for better tracking)
  getClientId(req, phoneNumber = null) {
    const ip = this.getClientIP(req)
    const userAgent = req.headers['user-agent'] || 'unknown'
    const baseId = `${ip}_${Buffer.from(userAgent).toString('base64').slice(0, 20)}`
    
    // If phone number is provided, include it in tracking for more precise rate limiting
    if (phoneNumber) {
      const phoneHash = Buffer.from(phoneNumber).toString('base64').slice(0, 10)
      return `${baseId}_${phoneHash}`
    }
    
    return baseId
  }

  // Extract real client IP
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           '127.0.0.1'
  }

  // Check if client is currently blocked
  isBlocked(clientId) {
    const blockData = this.blockedIPs.get(clientId)
    
    if (!blockData) return { blocked: false }
    
    const now = Date.now()
    const timeRemaining = blockData.blockedUntil - now
    
    if (timeRemaining <= 0) {
      // Block expired, remove it
      this.blockedIPs.delete(clientId)
      return { blocked: false }
    }
    
    return {
      blocked: true,
      timeRemaining,
      level: blockData.level,
      blockedUntil: blockData.blockedUntil
    }
  }

  // Record a failed attempt
  recordFailedAttempt(clientId, pin = null, phoneNumber = null) {
    const now = Date.now()
    const attemptData = this.attempts.get(clientId) || {
      count: 0,
      firstAttempt: now,
      lastAttempt: now,
      pins: new Set(), // Track different PINs to detect brute force
      phoneNumbers: new Set() // Track different phone numbers
    }

    // Add PIN to tracking (for security analysis)
    if (pin) {
      attemptData.pins.add(pin)
    }

    // Add phone number to tracking (for security analysis)
    if (phoneNumber) {
      attemptData.phoneNumbers.add(phoneNumber)
    }

    attemptData.count++
    attemptData.lastAttempt = now

    this.attempts.set(clientId, attemptData)

    // Check if we need to apply cooldowns
    if (attemptData.count >= this.config.maxAttemptsLevel2) {
      // 24-hour ban after 6 total attempts
      this.blockedIPs.set(clientId, {
        level: 2,
        blockedUntil: now + this.config.cooldownLevel2,
        attempts: attemptData.count,
        firstViolation: attemptData.firstAttempt
      })
      
      // Clear attempts since they're now in long-term block
      this.attempts.delete(clientId)
      
      return {
        blocked: true,
        level: 2,
        cooldownTime: this.config.cooldownLevel2,
        timeRemaining: this.config.cooldownLevel2,
        message: '24 hour cooldown activated'
      }
      
    } else if (attemptData.count >= this.config.maxAttemptsLevel1) {
      // 10-minute ban after 3 attempts
      this.blockedIPs.set(clientId, {
        level: 1,
        blockedUntil: now + this.config.cooldownLevel1,
        attempts: attemptData.count,
        firstViolation: attemptData.firstAttempt
      })
      
      return {
        blocked: true,
        level: 1,
        cooldownTime: this.config.cooldownLevel1,
        timeRemaining: this.config.cooldownLevel1,
        message: '10 minute cooldown activated'
      }
    }

    return {
      blocked: false,
      attemptsRemaining: this.config.maxAttemptsLevel1 - attemptData.count,
      totalAttempts: attemptData.count
    }
  }

  // Record a successful attempt (clears restrictions)
  recordSuccessfulAttempt(clientId) {
    this.attempts.delete(clientId)
    this.blockedIPs.delete(clientId)
  }

  // Get current attempt status
  getAttemptStatus(clientId) {
    // Check if blocked first
    const blockStatus = this.isBlocked(clientId)
    if (blockStatus.blocked) {
      return blockStatus
    }

    const attemptData = this.attempts.get(clientId)
    if (!attemptData) {
      return {
        blocked: false,
        attemptsRemaining: this.config.maxAttemptsLevel1,
        totalAttempts: 0
      }
    }

    return {
      blocked: false,
      attemptsRemaining: this.config.maxAttemptsLevel1 - attemptData.count,
      totalAttempts: attemptData.count,
      firstAttempt: attemptData.firstAttempt,
      lastAttempt: attemptData.lastAttempt
    }
  }

  // Format time remaining for user display
  formatTimeRemaining(milliseconds) {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000))
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Security analysis - detect patterns
  getSecurityAnalysis(clientId) {
    const attemptData = this.attempts.get(clientId)
    const blockData = this.blockedIPs.get(clientId)
    
    if (!attemptData && !blockData) return null

    return {
      uniquePins: attemptData?.pins.size || 0,
      uniquePhoneNumbers: attemptData?.phoneNumbers.size || 0,
      totalAttempts: attemptData?.count || blockData?.attempts || 0,
      timeSpan: attemptData ? attemptData.lastAttempt - attemptData.firstAttempt : null,
      isLikelyBruteForce: attemptData ? (attemptData.pins.size > 5 || attemptData.phoneNumbers.size > 3) : false,
      clientId: clientId.substring(0, 20) + '...' // Partial for logs
    }
  }

  // Cleanup old entries
  startCleanup() {
    setInterval(() => {
      const now = Date.now()
      const oldestAllowed = now - (2 * this.config.cooldownLevel2) // Keep data for 48h max

      // Clean up old attempts
      for (const [clientId, data] of this.attempts.entries()) {
        if (data.firstAttempt < oldestAllowed) {
          this.attempts.delete(clientId)
        }
      }

      // Clean up expired blocks
      for (const [clientId, data] of this.blockedIPs.entries()) {
        if (data.blockedUntil < now) {
          this.blockedIPs.delete(clientId)
        }
      }
    }, this.config.cleanupInterval)
  }

  // Get statistics (for monitoring)
  getStats() {
    return {
      activeAttempts: this.attempts.size,
      blockedIPs: this.blockedIPs.size,
      level1Blocks: Array.from(this.blockedIPs.values()).filter(b => b.level === 1).length,
      level2Blocks: Array.from(this.blockedIPs.values()).filter(b => b.level === 2).length
    }
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter()
export default rateLimiter