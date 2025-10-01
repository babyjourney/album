import { useState, useEffect } from 'react'

const TOAST_TYPES = {
  success: { icon: '✅', classes: 'toast-success' },
  error: { icon: '❌', classes: 'toast-error' },
  info: { icon: 'ℹ️', classes: 'toast-info' },
  warning: { icon: '⚠️', classes: 'toast toast-error' }
}

export default function Toast({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const timer1 = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-remove after duration
    const timer2 = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onRemove(toast.id), 200)
    }, toast.duration || 5000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [toast.id, toast.duration, onRemove])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const toastType = TOAST_TYPES[toast.type] || TOAST_TYPES.info
  
  return (
    <div
      className={`toast ${toastType.classes} ${
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } transform transition-all duration-300 ease-in-out`}
      style={{
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible && !isLeaving ? 1 : 0
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-lg">
          {toastType.icon}
        </div>
        <div className="flex-1">
          {toast.title && (
            <h4 className="body-medium font-semibold text-gray-900 mb-1">
              {toast.title}
            </h4>
          )}
          <p className="body-small text-gray-700">
            {toast.message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}