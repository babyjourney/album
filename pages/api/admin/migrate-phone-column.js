import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  try {
    console.log('🔄 Checking families table structure...')

    // Try to create a test family with phone_number to check if column exists
    const testData = {
      name: '__TEST_MIGRATION__',
      phone_number: '061234567',
      viewer_pin: '0000',
      editor_pin: '00000000'
    }

    const { data, error } = await supabase
      .from('families')
      .insert(testData)
      .select()

    if (error) {
      if (error.message.includes('phone_number')) {
        return res.status(400).json({
          error: 'Coloana phone_number nu există în tabelul families',
          message: 'Trebuie să adăugați manual coloana phone_number în Supabase Dashboard',
          sqlCommand: 'ALTER TABLE families ADD COLUMN phone_number VARCHAR(20);',
          instructions: [
            '1. Mergeți la Supabase Dashboard',
            '2. Navigați la SQL Editor',
            '3. Executați: ALTER TABLE families ADD COLUMN phone_number VARCHAR(20);',
            '4. Apoi reîncercați crearea familiei'
          ]
        })
      }
      throw error
    }

    // Clean up test record
    if (data && data.length > 0) {
      await supabase
        .from('families')
        .delete()
        .eq('id', data[0].id)
    }

    return res.status(200).json({
      success: true,
      message: 'Coloana phone_number există și funcționează corect!'
    })

  } catch (error) {
    console.error('❌ Migration check error:', error)
    return res.status(500).json({
      error: 'Eroare la verificarea structurii bazei de date',
      details: error.message
    })
  }
}

export default requireAdmin(handler)