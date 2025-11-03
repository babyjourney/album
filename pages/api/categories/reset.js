import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

// Default categories
const DEFAULT_CATEGORIES = [
  { value: 'memories', label: 'Amintiri', emoji: '💭' },
  { value: 'milestones', label: 'Etape importante', emoji: '🎯' },
  { value: 'everyday', label: 'Zilnic', emoji: '☀️' },
  { value: 'special', label: 'Special', emoji: '✨' },
  { value: 'family', label: 'Familie', emoji: '👨‍👩‍👧‍👦' },
  { value: 'play', label: 'Joacă', emoji: '🎮' },
  { value: 'learning', label: 'Învățare', emoji: '📚' }
]

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const familyId = req.auth.familyId

  try {
    // Delete all existing categories for this family
    await supabase
      .from('family_categories')
      .delete()
      .eq('family_id', familyId)

    // Insert default categories
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
      message: 'Categories reset to defaults'
    })
  } catch (error) {
    console.error('Error resetting categories:', error)
    res.status(500).json({ error: 'Failed to reset categories' })
  }
}

export default requireEditor(handler)