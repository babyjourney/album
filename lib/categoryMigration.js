import { supabase } from './supabaseClient'
import {
  DEFAULT_CATEGORIES,
  CATEGORY_LABELS,
  LEGACY_CATEGORY_REMAP,
  canonicalCategoryLabel,
  isKnownCategoryLabel,
} from './defaultCategories'

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
  label: canonicalCategoryLabel(row.category_value, row.category_label),
  emoji: row.category_emoji,
})

const hasStaleDefaultLabel = (row) => {
  const canonical = DEFAULT_ORDER.has(row.category_value) ? CATEGORY_LABELS[row.category_value] : null
  return !!canonical && row.category_label !== canonical &&
    isKnownCategoryLabel(row.category_value, row.category_label)
}

async function healDefaultLabels(familyId, rows) {
  const stale = rows.filter(hasStaleDefaultLabel)
  if (!stale.length) return rows

  const fixed = new Map()
  for (const row of stale) {
    const canonical = CATEGORY_LABELS[row.category_value]
    const { error } = await supabase
      .from('family_categories')
      .update({ category_label: canonical })
      .eq('family_id', familyId)
      .eq('category_value', row.category_value)
      .eq('category_label', row.category_label)
    if (error) {
      console.error('[categories] could not normalize a default category label:', error)
      continue
    }
    fixed.set(row.category_value, canonical)
  }
  if (fixed.size) console.info(`[categories] normalized ${fixed.size} default label(s) for family ${familyId}`)

  return rows.map((r) => (fixed.has(r.category_value) ? { ...r, category_label: fixed.get(r.category_value) } : r))
}

async function healLegacyCategories(familyId, rows) {
  const retired = new Set(Object.keys(LEGACY_CATEGORY_REMAP))
  const present = new Set(rows.map((r) => r.category_value))
  const hasRetired = rows.some((r) => retired.has(r.category_value))
  if (!hasRetired) return rows

  console.info(`[categories] migrating family ${familyId} off the retired category set`)

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

  const { error: delError } = await supabase
    .from('family_categories')
    .delete()
    .eq('family_id', familyId)
    .in('category_value', [...retired])
  if (delError) {
    console.error('[categories] could not delete retired categories:', delError)
    return rows
  }

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

export async function ensureFamilyCategories(familyId) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('family_categories')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (fetchError) {
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

    const migrated = await healLegacyCategories(familyId, existing)
    const rows = await healDefaultLabels(familyId, migrated)
    return sortCategories(rows.map(toClientShape))
  } catch (error) {
    console.error('Error in ensureFamilyCategories:', error)
    return DEFAULT_CATEGORIES
  }
}

export async function healAllFamiliesCategories() {
  const { data: families, error } = await supabase.from('families').select('id')
  if (error) throw error
  let migrated = 0
  let relabeled = 0
  for (const f of families || []) {
    const { data: rows, error: rowsError } = await supabase
      .from('family_categories')
      .select('*')
      .eq('family_id', f.id)
    if (rowsError) {
      console.error(`[categories] could not read categories for family ${f.id}:`, rowsError)
      continue
    }
    let current = rows || []
    if (current.some((r) => LEGACY_CATEGORY_REMAP[r.category_value])) {
      current = await healLegacyCategories(f.id, current)
      migrated += 1
    }
    if (current.some(hasStaleDefaultLabel)) {
      const healed = await healDefaultLabels(f.id, current)
      if (!healed.some(hasStaleDefaultLabel)) relabeled += 1
    }
  }
  for (const [oldValue, newValue] of Object.entries(LEGACY_CATEGORY_REMAP)) {
    await supabase.from('photos').update({ category: newValue }).eq('category', oldValue)
  }
  return { migrated, relabeled }
}
