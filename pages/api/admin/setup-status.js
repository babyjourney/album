import { requireAdmin } from '../../../lib/authMiddleware'
import { getSetupStatus } from '../../../lib/setupStatus'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(await getSetupStatus())
  } catch (error) {
    console.error('setup-status error:', error)
    res.status(500).json({ error: 'Nu s-a putut verifica configurarea', errorKey: 'errServerInternal', details: error.message })
  }
}

export default requireAdmin(handler)
