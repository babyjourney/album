import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { loginWithPin, isAuthenticated } from '../lib/pinAuth'

export default function Login() {
  const [pin, setPin] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('Family Album')
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  const [cooldownTimer, setCooldownTimer] = useState(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    
    // Check if mobile on mount and on resize
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Cooldown timer effect
  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.blockedUntil) {
      const updateTimer = () => {
        const now = Date.now()
        const timeRemaining = rateLimitInfo.blockedUntil - now
        
        if (timeRemaining <= 0) {
          setRateLimitInfo(null)
          setCooldownTimer(null)
          setError('')
        } else {
          setCooldownTimer(formatTimeRemaining(timeRemaining))
        }
      }
      
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      
      return () => clearInterval(interval)
    }
  }, [rateLimitInfo])

  // Format time remaining for display
  const formatTimeRemaining = (milliseconds) => {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000))
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const checkUser = () => {
    if (isAuthenticated()) {
      router.push('/dashboard')
    }
  }

  const handlePinLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!phoneNumber) {
      setError('Vă rugăm să introduceți numărul de telefon')
      setLoading(false)
      return
    }

    if (!pin) {
      setError('Vă rugăm să introduceți PIN-ul')
      setLoading(false)
      return
    }

    const result = await loginWithPin(pin, phoneNumber)

    if (result.success) {
      // Clear any rate limiting info on success
      setRateLimitInfo(null)
      setCooldownTimer(null)
      setError('')
      
      // Fetch album title for the family
      if (result.user?.familyId) {
        try {
          const titleResponse = await fetch(`/api/album-settings/get-title?familyId=${result.user.familyId}`)
          const titleResult = await titleResponse.json()
          
          if (titleResponse.ok) {
            setAlbumTitle(titleResult.title)
          }
        } catch (error) {
          console.error('Error fetching album title:', error)
        }
      }
      router.push('/dashboard')
    } else {
      // Handle rate limiting and errors
      if (result.rateLimited) {
        setRateLimitInfo({
          level: result.level,
          blockedUntil: result.blockedUntil,
          timeRemaining: result.timeRemaining
        })
      } else {
        setRateLimitInfo(null)
        setCooldownTimer(null)
      }
      
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 15s ease infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)',
        animation: 'float 20s ease-in-out infinite'
      }} />
      
      {/* Glass morphism container */}
      <div style={{
        maxWidth: '420px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        margin: '0 auto'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: isMobile ? '24px' : '32px',
          padding: isMobile ? '32px 24px' : '48px 40px',
          boxShadow: '0 40px 80px rgba(0, 0, 0, 0.1), 0 20px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'slideUp 0.8s ease-out',
          margin: isMobile ? '16px' : '20px'
        }}>
          {/* Header with modern icon and typography */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: isMobile ? '24px' : '40px' 
          }}>
            <div style={{
              width: isMobile ? '64px' : '80px',
              height: isMobile ? '64px' : '80px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: isMobile ? '18px' : '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: isMobile ? '0 auto 16px' : '0 auto 24px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <svg 
                width={isMobile ? "32" : "40"} 
                height={isMobile ? "32" : "40"} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2"
              >
                <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            
            <h1 style={{
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: isMobile ? '6px' : '8px',
              letterSpacing: isMobile ? '-0.25px' : '-0.5px',
              lineHeight: '1.2'
            }}>
              {albumTitle}
            </h1>
            
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: '#6B7280',
              fontWeight: '400',
              lineHeight: '1.5',
              padding: isMobile ? '0 8px' : '0',
              margin: 0
            }}>
              {isMobile 
                ? "Enter your PIN to access memories" 
                : "Welcome back! Enter your PIN to access your precious memories"
              }
            </p>
          </div>

          <form onSubmit={handlePinLogin} style={{ marginBottom: '32px' }} autoComplete="on">
            {/* Hidden username field for password managers */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="family-album-user"
              readOnly
              style={{ 
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                pointerEvents: 'none'
              }}
              tabIndex="-1"
            />
            
            {/* Phone Number input */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="phone" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Numărul de Telefon
              </label>
              
              <div style={{ position: 'relative' }}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px 20px' : '18px 24px',
                    fontSize: isMobile ? '16px' : '18px',
                    background: 'rgba(249, 250, 251, 0.8)',
                    border: '2px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: isMobile ? '12px' : '16px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                  }}
                  placeholder="061234567"
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea'
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(229, 231, 235, 0.5)'
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                    e.target.style.background = 'rgba(249, 250, 251, 0.8)'
                  }}
                />
              </div>
            </div>

            {/* Modern PIN input */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="pin" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Family PIN
              </label>
              
              <div style={{ position: 'relative' }}>
                <input
                  id="pin"
                  name="password"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px 20px' : '20px 24px',
                    fontSize: isMobile ? '20px' : '24px',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    textAlign: 'center',
                    letterSpacing: isMobile ? '4px' : '6px',
                    background: 'rgba(249, 250, 251, 0.8)',
                    border: '2px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: isMobile ? '12px' : '16px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                  }}
                  placeholder="••••"
                  maxLength="8"
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea'
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(229, 231, 235, 0.5)'
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                    e.target.style.background = 'rgba(249, 250, 251, 0.8)'
                  }}
                />
              </div>
              
              {/* Access levels */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(249, 250, 251, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(229, 231, 235, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10B981'
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      Telefon + 4 cifre - Viewer
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: '#6B7280'
                  }}>
                    View & browse
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#8B5CF6'
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      Telefon + 8 cifre - Editor
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: '#6B7280'
                  }}>
                    Full access
                  </span>
                </div>
              </div>
            </div>

            {/* Rate Limiting Alert */}
            {rateLimitInfo && cooldownTimer && (
              <div style={{
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
                animation: 'shake 0.5s ease-in-out'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{
                    fontSize: '14px',
                    color: '#D97706',
                    fontWeight: '600'
                  }}>
                    {rateLimitInfo.level === 1 ? 'Cooldown 10 minute' : 'Cooldown 24 ore'}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#92400E',
                  marginLeft: '24px'
                }}>
                  Timp rămas: <strong>{cooldownTimer}</strong>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#A16207',
                  marginLeft: '24px',
                  marginTop: '4px'
                }}>
                  {rateLimitInfo.level === 1 
                    ? 'După 10 minute veți avea încă 3 încercări'
                    : 'Restricție de 24 ore activă din cauza încercărilor multiple'
                  }
                </div>
              </div>
            )}

            {/* Regular Error Alert */}
            {error && !rateLimitInfo && (
              <div style={{
                padding: '16px',
                background: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
                animation: 'shake 0.5s ease-in-out'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span style={{
                    fontSize: '14px',
                    color: '#DC2626',
                    fontWeight: '500'
                  }}>
                    {error}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (rateLimitInfo && cooldownTimer)}
              style={{
                width: '100%',
                padding: isMobile ? '16px 20px' : '18px 24px',
                background: (loading || (rateLimitInfo && cooldownTimer))
                  ? 'rgba(156, 163, 175, 0.5)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '12px' : '16px',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: loading 
                  ? 'none' 
                  : '0 10px 30px rgba(102, 126, 234, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4), 0 8px 16px -1px rgba(0, 0, 0, 0.1)'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Opening Album...
                </div>
              ) : (rateLimitInfo && cooldownTimer) ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  Blocat ({cooldownTimer})
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" x2="3" y1="12" y2="12"/>
                  </svg>
                  Enter Album
                </div>
              )}
            </button>
          </form>

          {/* Footer text */}
          <div style={{
            textAlign: 'center',
            padding: '20px 0',
            borderTop: '1px solid rgba(229, 231, 235, 0.3)'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#9CA3AF',
              margin: 0
            }}>
              Your memories are safely protected
            </p>
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}