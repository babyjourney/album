import { useState, useEffect } from 'react'

export default function ProfilePictureModal({
  isOpen,
  onClose,
  childName,
  childImage
}) {
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const profileImage = childImage !== "/api/placeholder/80/80" ?
    childImage :
    `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=3B82F6&color=white&size=200&rounded=true`

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal-glass"
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 'auto',
          height: 'auto',
          padding: '32px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          borderRadius: '28px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: 14, right: 14 }}
          aria-label="Închide"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-section-title" style={{ textAlign: 'center', margin: 0, color: 'var(--ink-1)' }}>
          Poza de profil a lui {childName}
        </h2>

        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '400px',
          maxHeight: '400px'
        }}>
          {!imageLoaded && (
            <div
              className="shimmer"
              style={{
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--glass-2)',
                border: '1px solid var(--glass-hairline)'
              }}
            >
              <span className="text-subtle">Se încarcă...</span>
            </div>
          )}

          <img
            src={profileImage}
            alt={`Poza de profil a lui ${childName}`}
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18), 0 0 0 1px var(--glass-hairline)',
              display: imageLoaded ? 'block' : 'none'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=3B82F6&color=white&size=200&rounded=true`
              setImageLoaded(true)
            }}
          />
        </div>

        <p className="text-subtle" style={{ textAlign: 'center', margin: 0 }}>
          Apăsați ESC sau faceți clic în afară pentru a închide
        </p>
      </div>
    </div>
  )
}
