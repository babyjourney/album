import '../styles/globals.css'
import { ToastProvider } from '../contexts/ToastContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import '../lib/cleanOldCategories' // Clean old global categories on app load
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
      </Head>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <Component {...pageProps} />
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </>
  )
}