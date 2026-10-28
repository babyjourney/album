import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId } from '../../../lib/childRecord'
import { sendEmail, isDeliveryUsable } from '../../../lib/notifications'

const SERVICES = {
  printedFamilyTreePoster: 'Poster Arbore Genealogic (printat)',
  printedYearbook: 'Anuar printat 20×20cm',
  doneForYouSetup: 'Configurare Done-For-You',
  contentUploadAssistance: 'Asistență încărcare conținut',
  memoryOrganization: 'Organizare amintiri',
  dataMigration: 'Migrare date',
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda nu este permisă' })
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })

  const { service, message } = req.body || {}
  if (!service || !SERVICES[service]) {
    return res.status(400).json({ error: 'Serviciul solicitat nu există', errorKey: 'errConciergeServiceInvalid' })
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
      html: `<div style="font-family:sans-serif">${lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>`,
    })

    if (!isDeliveryUsable(result)) {
      console.error(`[concierge] request "${service}" from family ${familyId} was NOT delivered${result?.mocked ? ' (RESEND_API_KEY missing)' : `: ${result?.error || 'unknown error'}`}`)
      return res.status(503).json({
        error: 'Cererea nu a putut fi trimisă acum. Te rugăm să încerci din nou mai târziu.',
        errorKey: 'errConciergeUnavailable',
      })
    }

    return res.status(200).json({ success: true, notified: true, mocked: !!result.mocked })
  } catch (err) {
    console.error('concierge request error:', err)
    return res.status(500).json({ error: 'Eroare internă', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(requireFeature('memoryOrganization', handler))
