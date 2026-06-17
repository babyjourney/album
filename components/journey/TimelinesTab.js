// Age timelines + skills/achievements — each is a filtered view over existing
// posts. Age windows use the child's birth_date (handled server-side).
import { useState } from 'react'
import FilteredPosts from './FilteredPosts'

const VIEWS = [
  { id: 'birth',  label: 'Naștere (0–1 an)',     params: { ageMinMonths: 0,   ageMaxMonths: 12 } },
  { id: 'toddler',label: 'Anii mici (1–4 ani)',  params: { ageMinMonths: 12,  ageMaxMonths: 48 } },
  { id: 'school', label: 'Anii de școală (4–13)', params: { ageMinMonths: 48,  ageMaxMonths: 156 } },
  { id: 'teen',   label: 'Adolescență (13–20)',   params: { ageMinMonths: 156, ageMaxMonths: 240 } },
  { id: 'skills', label: 'Abilități & Realizări',  params: { categoryAny: 'milestones,achievements', hashtagsAny: 'skill,abilitate,achievement,realizare,milestone,medal,medalie,award,premiu,trophy' } },
]

export default function TimelinesTab({ familyId, childId }) {
  const [active, setActive] = useState('birth')
  const view = VIEWS.find((v) => v.id === active) || VIEWS[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v.id)}
            className={active === v.id ? 'category-pill category-pill--selected sheen' : 'category-pill'}
            style={{ padding: '7px 14px', fontSize: 13 }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <section className="card-glass" style={{ padding: 20 }}>
        <FilteredPosts
          familyId={familyId}
          childId={childId}
          params={view.params}
          emptyText={view.id === 'skills'
            ? 'Nicio postare etichetată cu abilități/realizări încă.'
            : 'Nicio postare în acest interval de vârstă. (Necesită data nașterii copilului.)'}
        />
      </section>
    </div>
  )
}
