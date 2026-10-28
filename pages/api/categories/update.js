import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { canonicalCategoryLabel } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { oldValue, value, label, emoji } = req.body || {}
  const familyId = req.auth.familyId
  const cleanValue = typeof value === 'string' ? value.trim() : ''
  const rawLabel = typeof label === 'string' ? label.trim() : ''
  const cleanLabel = canonicalCategoryLabel(cleanValue, rawLabel)

  if (!oldValue || !cleanValue || !rawLabel) {
    return res.status(400).json({ error: 'Valoarea și numele categoriei sunt obligatorii', errorKey: 'errCategoryFieldsRequired' })
  }

  try {
    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', oldValue)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Categoria nu a fost găsită', errorKey: 'errCategoryNotFound' })
    }

    if (oldValue !== cleanValue) {
      const { data: valueExists } = await supabase
        .from('family_categories')
        .select('id')
        .eq('family_id', familyId)
        .eq('category_value', cleanValue)
        .single()

      if (valueExists) {
        return res.status(400).json({ error: 'Există deja o categorie cu această valoare', errorKey: 'errCategoryExists' })
      }
    }

    const { data: updatedCategory, error } = await supabase
      .from('family_categories')
      .update({
        category_value: cleanValue,
        category_label: cleanLabel,
        category_emoji: emoji || '📝'
      })
      .eq('family_id', familyId)
      .eq('category_value', oldValue)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      category: {
        value: updatedCategory.category_value,
        label: updatedCategory.category_label,
        emoji: updatedCategory.category_emoji
      }
    })
  } catch (error) {
    console.error('Error updating category:', error)
    res.status(500).json({ error: 'Actualizarea categoriei a eșuat', errorKey: 'errCategoryUpdateFailed' })
  }
}

export default requireEditor(requireFeature('customCategories', handler))
