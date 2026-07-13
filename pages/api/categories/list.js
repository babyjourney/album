import { supabase } from '../../../lib/supabaseClient'
import { requireAuth } from '../../../lib/authMiddleware'
import { ensureFamilyCategories } from '../../../lib/categoryMigration'
import { DEFAULT_CATEGORIES } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const familyId = req.auth.familyId

  try {
    // Use the auto-migration function
    const categories = await ensureFamilyCategories(familyId)

    res.status(200).json({
      success: true,
      categories: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    // Fallback to defaults on any error
    res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES
    })
  }
}

// requireAuth, not requireEditor: viewers (grandparents) need the category
// list to use the filter drawer. Reading the category names is not an edit.
export default requireAuth(handler)