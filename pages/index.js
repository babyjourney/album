import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { isAuthenticated } from '../lib/pinAuth'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    
    // Check if mobile on mount and on resize
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const checkUser = () => {
    if (isAuthenticated()) {
      router.push('/dashboard')
    } else {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(255, 255, 255, 0.2)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 15s ease infinite',
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
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)',
        animation: 'float 20s ease-in-out infinite'
      }} />
      
      {/* Navigation */}
      <nav style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: isMobile ? '20px' : '32px 40px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <svg width={isMobile ? "20" : "24"} height={isMobile ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            
            <div style={{
              fontSize: isMobile ? '18px' : '24px',
              fontWeight: '700',
              color: 'white',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              Family Album
            </div>
          </div>
          
          <Link href="/login">
            <div style={{
              padding: isMobile ? '8px 16px' : '12px 24px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: '50px',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              e.target.style.transform = 'translateY(0)'
            }}>
              Sign In
            </div>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: isMobile ? '120px 20px 60px' : '160px 40px 80px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* Main heading */}
          <h1 style={{
            fontSize: isMobile ? '36px' : '64px',
            fontWeight: '800',
            color: 'white',
            marginBottom: isMobile ? '16px' : '24px',
            lineHeight: '1.1',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            letterSpacing: '-0.5px'
          }}>
            Your Family's
            <br />
            <span style={{
              background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Digital Memory
            </span>
            <br />
            Collection
          </h1>
          
          {/* Subtitle */}
          <p style={{
            fontSize: isMobile ? '18px' : '24px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: isMobile ? '32px' : '48px',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            fontWeight: '400'
          }}>
            Create your private family photo album and track precious moments.<br />
            Every family deserves their own secure, beautiful space.
          </p>
          
          {/* CTA Button */}
          <Link href="/login">
            <div style={{
              display: 'inline-block',
              padding: isMobile ? '18px 32px' : '24px 48px',
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#4338ca',
              borderRadius: '50px',
              fontSize: isMobile ? '16px' : '20px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1)',
              textDecoration: 'none',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              letterSpacing: '0.5px',
              position: 'relative',
              overflow: 'hidden',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-4px) scale(1.05)'
              e.target.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.3), 0 12px 24px rgba(0, 0, 0, 0.15)'
              e.target.style.background = 'white'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)'
              e.target.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1)'
              e.target.style.background = 'rgba(255, 255, 255, 0.95)'
            }}>
              Enter Your Family Album
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            </div>
          </Link>
          
          {/* Subtitle under button */}
          <p style={{
            fontSize: isMobile ? '14px' : '16px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '16px',
            fontWeight: '500',
            textShadow: '0 1px 5px rgba(0, 0, 0, 0.3)'
          }}>
            Use your 4-digit PIN to view, or 8-digit PIN for full access
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: isMobile ? '40px 20px' : '60px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? '24px' : '32px'
        }}>
          {/* Feature 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? '32px 24px' : '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px'
            }}>
              📸
            </div>
            <h3 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '12px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              Private Photo Storage
            </h3>
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5',
              textShadow: '0 1px 5px rgba(0, 0, 0, 0.3)'
            }}>
              Upload and organize your family photos in complete privacy and security
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? '32px 24px' : '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px'
            }}>
              🎯
            </div>
            <h3 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '12px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              Skills Tracking
            </h3>
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5',
              textShadow: '0 1px 5px rgba(0, 0, 0, 0.3)'
            }}>
              Monitor and celebrate progress on important life skills and milestones
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? '32px 24px' : '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px'
            }}>
              🔒
            </div>
            <h3 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '12px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              Family Security
            </h3>
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5',
              textShadow: '0 1px 5px rgba(0, 0, 0, 0.3)'
            }}>
              Each family's data is completely isolated with PIN-based access control
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: isMobile ? '40px 20px 20px' : '60px 40px 32px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '40px'
      }}>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: 'rgba(255, 255, 255, 0.6)',
          margin: 0,
          textShadow: '0 1px 5px rgba(0, 0, 0, 0.3)'
        }}>
          Your memories are safe, secure, and beautifully organized
        </p>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}