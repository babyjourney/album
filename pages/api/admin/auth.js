import { issueAdminToken } from '../../../lib/authMiddleware'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username și parola sunt obligatorii' })
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = issueAdminToken()

    return res.status(200).json({
      success: true,
      token,
      message: 'Conectat cu succes ca administrator'
    })
  } else {
    return res.status(401).json({
      error: 'Username sau parolă incorectă'
    })
  }
}
