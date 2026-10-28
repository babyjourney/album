import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { canonicalCategoryLabel } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { value, label, emoji } = req.body || {}
  const familyId = req.auth.familyId
  const cleanValue = typeof value === 'string' ? value.trim() : ''
  const rawLabel = typeof label === 'string' ? label.trim() : ''
  const cleanLabel = canonicalCategoryLabel(cleanValue, rawLabel)

  if (!cleanValue || !rawLabel) {
    return res.status(400).json({ error: 'Valoarea și numele categoriei sunt obligatorii', errorKey: 'errCategoryFieldsRequired' })
  }

  try {
    const { error: testError } = await supabase
      .from('family_categories')
      .select('id')
      .limit(1)

    if (testError && (testError.message.includes('does not exist') || testError.code === '42P01')) {
      return res.status(400).json({
        error: 'Sistemul de categorii necesită migrare. Contactează administratorul.',
        errorKey: 'categoriesMigrationNeeded',
        needsMigration: true
      })
    }

    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', cleanValue)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Există deja o categorie cu această valoare', errorKey: 'errCategoryExists' })
    }

    const { data: newCategory, error } = await supabase
      .from('family_categories')
      .insert({
        family_id: familyId,
        category_value: cleanValue,
        category_label: cleanLabel,
        category_emoji: emoji || '📝'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(201).json({
      success: true,
      category: {
        value: newCategory.category_value,
        label: newCategory.category_label,
        emoji: newCategory.category_emoji
      }
    })
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({ error: 'Crearea categoriei a eșuat', errorKey: 'errCategoryCreateFailed' })
  }
}

export default requireEditor(requireFeature('customCategories', handler))
