import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { healAllFamiliesCategories } from '../../../lib/categoryMigration'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { migrated } = await healAllFamiliesCategories()
    res.status(200).json({
      success: true,
      migrated,
      message: `${migrated} famili${migrated === 1 ? 'e' : 'i'} mutate pe noul set de categorii`,
    })
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ error: 'Migration failed', details: error.message })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
