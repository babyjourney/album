import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { familyId: rawFamilyId } = req.body
  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId) {
    return res.status(400).json({ error: 'Family ID este obligatoriu' })
  }

  try {
    // Update the last_accessed timestamp for the family
    const { data, error } = await supabase
      .from('families')
      .update({
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', familyId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      family: data,
      message: 'Last access time updated successfully'
    })

  } catch (error) {
    console.error('Update last access error:', error)
    res.status(500).json({
      error: 'Eroare la actualizarea timpului de acces',
      details: error.message
    })
  }
}

export default requireAuthOrAdmin(handler)
