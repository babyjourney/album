import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function ClearCategories() {
  const [result, setResult] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Auto-run if requested
    if (router.query.auto === 'true') {
      clearCategories()
    }
  }, [router.query])

  const clearCategories = async () => {
    setIsClearing(true)
    try {
      // Clear all old category-related data
      localStorage.removeItem('customCategories')
      
      // Clear any cached data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('categor') && !key.includes('customCategories_')) {
          localStorage.removeItem(key)
        }
      })

      setResult('success')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      setResult(`error: ${error.message}`)
      setIsClearing(false)
    }
  }

  return (
    <>
      <Head>
        <title>Clear Categories - Fix Issue</title>
      </Head>
      
      <div style={{
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        background: '#f5f5f5',
        minHeight: '100vh'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ color: '#333', marginBottom: '20px' }}>
            🔧 Fix Categories Issue
          </h1>
          
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            Dacă vezi categorii din alt album, această pagină va rezolva problema:
          </p>
          
          <ol style={{ color: '#666', lineHeight: '1.8', marginBottom: '30px' }}>
            <li><strong>Șterge categoriile globale vechi</strong> (care erau partajate între albume)</li>
            <li><strong>Forțează sistemul nou</strong> (categorii izolate per album)</li>
            <li><strong>Redirecționează la dashboard</strong></li>
          </ol>

          {!result && (
            <button
              onClick={clearCategories}
              disabled={isClearing}
              style={{
                background: isClearing ? '#6c757d' : '#dc3545',
                color: 'white',
                padding: '15px 25px',
                border: 'none',
                borderRadius: '5px',
                cursor: isClearing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                marginRight: '10px'
              }}
            >
              {isClearing ? '🔄 Se procesează...' : '🗑️ Șterge categoriile vechi și repornește'}
            </button>
          )}

          {result === 'success' && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '5px',
              background: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              fontWeight: 'bold'
            }}>
              ✅ Categoriile vechi au fost șterse!<br />
              🔄 Redirecționez la dashboard în 2 secunde...
            </div>
          )}

          {result.startsWith('error') && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '5px',
              background: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              fontWeight: 'bold'
            }}>
              ❌ Eroare: {result.replace('error: ', '')}
            </div>
          )}

          <div style={{ marginTop: '30px', fontSize: '14px', color: '#6c757d' }}>
            <p><strong>Ce face această operațiune:</strong></p>
            <ul>
              <li>Șterge categoriile globale vechi din localStorage</li>
              <li>Forțează aplicația să folosească noul sistem de categorii izolate</li>
              <li>Fiecare album va avea propriile categorii</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}