import '../styles/globals.css'
import { ToastProvider } from '../contexts/ToastContext'
import { LanguageProvider } from '../contexts/LanguageContext'

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </LanguageProvider>
  )
}