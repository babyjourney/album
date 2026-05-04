import { useEffect, useState } from 'react'

// Returns: { children, isMultiChild, loading }
// Fetches album settings, and only fetches the child list if the album is in
// multi-child mode.
export function useChildren(familyId) {
  const [children, setChildren] = useState([])
  const [isMultiChild, setIsMultiChild] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!familyId) { setLoading(false); return }

    async function load() {
      try {
        setLoading(true)
        const sRes = await fetch(`/api/album-settings/get?familyId=${familyId}`)
        const sJson = await sRes.json()
        if (cancelled) return

        if (sRes.ok && sJson.settings?.is_multi_child) {
          setIsMultiChild(true)
          const cRes = await fetch(`/api/children/list?familyId=${familyId}`)
          const cJson = await cRes.json()
          if (cancelled) return
          if (cRes.ok) setChildren(cJson.children || [])
        } else {
          setIsMultiChild(false)
          setChildren([])
        }
      } catch (e) {
        if (!cancelled) console.error('useChildren error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [familyId])

  return { children, isMultiChild, loading }
}
