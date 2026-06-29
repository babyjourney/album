import { supabase } from '../../../lib/supabaseClient'
import { requireAuth, requireEditor } from '../../../lib/authMiddleware'

async function getSkillsProgress(req, res) {
  const familyId = req.auth.familyId

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
  const { skillId, skillName, skillCategory, progress, notes } = req.body
  const familyId = req.auth.familyId

  if (!skillId || progress === undefined) {
    return res.status(400).json({ error: 'Date incomplete pentru actualizarea progresului' })
  }

  if (progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Progresul trebuie să fie între 0 și 100' })
  }

  try {
    // Manual upsert keyed on (family_id, skill_id). Avoid .upsert({ onConflict })
    // because skills_progress has no UNIQUE(family_id, skill_id) constraint in
    // the deployed schema — Postgres would raise "no unique or exclusion
    // constraint matching the ON CONFLICT specification".
    const payload = {
      family_id: familyId,
      skill_id: skillId,
      skill_name: skillName,
      skill_category: skillCategory,
      progress: progress,
      notes: notes,
      last_updated: new Date().toISOString(),
    }

    const { data: existing, error: selErr } = await supabase
      .from('skills_progress')
      .select('id')
      .eq('family_id', familyId)
      .eq('skill_id', skillId)
      .limit(1)
      .maybeSingle()
    if (selErr) throw selErr

    let data, error
    if (existing) {
      ;({ data, error } = await supabase
        .from('skills_progress')
        .update(payload)
        .eq('id', existing.id)
        .select())
    } else {
      ;({ data, error } = await supabase
        .from('skills_progress')
        .insert(payload)
        .select())
    }

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

async function dispatch(req, res) {
  if (req.method === 'GET') {
    return getSkillsProgress(req, res)
  } else if (req.method === 'POST') {
    return updateSkillProgress(req, res)
  } else {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }
}

// GET requires any authenticated family role; POST requires editor.
export default function handler(req, res) {
  if (req.method === 'POST') {
    return requireEditor(dispatch)(req, res)
  }
  return requireAuth(dispatch)(req, res)
}
