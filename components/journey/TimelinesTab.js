import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import FilteredPosts from './FilteredPosts'

const VIEWS = [
  { id: 'birth',  labelKey: 'timelineBirth',   params: { ageMinMonths: 0,   ageMaxMonths: 12 } },
  { id: 'toddler',labelKey: 'timelineToddler', params: { ageMinMonths: 12,  ageMaxMonths: 48 } },
  { id: 'school', labelKey: 'timelineSchool',  params: { ageMinMonths: 48,  ageMaxMonths: 156 } },
  { id: 'teen',   labelKey: 'timelineTeen',    params: { ageMinMonths: 156, ageMaxMonths: 240 } },
  { id: 'skills', labelKey: 'timelineSkills',  params: { categoryAny: 'milestones,achievements', hashtagsAny: 'skill,abilitate,achievement,realizare,milestone,medal,medalie,award,premiu,trophy' } },
]

export default function TimelinesTab({ familyId, childId }) {
  const [active, setActive] = useState('birth')
  const { t } = useLanguage()
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
            {t(v.labelKey)}
          </button>
        ))}
      </div>
      <section className="card-glass" style={{ padding: 20 }}>
        <FilteredPosts
          familyId={familyId}
          childId={childId}
          params={view.params}
          emptyText={view.id === 'skills'
            ? t('noSkillPostsYet')
            : t('noPostsInAgeRange')}
        />
      </section>
    </div>
  )
}
