import { supabase } from '../../../lib/supabaseClient'
import { requireAuth, requireEditor } from '../../../lib/authMiddleware'

// (Item 10) Skills belong to a CHILD, not to the family — with 3 kids you need
// to track each one separately. `child_id` is added by sql/sergiu_batch2.sql;
// this probe keeps the page working on a deployment where it hasn't run yet
// (skills then stay family-wide, exactly as before).
//
// CRITICAL: only a genuine "column does not exist" (Postgres 42703) may turn
// child scoping off. A naive `return !error` would also treat a network blip or
// a statement timeout as "no column" — and with scoping off, writing child B's
// progress finds and OVERWRITES child A's row for the same skill. One flaky
// probe would silently corrupt a sibling's data, permanently.
//
// Cached per process: the schema cannot change between two requests, and this
// otherwise costs a round-trip on every read and every write.
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

  // Anything else is a transient failure. Do NOT cache, and do NOT silently
  // drop child scoping — fail loudly instead of corrupting data.
  throw new Error(`skills_progress schema probe failed: ${error.message}`)
}

// SECURITY: never trust a childId from the client — confirm it belongs to the
// caller's family. Returns { ok, childId }. `ok:false` means the caller named a
// child that isn't theirs (or doesn't exist), which must be rejected rather
// than quietly degraded to the family-wide rows.
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

// Scope a query to one child. Reads and writes MUST agree on this, or a write
// lands somewhere a read will never look. `.eq(col, null)` never matches NULL in
// SQL — the family-wide rows (child_id IS NULL) need `.is()`.
const scopeToChild = (query, childId) =>
  childId ? query.eq('child_id', childId) : query.is('child_id', null)

async function getSkillsProgress(req, res) {
  const familyId = req.auth.familyId

  try {
    let query = supabase
      .from('skills_progress')
      .select('*')
      .eq('family_id', familyId)

    // Until sql/sergiu_batch2.sql has run, skills_progress has no child_id and
    // every child reads the same family-wide rows. Report that, so the page
    // can say so instead of showing a child switcher that changes nothing.
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

    // Read-then-write "upsert" keyed on (family_id, child_id, skill_id).
    // We can't use .upsert({ onConflict }) on the legacy schema, which has no
    // matching UNIQUE constraint — Postgres would raise "no unique or exclusion
    // constraint matching the ON CONFLICT specification".
    //
    // sql/sergiu_batch2.sql now DOES add unique indexes, which is what makes the
    // insert below safe: two concurrent saves for the same skill would otherwise
    // both find nothing and both insert, leaving permanent duplicate rows. With
    // the index, the loser gets 23505 and we retry as an update.
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
      // Scope the lookup to the child too, or bumping one child's skill would
      // overwrite a sibling's row for the same skill.
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

      // Lost an insert race against a concurrent save of the same skill.
      // The row now exists — update it instead of failing the request.
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

// GET requires any authenticated family role; POST requires editor.
export default function handler(req, res) {
  if (req.method === 'POST') {
    return requireEditor(dispatch)(req, res)
  }
  return requireAuth(dispatch)(req, res)
}
