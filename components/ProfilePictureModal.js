import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

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
    <div className="modal-overlay">
      {/* Background click to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.15s ease-in-out',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = 'white'
          e.target.style.color = '#DC2626'
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
          e.target.style.color = 'var(--text-primary)'
        }}
      >
        <X size={20} />
      </button>

      {/* Modal content */}
      <div 
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 'auto',
          height: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-section-title" style={{ textAlign: 'center' }}>
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
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}>
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
              boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
              display: imageLoaded ? 'block' : 'none'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=3B82F6&color=white&size=200&rounded=true`
              setImageLoaded(true)
            }}
          />
        </div>

        <p className="text-subtle" style={{ textAlign: 'center' }}>
          Apăsați ESC sau faceți clic în afară pentru a închide
        </p>
      </div>
    </div>
  )
}