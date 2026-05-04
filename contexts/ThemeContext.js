import React, { createContext, useContext, useState, useEffect } from 'react'

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
  const [currentTheme, setCurrentTheme] = useState('light')

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('album-theme')
    if (saved && themes[saved]) setCurrentTheme(saved)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', currentTheme)
    // Update <meta name="theme-color"> for mobile browser chrome.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const map = { light: '#f4f5fb', dark: '#07070d', blue: '#dde9f4', pink: '#faecf2' }
      meta.setAttribute('content', map[currentTheme] || '#f4f5fb')
    }
  }, [currentTheme])

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName)
      if (typeof window !== 'undefined') localStorage.setItem('album-theme', themeName)
    }
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, themes, changeTheme, themeData: themes[currentTheme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
