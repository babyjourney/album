import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { skillId, progress } = req.body

  if (!skillId || progress === undefined) {
    return res.status(400).json({ error: 'ID-ul abilității și progresul sunt obligatorii' })
  }

  try {
    // SECURITY: scope update by family_id so a forged skillId from another
    // family will simply not match and return no rows.
    const { data, error } = await supabase
      .from('skills')
      .update({
        progress: Math.max(0, Math.min(100, parseInt(progress)))
      })
      .eq('id', skillId)
      .eq('family_id', req.auth.familyId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      skill: data
    })

  } catch (error) {
    console.error('Skill update error:', error)
    return res.status(500).json({ error: 'Actualizarea abilității a eșuat' })
  }
}

export default requireEditor(handler)
