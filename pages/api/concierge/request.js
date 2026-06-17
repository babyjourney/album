// Legacy concierge service requests (printed poster, yearbook, done-for-you,
// content help, memory organization, data migration). These are human-fulfilled
// services — the software part is recording the request and notifying the team.
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId } from '../../../lib/childRecord'
import { sendEmail } from '../../../lib/notifications'

const SERVICES = {
  printedFamilyTreePoster: 'Poster Arbore Genealogic (printat)',
  printedYearbook: 'Anuar printat 20×20cm',
  doneForYouSetup: 'Configurare Done-For-You',
  contentUploadAssistance: 'Asistență încărcare conținut',
  memoryOrganization: 'Organizare amintiri',
  dataMigration: 'Migrare date',
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda nu este permisă' })
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  const { service, message } = req.body || {}
  if (!service || !SERVICES[service]) {
    return res.status(400).json({ error: 'Serviciu invalid' })
  }

  try {
    const { data: fam } = await supabase
      .from('families').select('name, email, phone_number, package').eq('id', familyId).single()

    const serviceLabel = SERVICES[service]
    const to = process.env.ADMIN_NOTIFY_EMAIL || 'concierge@babyjourney.life'
    const lines = [
      `Cerere serviciu Legacy: ${serviceLabel}`,
      `Familie: ${fam?.name || familyId} (${familyId})`,
      `Plan: ${fam?.package || '—'}`,
      `Contact: ${fam?.email || '—'} / ${fam?.phone_number || '—'}`,
      message ? `Mesaj: ${message}` : null,
    ].filter(Boolean)

    const result = await sendEmail({
      to,
      subject: `[Concierge] ${serviceLabel} — ${fam?.name || familyId}`,
      text: lines.join('\n'),
      html: `<div style="font-family:sans-serif">${lines.map(l => `<p>${l}</p>`).join('')}</div>`,
    })

    return res.status(200).json({ success: true, notified: result.ok, mocked: result.mocked || false })
  } catch (err) {
    console.error('concierge request error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

// Any Legacy-only feature gates access (all concierge services are Legacy).
export default requireAuthOrAdmin(requireFeature('memoryOrganization', handler))
