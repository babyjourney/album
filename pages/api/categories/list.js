import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { resolveFamilyId } from '../../../lib/childRecord'
import { ensureFamilyCategories } from '../../../lib/categoryMigration'
import { DEFAULT_CATEGORIES } from '../../../lib/defaultCategories'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const familyId = resolveFamilyId(req)
  if (!familyId) {
    return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })
  }

  try {
    const categories = await ensureFamilyCategories(familyId)

    res.status(200).json({
      success: true,
      categories: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES
    })
  }
}

export default requireAuthOrAdmin(handler)