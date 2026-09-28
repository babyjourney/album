import { supabase } from '../../../lib/supabaseClient'
import { requireAuth, requireEditor } from '../../../lib/authMiddleware'

let childColumnCache = null

async function hasChildColumn() {
  if (childColumnCache !== null) return childColumnCache

  const { error } = await supabase.from('skills_progress').select('child_id').limit(1)

  if (!error) {
    childColumnCache = true
    return true
  }
  if (error.code === '42703' || /column .*child_id.* does not exist/i.test(error.message || '')) {
    childColumnCache = false
    return false
  }

  throw new Error(`skills_progress schema probe failed: ${error.message}`)
}

async function resolveChildId(familyId, requestedChildId) {
  if (!requestedChildId) return { ok: true, childId: null }

  const { data } = await supabase
    .from('children')
    .select('id, family_id')
    .eq('id', requestedChildId)
    .maybeSingle()

  if (!data || data.family_id !== familyId) return { ok: false, childId: null }
  return { ok: true, childId: data.id }
}

const scopeToChild = (query, childId) =>
  childId ? query.eq('child_id', childId) : query.is('child_id', null)

async function getSkillsProgress(req, res) {
  const familyId = req.auth.familyId

  try {
    let query = supabase
      .from('skills_progress')
      .select('*')
      .eq('family_id', familyId)

    const childScoped = await hasChildColumn()
    if (childScoped) {
      const { ok, childId } = await resolveChildId(familyId, req.query.childId)
      if (!ok) return res.status(403).json({ error: 'Copilul nu aparține familiei dvs.', errorKey: 'errChildNotInFamily' })
      query = scopeToChild(query, childId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      childScoped,
      skills: data || []
    })

  } catch (error) {
    console.error('Skills fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea progresului a eșuat', errorKey: 'errProgressLoadFailed' })
  }
}

async function updateSkillProgress(req, res) {
  const { skillId, skillName, skillCategory, progress, notes, childId: rawChildId } = req.body
  const familyId = req.auth.familyId

  if (!skillId || progress === undefined) {
    return res.status(400).json({ error: 'Date incomplete pentru actualizarea progresului', errorKey: 'errProgressIncomplete' })
  }

  if (progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Progresul trebuie să fie între 0 și 100', errorKey: 'errProgressRange' })
  }

  try {
    const childScoped = await hasChildColumn()
    let childId = null
    if (childScoped) {
      const resolved = await resolveChildId(familyId, rawChildId)
      if (!resolved.ok) return res.status(403).json({ error: 'Copilul nu aparține familiei dvs.', errorKey: 'errChildNotInFamily' })
      childId = resolved.childId
    }

    const payload = {
      family_id: familyId,
      skill_id: skillId,
      skill_name: skillName,
      skill_category: skillCategory,
      progress: progress,
      notes: notes,
      last_updated: new Date().toISOString(),
    }
    if (childScoped) payload.child_id = childId

    const findExisting = () => {
      let q = supabase
        .from('skills_progress')
        .select('id')
        .eq('family_id', familyId)
        .eq('skill_id', skillId)
      if (childScoped) q = scopeToChild(q, childId)
      return q.limit(1).maybeSingle()
    }

    const { data: existing, error: selErr } = await findExisting()
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

      if (error && error.code === '23505') {
        const { data: raced } = await findExisting()
        if (raced) {
          ;({ data, error } = await supabase
            .from('skills_progress')
            .update(payload)
            .eq('id', raced.id)
            .select())
        }
      }
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
    return res.status(500).json({ error: 'Actualizarea progresului a eșuat', errorKey: 'errProgressUpdateFailed' })
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

export default function handler(req, res) {
  if (req.method === 'POST') {
    return requireEditor(dispatch)(req, res)
  }
  return requireAuth(dispatch)(req, res)
}
