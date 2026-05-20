import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { skillName, progress = 0 } = req.body
  const familyId = req.auth.familyId

  if (!skillName) {
    return res.status(400).json({ error: 'Numele abilității este obligatoriu' })
  }

  try {
    const { data, error } = await supabase
      .from('skills')
      .insert({
        family_id: familyId,
        skill_name: skillName.trim(),
        progress: Math.max(0, Math.min(100, parseInt(progress) || 0))
      })
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
    console.error('Skill create error:', error)
    return res.status(500).json({ error: 'Crearea abilității a eșuat' })
  }
}

export default requireEditor(handler)
