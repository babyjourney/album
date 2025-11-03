import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { value } = req.body
  const familyId = req.auth.familyId

  if (!value) {
    return res.status(400).json({ error: 'Category value is required' })
  }

  // Prevent deleting essential categories
  const essentialCategories = ['memories', 'family']
  if (essentialCategories.includes(value)) {
    return res.status(400).json({ error: 'Cannot delete essential categories' })
  }

  try {
    // Check if the category exists for this family
    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', value)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Delete category
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
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    res.status(500).json({ error: 'Failed to delete category' })
  }
}

export default requireEditor(handler)