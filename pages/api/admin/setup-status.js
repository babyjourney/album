import { requireAdmin } from '../../../lib/authMiddleware'
import { getSetupStatus } from '../../../lib/setupStatus'

// What's still missing on this deployment (SQL migration, storage limit, email/
// SMS keys, 2FA bypass). Shown as a banner on the admin dashboard.
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    res.status(200).json(await getSetupStatus())
  } catch (error) {
    console.error('setup-status error:', error)
    res.status(500).json({ error: 'Nu s-a putut verifica configurarea', details: error.message })
  }
}

export default requireAdmin(handler)
