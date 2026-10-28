import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { ESSENTIAL_CATEGORIES } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { value } = req.body || {}
  const familyId = req.auth.familyId

  if (!value) {
    return res.status(400).json({ error: 'Valoarea categoriei este obligatorie', errorKey: 'errCategoryValueRequired' })
  }

  if (ESSENTIAL_CATEGORIES.includes(value)) {
    return res.status(400).json({ error: 'Categoriile de bază nu pot fi șterse', errorKey: 'errCategoryEssential' })
  }

  try {
    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', value)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Categoria nu a fost găsită', errorKey: 'errCategoryNotFound' })
    }

    const { error } = await supabase
      .from('family_categories')
      .delete()
      .eq('family_id', familyId)
      .eq('category_value', value)

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      message: 'Categoria a fost ștearsă'
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    res.status(500).json({ error: 'Ștergerea categoriei a eșuat', errorKey: 'errCategoryDeleteFailed' })
  }
}

export default requireEditor(requireFeature('customCategories', handler))