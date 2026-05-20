import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { skillId } = req.body

  if (!skillId) {
    return res.status(400).json({ error: 'ID-ul abilității este obligatoriu' })
  }

  try {
    // SECURITY: only allow deletion if skill belongs to caller's family
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId)
      .eq('family_id', req.auth.familyId)

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      message: 'Abilitatea a fost ștearsă cu succes'
    })

  } catch (error) {
    console.error('Skill delete error:', error)
    return res.status(500).json({ error: 'Ștergerea abilității a eșuat' })
  }
}

export default requireEditor(handler)
