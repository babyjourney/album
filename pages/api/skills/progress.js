import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getSkillsProgress(req, res)
  } else if (req.method === 'POST') {
    return updateSkillProgress(req, res)
  } else {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }
}

async function getSkillsProgress(req, res) {
  const { familyId } = req.query

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    const { data, error } = await supabase
      .from('skills_progress')
      .select('*')
      .eq('family_id', familyId)

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      skills: data || []
    })

  } catch (error) {
    console.error('Skills fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea progresului a eșuat' })
  }
}

async function updateSkillProgress(req, res) {
  const { familyId, skillId, skillName, skillCategory, progress, notes } = req.body

  if (!familyId || !skillId || progress === undefined) {
    return res.status(400).json({ error: 'Date incomplete pentru actualizarea progresului' })
  }

  if (progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Progresul trebuie să fie între 0 și 100' })
  }

  try {
    const { data, error } = await supabase
      .from('skills_progress')
      .upsert({
        family_id: familyId,
        skill_id: skillId,
        skill_name: skillName,
        skill_category: skillCategory,
        progress: progress,
        notes: notes,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'family_id,skill_id'
      })
      .select()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      skill: data[0]
    })

  } catch (error) {
    console.error('Skills update error:', error)
    return res.status(500).json({ error: 'Actualizarea progresului a eșuat' })
  }
}