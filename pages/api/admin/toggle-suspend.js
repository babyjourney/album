import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { familyId, isSuspended } = req.body

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required' })
  }

  if (typeof isSuspended !== 'boolean') {
    return res.status(400).json({ error: 'isSuspended must be a boolean' })
  }

  try {
    const { data, error } = await supabase
      .from('families')
      .update({ is_suspended: isSuspended })
      .eq('id', familyId)
      .select('id, name, is_suspended')
      .single()

    if (error) {
      console.error('Error toggling suspend:', error)
      return res.status(500).json({ error: 'Failed to update suspend status' })
    }

    return res.status(200).json({
      success: true,
      family: data
    })
  } catch (error) {
    console.error('Toggle suspend error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAdmin(handler)
