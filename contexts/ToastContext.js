import { createContext, useContext, useState } from 'react'
import Toast from '../components/Toast'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = ({ type, title, message, duration = 5000 }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast = { id, type, title, message, duration }
    
    setToasts(prev => [...prev, toast])
    
    return id
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (message, title = 'Success') => {
    return addToast({ type: 'success', title, message })
  }

  const showError = (message, title = 'Error') => {
    return addToast({ type: 'error', title, message })
  }

  const showInfo = (message, title = 'Info') => {
    return addToast({ type: 'info', title, message })
  }

  const showWarning = (message, title = 'Warning') => {
    return addToast({ type: 'warning', title, message })
  }

  const value = {
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm w-full">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}