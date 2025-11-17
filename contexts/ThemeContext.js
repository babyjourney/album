import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const themes = {
  light: {
    name: 'light',
    label: 'Светлая / Deschisă',
    icon: '☀️',
    colors: {
      '--bg-primary': '#fafafa',
      '--bg-secondary': '#ffffff',
      '--bg-gray': '#f3f4f6',
      '--text-primary': '#111827',
      '--text-secondary': '#6b7280',
      '--text-subtle': '#9ca3af',
      '--border-light': '#e5e7eb',
      '--border-primary': '#d1d5db',
      '--accent-blue': '#3b82f6',
      '--accent-blue-light': '#eff6ff',
      '--accent-red': '#ef4444',
      '--accent-green': '#10b981',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      '--overlay': 'rgba(0, 0, 0, 0.5)'
    }
  },
  dark: {
    name: 'dark',
    label: 'Темная / Întunecată',
    icon: '🌙',
    colors: {
      '--bg-primary': '#393939',
      '--bg-secondary': '#2d2d2d',
      '--bg-gray': '#4a4a4a',
      '--text-primary': '#ffffff',
      '--text-secondary': '#d1d5db',
      '--text-subtle': '#9ca3af',
      '--border-light': '#525252',
      '--border-primary': '#6b7280',
      '--accent-blue': '#60a5fa',
      '--accent-blue-light': 'rgba(96, 165, 250, 0.1)',
      '--accent-red': '#f87171',
      '--accent-green': '#34d399',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      '--overlay': 'rgba(0, 0, 0, 0.7)'
    }
  },
  blue: {
    name: 'blue',
    label: 'Голубая / Albастră',
    icon: '💙',
    colors: {
      '--bg-primary': '#b0cbdc',
      '--bg-secondary': '#ffffff',
      '--bg-gray': '#e0eff7',
      '--text-primary': '#1f2937',
      '--text-secondary': '#6b7280',
      '--text-subtle': '#9ca3af',
      '--border-light': '#e5e7eb',
      '--border-primary': '#d1d5db',
      '--accent-blue': '#0369a1',
      '--accent-blue-light': 'rgba(3, 105, 161, 0.1)',
      '--accent-red': '#dc2626',
      '--accent-green': '#059669',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
      '--overlay': 'rgba(0, 0, 0, 0.5)'
    }
  },
  pink: {
    name: 'pink',
    label: 'Розовая / Roz',
    icon: '🌸',
    colors: {
      '--bg-primary': '#f5dbf1',
      '--bg-secondary': '#ffffff',
      '--bg-gray': '#f9e8f5',
      '--text-primary': '#1f2937',
      '--text-secondary': '#6b7280',
      '--text-subtle': '#9ca3af',
      '--border-light': '#e5e7eb',
      '--border-primary': '#d1d5db',
      '--accent-blue': '#7c3aed',
      '--accent-blue-light': 'rgba(124, 58, 237, 0.1)',
      '--accent-red': '#e11d48',
      '--accent-green': '#059669',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
      '--overlay': 'rgba(0, 0, 0, 0.5)'
    }
  }
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light')

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('album-theme')
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  // Apply theme CSS variables when theme changes
  useEffect(() => {
    const theme = themes[currentTheme]
    if (theme && typeof document !== 'undefined') {
      const root = document.documentElement
      Object.entries(theme.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })
    }
  }, [currentTheme])

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName)
      localStorage.setItem('album-theme', themeName)
    }
  }

  const value = {
    currentTheme,
    themes,
    changeTheme,
    themeData: themes[currentTheme]
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}