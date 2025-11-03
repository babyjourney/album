import { useState } from 'react'
import { useRouter } from 'next/router'
import { authenticatedFetch } from '../../lib/pinAuth'

export default function MigrateCategories() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const router = useRouter()

  const runMigration = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await authenticatedFetch('/api/admin/migrate-categories', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || 'Migration failed' })
      }
    } catch (error) {
      console.error('Migration error:', error)
      setResult({ success: false, message: 'Migration failed: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Migrate Categories to Family-Specific System</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Această migrare va crea tabelul <code>family_categories</code> și va popula categoriile default pentru toate familiile existente.</p>
        
        <p><strong>Ce face migrarea:</strong></p>
        <ul>
          <li>Creează tabelul <code>family_categories</code> în baza de date</li>
          <li>Adaugă politici RLS pentru securitate</li>
          <li>Populează categoriile default pentru fiecare familie</li>
          <li>Permite categorii personalizate per familie</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runMigration}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Migrația rulează...' : 'Rulează Migrarea'}
        </button>
        
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          Înapoi la Dashboard
        </button>
      </div>

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: result.success ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          <h3>{result.success ? 'Succes!' : 'Eroare!'}</h3>
          <p>{result.message}</p>
          
          {result.success && (
            <div style={{ marginTop: '10px' }}>
              <p>✅ Tabelul family_categories a fost creat</p>
              <p>✅ Categoriile default au fost adăugate pentru toate familiile</p>
              <p>✅ Acum fiecare familie poate avea categorii personalizate</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}