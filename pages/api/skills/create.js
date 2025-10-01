import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, skillName, progress = 0 } = req.body

  if (!familyId || !skillName) {
    return res.status(400).json({ error: 'ID-ul familiei și numele abilității sunt obligatorii' })
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