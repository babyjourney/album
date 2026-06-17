// Helpers for "one row per (family, child)" tables (biography, health,
// education). child_id may be null (families that don't use explicit child
// rows), so we can't rely on a UNIQUE upsert (Postgres treats NULLs as
// distinct). These do a manual select-then-update/insert.

import { supabase } from './supabaseClient'

export async function getChildRecord(table, familyId, childId) {
  let q = supabase.from(table).select('*').eq('family_id', familyId)
  q = childId ? q.eq('child_id', childId) : q.is('child_id', null)
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data || null
}

export async function upsertChildRecord(table, familyId, childId, patch) {
  const existing = await getChildRecord(table, familyId, childId)
  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from(table)
    .insert({ family_id: familyId, child_id: childId || null, ...patch })
    .select()
    .single()
  if (error) throw error
  return data
}

// Resolve the acting family id consistently across journey endpoints.
export function resolveFamilyId(req) {
  return req.auth?.isAdmin
    ? (req.query?.familyId || req.body?.familyId || null)
    : req.auth?.familyId || null
}

export function canWrite(req) {
  return req.auth?.isAdmin || req.auth?.role === 'editor'
}
