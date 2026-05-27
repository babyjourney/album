import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const ThemeContext = createContext()

// Liquid Glass theme registry. Each theme just toggles a data-theme attribute;
// the heavy lifting (canvas color, aurora tints, glass tints, ink colors) lives
// in styles/globals.css under [data-theme='...'] selectors.
export const themes = {
  light: {
    name: 'light',
    label: 'Lumină / Light',
    icon: '☀️',
    swatch: 'linear-gradient(135deg, #c4b5fd 0%, #7dd3fc 50%, #fda4af 100%)',
  },
  dark: {
    name: 'dark',
    label: 'Întuneric / Dark',
    icon: '🌙',
    swatch: 'linear-gradient(135deg, #4c1d95 0%, #0e7490 50%, #831843 100%)',
  },
  blue: {
    name: 'blue',
    label: 'Cer / Sky',
    icon: '💙',
    swatch: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
  },
  pink: {
    name: 'pink',
    label: 'Înflorit / Bloom',
    icon: '🌸',
    swatch: 'linear-gradient(135deg, #fb7185 0%, #c4b5fd 100%)',
  },
}

export function ThemeProvider({ children }) {
  const router = useRouter()
  const [currentTheme, setCurrentTheme] = useState('light')

  // Routes that ALWAYS render in dark mode regardless of the user's
  // saved family preference. The admin panel was designed for a dark
  // canvas (white text on glass surfaces); rendering it on the light
  // canvas makes the text invisible.
  const isAdminRoute = router?.pathname?.startsWith('/admin')
  const effectiveTheme = isAdminRoute ? 'dark' : currentTheme

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('album-theme')
    if (saved && themes[saved]) setCurrentTheme(saved)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    // Pin the document attribute to `effectiveTheme`, NOT `currentTheme`,
    // so admin routes stay dark even when the family-side preference is
    // light/blue/pink.
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    // Update <meta name="theme-color"> for mobile browser chrome.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const map = { light: '#f4f5fb', dark: '#07070d', blue: '#dde9f4', pink: '#faecf2' }
      meta.setAttribute('content', map[effectiveTheme] || '#f4f5fb')
    }
  }, [effectiveTheme])

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName)
      if (typeof window !== 'undefined') localStorage.setItem('album-theme', themeName)
    }
  }

  return (
    <ThemeContext.Provider value={{
      currentTheme: effectiveTheme,    // what's actually on the page right now
      savedTheme: currentTheme,        // what the user picked (for the theme picker UI)
      themes,
      changeTheme,
      themeData: themes[effectiveTheme],
      isAdminRoute,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
