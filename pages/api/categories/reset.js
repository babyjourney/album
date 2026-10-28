import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { DEFAULT_CATEGORIES } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const familyId = req.auth.familyId

  try {
    const { error: deleteError } = await supabase
      .from('family_categories')
      .delete()
      .eq('family_id', familyId)

    if (deleteError) {
      throw deleteError
    }

    const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
      family_id: familyId,
      category_value: cat.value,
      category_label: cat.label,
      category_emoji: cat.emoji
    }))

    const { error } = await supabase
      .from('family_categories')
      .insert(categoriesToInsert)

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES,
      message: 'Categoriile au fost resetate la cele implicite'
    })
  } catch (error) {
    console.error('Error resetting categories:', error)
    res.status(500).json({ error: 'Resetarea categoriilor a eșuat', errorKey: 'errCategoriesResetFailed' })
  }
}

export default requireEditor(handler)