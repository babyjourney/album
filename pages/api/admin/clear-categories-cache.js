// Simple endpoint to trigger cache clearing and localStorage sync
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    res.status(200).json({
      success: true,
      message: 'Cache clear signal sent. Client should reload categories from localStorage.',
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error clearing categories cache:', error)
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    })
  }
}

export default requireAdmin(handler)
