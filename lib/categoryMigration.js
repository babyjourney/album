import { supabase } from './supabaseClient'
import { DEFAULT_CATEGORIES, LEGACY_CATEGORY_REMAP } from './defaultCategories'

// Canonical display order: the six defaults in Sergiu's order (Milestones,
// Family, Health, Education, Adventures, Everyday Life), then the family's own
// custom categories in creation order.
const DEFAULT_ORDER = new Map(DEFAULT_CATEGORIES.map((c, i) => [c.value, i]))
const sortCategories = (rows) =>
  rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ai = DEFAULT_ORDER.has(a.r.value) ? DEFAULT_ORDER.get(a.r.value) : 100 + a.i
      const bi = DEFAULT_ORDER.has(b.r.value) ? DEFAULT_ORDER.get(b.r.value) : 100 + b.i
      return ai - bi
    })
    .map(({ r }) => r)

const toClientShape = (row) => ({
  value: row.category_value,
  label: row.category_label,
  emoji: row.category_emoji,
})

// (Sergiu 10.07 #9 / 29.07 #7) The category set was replaced, but the rename
// lives in sql/sergiu_batch2.sql, which must be run by hand — and for six weeks
// it wasn't, so every family kept seeing Memories/Special/Play/Learning. The
// app now enforces its own invariant: whenever a family's list is read and it
// still contains a retired id, the family is migrated on the spot (posts
// remapped first so none are orphaned, then the list rewritten). Pure DML —
// no schema change needed — and idempotent, so it's a no-op once the SQL
// migration has also run.
async function healLegacyCategories(familyId, rows) {
  const retired = new Set(Object.keys(LEGACY_CATEGORY_REMAP))
  const present = new Set(rows.map((r) => r.category_value))
  const hasRetired = rows.some((r) => retired.has(r.category_value))
  if (!hasRetired) return rows

  console.info(`[categories] migrating family ${familyId} off the retired category set`)

  // 1. Remap posts so nothing is orphaned (special→milestones, play→adventures,
  //    learning→education, memories→everyday).
  for (const [oldValue, newValue] of Object.entries(LEGACY_CATEGORY_REMAP)) {
    const { error } = await supabase
      .from('photos')
      .update({ category: newValue })
      .eq('family_id', familyId)
      .eq('category', oldValue)
    if (error) {
      console.error('[categories] post remap failed, leaving the list untouched:', error)
      return rows
    }
  }

  // 2. Retire the old rows.
  const { error: delError } = await supabase
    .from('family_categories')
    .delete()
    .eq('family_id', familyId)
    .in('category_value', [...retired])
  if (delError) {
    console.error('[categories] could not delete retired categories:', delError)
    return rows
  }

  // 3. Add whichever of the new defaults the family doesn't have yet. Custom
  //    categories the family created are left alone.
  const missing = DEFAULT_CATEGORIES.filter((c) => !present.has(c.value))
  if (missing.length) {
    const { error: insError } = await supabase.from('family_categories').insert(
      missing.map((c) => ({
        family_id: familyId,
        category_value: c.value,
        category_label: c.label,
        category_emoji: c.emoji,
      }))
    )
    if (insError && !/duplicate key/i.test(insError.message || '')) {
      console.error('[categories] could not insert new default categories:', insError)
    }
  }

  const { data: fresh, error: reErr } = await supabase
    .from('family_categories')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })
  if (reErr) return rows
  return fresh || []
}

// Returns the family's categories, seeding the defaults for a family that has
// none yet and migrating one that still holds the retired set.
export async function ensureFamilyCategories(familyId) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('family_categories')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      // Table missing or unreadable — the list still has to render.
      console.error('Error fetching family categories:', fetchError)
      return DEFAULT_CATEGORIES
    }

    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase.from('family_categories').insert(
        DEFAULT_CATEGORIES.map((cat) => ({
          family_id: familyId,
          category_value: cat.value,
          category_label: cat.label,
          category_emoji: cat.emoji,
        }))
      )
      if (insertError) console.error('Error inserting default categories:', insertError)
      return DEFAULT_CATEGORIES
    }

    const rows = await healLegacyCategories(familyId, existing)
    return sortCategories(rows.map(toClientShape))
  } catch (error) {
    console.error('Error in ensureFamilyCategories:', error)
    return DEFAULT_CATEGORIES
  }
}

// Migrates EVERY family off the retired set in one pass. Used by
// /api/admin/migrate-categories and scripts/check-setup.js --fix.
export async function healAllFamiliesCategories() {
  const { data: families, error } = await supabase.from('families').select('id')
  if (error) throw error
  let migrated = 0
  for (const f of families || []) {
    const { data: rows } = await supabase
      .from('family_categories')
      .select('*')
      .eq('family_id', f.id)
    const before = (rows || []).some((r) => LEGACY_CATEGORY_REMAP[r.category_value])
    if (!before) continue
    await healLegacyCategories(f.id, rows || [])
    migrated += 1
  }
  // Posts of families that have NO family_categories rows at all (never opened
  // the app since the table was added) still need their category remapped.
  for (const [oldValue, newValue] of Object.entries(LEGACY_CATEGORY_REMAP)) {
    await supabase.from('photos').update({ category: newValue }).eq('category', oldValue)
  }
  return { migrated }
}
