import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Right-edge slide-in glass drawer (or bottom sheet on mobile).
// Renders into document.body via portal so it escapes any parent containing block.
export default function SideSheet({
  isOpen,
  onClose,
  children,
  width = 480,
  side = 'right',
  zIndex = 200,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (typeof window === 'undefined') return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const sheetTransformClosed = isMobile
    ? 'translateY(100%)'
    : side === 'right' ? 'translateX(100%)' : 'translateX(-100%)'

  const tree = (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,15,30,0.32)',
          backdropFilter: isOpen ? 'blur(14px) saturate(140%)' : 'blur(0)',
          WebkitBackdropFilter: isOpen ? 'blur(14px) saturate(140%)' : 'blur(0)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 320ms cubic-bezier(0.22,1,0.36,1), backdrop-filter 320ms',
          zIndex,
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          [side]: 0,
          ...(isMobile
            ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '92vh' }
            : { top: 0, bottom: 0, width }),
          zIndex: zIndex + 1,
          background: 'var(--glass-3)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderLeft: !isMobile && side === 'right' ? '1px solid var(--glass-hairline-strong)' : 'none',
          borderRight: !isMobile && side === 'left' ? '1px solid var(--glass-hairline-strong)' : 'none',
          borderTop: isMobile ? '1px solid var(--glass-hairline-strong)' : 'none',
          borderTopLeftRadius: isMobile ? 28 : 0,
          borderTopRightRadius: isMobile ? 28 : 0,
          boxShadow:
            '-32px 0 80px -16px rgba(0,0,0,0.30),' +
            ' inset 0 1px 0 0 var(--glass-hairline-strong)',
          transform: isOpen ? 'translate(0,0)' : sheetTransformClosed,
          transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {isMobile && (
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
          }}>
            <div style={{
              width: 42, height: 5, borderRadius: 999,
              background: 'var(--glass-hairline-strong)',
            }} />
          </div>
        )}
        {children}
      </div>
    </>
  )

  return createPortal(tree, document.body)
}
