import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { oldValue, value, label, emoji } = req.body
  const familyId = req.auth.familyId

  if (!oldValue || !value || !label) {
    return res.status(400).json({ error: 'Old value, new value and label are required' })
  }

  try {
    // Check if the category exists for this family
    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', oldValue)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // If value is changing, check if new value already exists
    if (oldValue !== value) {
      const { data: valueExists } = await supabase
        .from('family_categories')
        .select('id')
        .eq('family_id', familyId)
        .eq('category_value', value)
        .single()

      if (valueExists) {
        return res.status(400).json({ error: 'Category with this value already exists' })
      }
    }

    // Update category
    const { data: updatedCategory, error } = await supabase
      .from('family_categories')
      .update({
        category_value: value,
        category_label: label,
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
    res.status(500).json({ error: 'Failed to update category' })
  }
}

export default requireEditor(handler)