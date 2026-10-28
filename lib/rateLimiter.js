import crypto from 'crypto'

const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

class RateLimiter {
  constructor() {
    this.attempts = new Map()
    this.blockedIPs = new Map()
    this.windows = new Map()
    
    this.config = {
      maxAttemptsLevel1: 5,
      cooldownLevel1: 10 * 60 * 1000,
      maxAttemptsLevel2: 10,
      cooldownLevel2: 24 * 60 * 60 * 1000,
      cleanupInterval: 60 * 60 * 1000
    }
    
    this.startCleanup()
  }

  hashContact(contact) {
    return crypto
      .createHash('sha256')
      .update(String(contact ?? '').trim().toLowerCase())
      .digest('hex')
  }

  getClientId(req, contact = null) {
    const ip = this.getClientIP(req)
    const userAgent = req.headers['user-agent'] || 'unknown'
    const baseId = `${ip}_${Buffer.from(userAgent).toString('base64').slice(0, 20)}`

    if (contact) {
      return `${baseId}_${this.hashContact(contact)}`
    }

    return baseId
  }

  getClientIP(req) {
    return String(
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    ).trim()
  }

  byIp(scope, req, limit, windowMs) {
    return { key: `${scope}:ip:${this.getClientIP(req)}`, limit, windowMs }
  }

  byContact(scope, contact, limit, windowMs) {
    return { key: `${scope}:contact:${this.hashContact(contact)}`, limit, windowMs }
  }

  liveHits(key, windowMs, now) {
    const entry = this.windows.get(key)
    return entry ? entry.hits.filter((t) => now - t < windowMs) : []
  }

  check(buckets) {
    const now = Date.now()
    let retryAfterMs = 0
    for (const { key, limit, windowMs } of buckets) {
      const hits = this.liveHits(key, windowMs, now)
      if (hits.length >= limit) {
        retryAfterMs = Math.max(retryAfterMs, hits[hits.length - limit] + windowMs - now)
      }
    }
    return retryAfterMs > 0
      ? { allowed: false, retryAfterMs: Math.max(1000, retryAfterMs) }
      : { allowed: true }
  }

  record(buckets, at = Date.now()) {
    for (const { key, windowMs } of buckets) {
      const hits = this.liveHits(key, windowMs, at)
      hits.push(at)
      this.windows.set(key, { hits, windowMs })
    }
    return at
  }

  take(buckets) {
    const status = this.check(buckets)
    if (status.allowed) return { ...status, at: this.record(buckets) }
    return status
  }

  release(buckets, at) {
    if (!at) return
    for (const { key } of buckets) {
      const entry = this.windows.get(key)
      if (!entry) continue
      const i = entry.hits.lastIndexOf(at)
      if (i !== -1) entry.hits.splice(i, 1)
    }
  }

  forget(buckets) {
    for (const { key } of buckets) this.windows.delete(key)
  }

  forgetContact(contact) {
    const suffix = `_${this.hashContact(contact)}`
    for (const id of [...this.attempts.keys()]) {
      if (id.endsWith(suffix)) this.attempts.delete(id)
    }
    for (const id of [...this.blockedIPs.keys()]) {
      if (id.endsWith(suffix)) this.blockedIPs.delete(id)
    }
  }

  tooManyBody(retryAfterMs) {
    return {
      error: `Prea multe încercări. Încearcă din nou peste ${this.formatTimeRemaining(retryAfterMs)}.`,
      errorKey: 'errRateLimitedRetryIn',
      rateLimited: true,
      retryAfterMs,
      blockedUntil: Date.now() + retryAfterMs,
    }
  }

  isBlocked(clientId) {
    const blockData = this.blockedIPs.get(clientId)
    
    if (!blockData) return { blocked: false }
    
    const now = Date.now()
    const timeRemaining = blockData.blockedUntil - now
    
    if (timeRemaining <= 0) {
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

  recordFailedAttempt(clientId, pin = null, phoneNumber = null) {
    const now = Date.now()
    const previous = this.attempts.get(clientId)
    const attemptData = previous && now - previous.lastAttempt < this.config.cooldownLevel2 ? previous : {
      count: 0,
      total: 0,
      firstAttempt: now,
      lastAttempt: now,
      pins: new Set(),
      phoneNumbers: new Set()
    }

    if (pin) {
      attemptData.pins.add(pin)
    }

    if (phoneNumber) {
      attemptData.phoneNumbers.add(phoneNumber)
    }

    attemptData.count++
    attemptData.total = (attemptData.total || 0) + 1
    attemptData.lastAttempt = now

    this.attempts.set(clientId, attemptData)

    if (attemptData.total >= this.config.maxAttemptsLevel2) {
      this.blockedIPs.set(clientId, {
        level: 2,
        blockedUntil: now + this.config.cooldownLevel2,
        attempts: attemptData.total,
        firstViolation: attemptData.firstAttempt
      })
      
      this.attempts.delete(clientId)
      
      return {
        blocked: true,
        level: 2,
        cooldownTime: this.config.cooldownLevel2,
        timeRemaining: this.config.cooldownLevel2,
        blockedUntil: now + this.config.cooldownLevel2,
        message: '24 hour cooldown activated'
      }
      
    } else if (attemptData.count >= this.config.maxAttemptsLevel1) {
      this.blockedIPs.set(clientId, {
        level: 1,
        blockedUntil: now + this.config.cooldownLevel1,
        attempts: attemptData.total,
        firstViolation: attemptData.firstAttempt
      })
      attemptData.count = 0

      return {
        blocked: true,
        level: 1,
        cooldownTime: this.config.cooldownLevel1,
        timeRemaining: this.config.cooldownLevel1,
        blockedUntil: now + this.config.cooldownLevel1,
        message: '10 minute cooldown activated'
      }
    }

    return {
      blocked: false,
      attemptsRemaining: this.attemptsRemaining(attemptData),
      totalAttempts: attemptData.total
    }
  }

  attemptsRemaining(attemptData) {
    return Math.min(
      this.config.maxAttemptsLevel1 - attemptData.count,
      this.config.maxAttemptsLevel2 - (attemptData.total || 0)
    )
  }

  recordSuccessfulAttempt(clientId) {
    this.attempts.delete(clientId)
    this.blockedIPs.delete(clientId)
  }

  getAttemptStatus(clientId) {
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
      attemptsRemaining: this.attemptsRemaining(attemptData),
      totalAttempts: attemptData.total || 0,
      firstAttempt: attemptData.firstAttempt,
      lastAttempt: attemptData.lastAttempt
    }
  }

  formatTimeRemaining(milliseconds, locale = 'ro-RO') {
    const seconds = Math.max(1, Math.ceil(milliseconds / 1000))
    const [value, unit] = seconds >= 3600
      ? [Math.ceil(seconds / 3600), 'hour']
      : seconds >= 60
        ? [Math.ceil(seconds / 60), 'minute']
        : [seconds, 'second']
    try {
      return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
    } catch {
      return `${value} ${unit}`
    }
  }

  getSecurityAnalysis(clientId) {
    const attemptData = this.attempts.get(clientId)
    const blockData = this.blockedIPs.get(clientId)
    
    if (!attemptData && !blockData) return null

    return {
      uniquePins: attemptData?.pins.size || 0,
      uniquePhoneNumbers: attemptData?.phoneNumbers.size || 0,
      totalAttempts: attemptData?.total || blockData?.attempts || 0,
      timeSpan: attemptData ? attemptData.lastAttempt - attemptData.firstAttempt : null,
      isLikelyBruteForce: attemptData ? (attemptData.pins.size > 5 || attemptData.phoneNumbers.size > 3) : false,
      clientId: clientId.substring(0, 20) + '...'
    }
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now()
      const oldestAllowed = now - (2 * this.config.cooldownLevel2)

      for (const [clientId, data] of this.attempts.entries()) {
        if (data.firstAttempt < oldestAllowed) {
          this.attempts.delete(clientId)
        }
      }

      for (const [clientId, data] of this.blockedIPs.entries()) {
        if (data.blockedUntil < now) {
          this.blockedIPs.delete(clientId)
        }
      }

      for (const [key, entry] of this.windows.entries()) {
        if (!entry.hits.some((t) => now - t < entry.windowMs)) {
          this.windows.delete(key)
        }
      }
    }, this.config.cleanupInterval)
  }

  getStats() {
    return {
      activeAttempts: this.attempts.size,
      blockedIPs: this.blockedIPs.size,
      windows: this.windows.size,
      level1Blocks: Array.from(this.blockedIPs.values()).filter(b => b.level === 1).length,
      level2Blocks: Array.from(this.blockedIPs.values()).filter(b => b.level === 2).length
    }
  }
}

const rateLimiter = new RateLimiter()
export default rateLimiter