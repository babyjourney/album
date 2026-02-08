import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { loginAdmin, isAdminAuthenticated } from '../../lib/adminAuth'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.push('/admin/dashboard')
    }
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!username || !password) {
      setError('Completați toate câmpurile')
      setLoading(false)
      return
    }

    const result = await loginAdmin(username, password)

    if (result.success) {
      router.push('/admin/dashboard')
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    }}>
      {/* Left — Form */}
      <div style={{
        flex: isMobile ? '1' : '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px' : '60px 64px',
        backgroundColor: '#0b0f1a',
        minHeight: '100vh'
      }}>
        <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#f1f5f9',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            Admin Panel
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#64748b',
            margin: '0 0 36px 0',
            lineHeight: '1.5'
          }}>
            Conectați-vă pentru a accesa panoul de administrare
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="username" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#94a3b8',
                marginBottom: '8px',
                letterSpacing: '0.3px'
              }}>
                USERNAME
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Introduceți username-ul"
                required
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '15px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = 'rgba(59,130,246,0.06)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1e293b'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.04)'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#94a3b8',
                marginBottom: '8px',
                letterSpacing: '0.3px'
              }}>
                PAROLA
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduceți parola"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '15px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = 'rgba(59,130,246,0.06)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1e293b'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.04)'
                }}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '10px',
                color: '#f87171',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, transform 0.1s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => { if (!loading) e.target.style.backgroundColor = '#2563eb' }}
              onMouseOut={(e) => { if (!loading) e.target.style.backgroundColor = '#3b82f6' }}
              onMouseDown={(e) => { if (!loading) e.target.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { if (!loading) e.target.style.transform = 'scale(1)' }}
            >
              {loading ? 'Se conectează...' : 'Conectare'}
            </button>
          </form>

          <div style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e'
            }} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Sistem securizat — doar administratori autorizați
            </span>
          </div>
        </div>
      </div>

      {/* Right — Visual Panel */}
      {!isMobile && (
        <div style={{
          flex: 1,
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            top: '15%',
            right: '-10%'
          }} />
          <div style={{
            position: 'absolute',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            bottom: '10%',
            left: '-5%'
          }} />
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.08)',
            top: '20%',
            left: '15%'
          }} />
          <div style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.06)',
            bottom: '25%',
            right: '20%'
          }} />

          {/* Grid pattern hint */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(rgba(59,130,246,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.8
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '420px' }}>
            {/* Icon cluster */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '40px'
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
              </div>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>

            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f1f5f9',
              margin: '0 0 12px 0',
              letterSpacing: '-0.5px',
              lineHeight: '1.2'
            }}>
              Dashboard<br />Administrativ
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              margin: 0,
              lineHeight: '1.6'
            }}>
              Monitorizare familii, gestionare albume și<br />
              vizualizare statistici în timp real
            </p>

            {/* Stats preview */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              marginTop: '48px'
            }}>
              {[
                { label: 'Familii', icon: 'users' },
                { label: 'Fotografii', icon: 'images' },
                { label: 'Activitate', icon: 'activity' }
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(59,130,246,0.06)',
                    border: '1px solid rgba(59,130,246,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b', letterSpacing: '0.5px' }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
