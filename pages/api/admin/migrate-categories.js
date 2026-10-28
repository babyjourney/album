import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { healAllFamiliesCategories } from '../../../lib/categoryMigration'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }
  try {
    const { migrated, relabeled } = await healAllFamiliesCategories()
    res.status(200).json({
      success: true,
      migrated,
      relabeled,
      message: `${migrated} famili${migrated === 1 ? 'e mutată' : 'i mutate'} pe noul set de categorii; ${relabeled} famili${relabeled === 1 ? 'e' : 'i'} cu denumirile implicite readuse la forma canonică`,
    })
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ error: 'Migrarea categoriilor a eșuat', errorKey: 'errServerInternal', details: error.message })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
