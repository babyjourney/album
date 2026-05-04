import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, isEditor, clearSession } from '../lib/pinAuth'
import { getSkillCategories, SKILL_CATEGORIES } from '../lib/skillsData'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'

export default function Skills() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skillsProgress, setSkillsProgress] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [updatingSkill, setUpdatingSkill] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (session?.familyId) {
      fetchSkillsProgress()
    }
  }, [session])

  const checkAuth = () => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const userSession = getSession()
    setSession(userSession)
    setLoading(false)
  }

  const fetchSkillsProgress = async () => {
    try {
      const familyId = session.familyId

      // Check cache first
      const cacheKey = `skillsProgress_${familyId}`
      const cacheTimeKey = `${cacheKey}_time`
      const cached = sessionStorage.getItem(cacheKey)
      const cacheTime = sessionStorage.getItem(cacheTimeKey)
      const now = Date.now()
      const cacheAge = 2 * 60 * 1000 // 2 minutes cache for skills

      if (cached && cacheTime && (now - parseInt(cacheTime)) < cacheAge) {
        const progressMap = JSON.parse(cached)
        setSkillsProgress(progressMap)
        return
      }

      const response = await fetch(`/api/skills/progress?familyId=${familyId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('loading'))
      }

      const progressMap = {}
      result.skills.forEach(skill => {
        progressMap[skill.skill_id] = skill
      })

      setSkillsProgress(progressMap)

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify(progressMap))
      sessionStorage.setItem(cacheTimeKey, now.toString())
    } catch (error) {
      console.error('Error fetching skills progress:', error)
      showError(t('loading'))
    }
  }

  const updateSkillProgress = async (skillId, skillName, skillCategory, progress, notes = '') => {
    if (!isEditor()) return

    setUpdatingSkill(skillId)
    try {
      const response = await fetch('/api/skills/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId: session.familyId,
          skillId,
          skillName,
          skillCategory,
          progress,
          notes
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('error'))
      }

      // Update local state
      const newProgressMap = {
        ...skillsProgress,
        [skillId]: result.skill
      }
      setSkillsProgress(newProgressMap)

      // Update cache
      const cacheKey = `skillsProgress_${session.familyId}`
      const cacheTimeKey = `${cacheKey}_time`
      sessionStorage.setItem(cacheKey, JSON.stringify(newProgressMap))
      sessionStorage.setItem(cacheTimeKey, Date.now().toString())

      showSuccess(t('success'))
    } catch (error) {
      console.error('Error updating skill progress:', error)
      showError(t('error'))
    } finally {
      setUpdatingSkill(null)
    }
  }

  const getOverallProgress = (category) => {
    const skillCategories = getSkillCategories(t)
    if (category === 'all') {
      let totalProgress = 0
      let totalSkills = 0

      Object.values(skillCategories).forEach(cat => {
        cat.skills.forEach(skill => {
          const progress = skillsProgress[skill.id]?.progress || 0
          totalProgress += progress
          totalSkills++
        })
      })

      return totalSkills > 0 ? Math.round(totalProgress / totalSkills) : 0
    } else {
      const categorySkills = skillCategories[category]?.skills || []
      let totalProgress = 0

      categorySkills.forEach(skill => {
        const progress = skillsProgress[skill.id]?.progress || 0
        totalProgress += progress
      })

      return categorySkills.length > 0 ? Math.round(totalProgress / categorySkills.length) : 0
    }
  }

  const getSkillImage = (skillId, category) => {
    // Match skill names with actual image file names based on content
    const imageMap = {
      // Physical Skills - match with skill content
      'skill_1': '/1. Physical Skills (Motor Development)/1. Walking.png', // Abilități Motorii Globale
      'skill_2': '/1. Physical Skills (Motor Development)/5. Throwing and Catching a Ball.png', // Abilități Motorii Fine
      'skill_3': '/1. Physical Skills (Motor Development)/4. Balancing.png', // Echilibru și Coordonare
      'skill_4': '/1. Physical Skills (Motor Development)/2. Running.png', // Alergat și Sărit
      'skill_5': '/1. Physical Skills (Motor Development)/5. Throwing and Catching a Ball.png', // Coordonare Ochi-Mână

      // Cognitive Skills - match with learning content
      'skill_6': '/2. Cognitive Skills/1. Object Recognition.png', // Memorie și Amintire
      'skill_7': '/2. Cognitive Skills/3. Solving Puzzles.png', // Rezolvarea Problemelor
      'skill_8': '/2. Cognitive Skills/6. Logical thinking & problem-solving.png', // Gândire Logică
      'skill_9': '/2. Cognitive Skills/1. Object Recognition.png', // Atenție și Concentrare
      'skill_10': '/2. Cognitive Skills/5. Basic Math (Adding, Subtracting).png', // Concepte Matematice

      // Language & Communication - match with speaking/reading
      'skill_11': '/3. Language & Communication/1. First words.png', // Comunicare Verbală
      'skill_12': '/2. Cognitive Skills/4. Reading.png', // Abilități de Citire
      'skill_13': '/3. Language & Communication/4. Writing Words and Sentences.png', // Abilități de Scriere
      'skill_14': '/4. Social and Emotional Skills/6. Empathy and Active Listening.png', // Abilități de Ascultare
      'skill_15': '/3. Language & Communication/2. Sentence forming.png', // Dezvoltarea Vocabularului

      // Social and Emotional Skills - match with social interactions
      'skill_16': '/4. Social and Emotional Skills/2. Sharing and Turn-Taking.png', // Împărțire și Cooperare
      'skill_17': '/4. Social and Emotional Skills/6. Empathy and Active Listening.png', // Empatie și Înțelegere
      'skill_18': '/4. Social and Emotional Skills/1. Expressing emotions.png', // Reglarea Emoțiilor
      'skill_19': '/4. Social and Emotional Skills/4. Making Friends.png', // Făcutul de Prieteni
      'skill_20': '/4. Social and Emotional Skills/5. Handling Conflict and Stress.png', // Rezolvarea Conflictelor

      // Self-Care & Independence - match with daily activities
      'skill_21': '/5. Self-Care & Independence/5. Personal Hygiene.png', // Igienă Personală
      'skill_22': '/5. Self-Care & Independence/4. Dressing and Undressing.png', // Îmbrăcare și Îngrijire
      'skill_23': '/5. Self-Care & Independence/3. Eating with utensils.png', // Mâncare Independentă
      'skill_24': '/5. Self-Care & Independence/6. Managing Personal Schedule.png', // Gestionarea Timpului
      'skill_25': '/5. Self-Care & Independence/7. Doing Simple Chores.png', // Responsabilitate și Treburi

      // Creative & Expressive Skills - match with artistic activities
      'skill_26': '/6. Creative & Expressive Skills/1. Drawing & Painting.png', // Desen și Pictură
      'skill_27': '/6. Creative & Expressive Skills/2. Singing or Playing an Instrument.png', // Muzică și Ritm
      'skill_28': '/6. Creative & Expressive Skills/3. Dancing.png', // Dans și Mișcare
      'skill_29': '/6. Creative & Expressive Skills/4. Acting or Role-playing.png', // Joc Imaginativ
      'skill_30': '/6. Creative & Expressive Skills/7. Creative Writing_Journaling.png', // Povestire

      // Digital & Modern Skills - match with technology use
      'skill_31': '/7. Digital & Modern Skills/2. Basic Computer Use.png', // Abilități de Bază cu Calculatorul
      'skill_32': '/7. Digital & Modern Skills/6. Understanding online safety.png', // Siguranță Digitală
      'skill_33': '/7. Digital & Modern Skills/5. Playing educational games.png', // Aplicații Educaționale
      'skill_34': '/7. Digital & Modern Skills/2. Basic Computer Use.png', // Conștientizarea Tehnologiei
      'skill_35': '/7. Digital & Modern Skills/5. Playing educational games.png' // Învățare Online
    }
    return imageMap[skillId] || '/1. Physical Skills (Motor Development)/1. Walking.png'
  }

  const renderSkillCard = (skill, category) => {
    const progress = skillsProgress[skill.id]?.progress || 0
    const isUpdating = updatingSkill === skill.id
    const hasEditorAccess = isEditor()

    // Tint level badge by progress band
    const levelTint =
      progress >= 75
        ? { bg: 'color-mix(in oklab, var(--accent-mint) 18%, transparent)', fg: 'var(--accent-mint)' }
        : progress >= 40
        ? { bg: 'color-mix(in oklab, var(--accent-iris) 18%, transparent)', fg: 'var(--accent-iris)' }
        : { bg: 'color-mix(in oklab, var(--accent-aqua) 18%, transparent)', fg: 'var(--accent-aqua)' }

    return (
      <div
        key={skill.id}
        className="skills-card card-glass"
        style={{
          padding: '18px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          opacity: isUpdating ? 0.7 : 1,
          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Skill Image */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--glass-1)',
          border: '1px solid var(--glass-hairline)'
        }}>
          <img
            src={getSkillImage(skill.id, category)}
            alt={skill.name}
            className="skill-emoji"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentNode.innerHTML = '<div style="color: var(--ink-3); font-size: 22px; display: flex; align-items: center; justify-content: center; height: 100%;">📋</div>'
            }}
          />
        </div>

        {/* Skill Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
            <h3 className="text-section-title" style={{ margin: 0, fontSize: '15px' }}>
              {skill.name}
            </h3>
            <span
              className="glass-pill"
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: levelTint.fg,
                background: levelTint.bg,
                borderRadius: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              {progress}%
            </span>
          </div>

          {/* Glass progress track */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              flex: 1,
              height: '6px',
              background: 'var(--glass-1)',
              border: '1px solid var(--glass-hairline)',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-iris), var(--accent-aqua))',
                borderRadius: '999px',
                transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        {hasEditorAccess && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => updateSkillProgress(skill.id, skill.name, category, Math.max(0, progress - 10))}
              disabled={isUpdating || progress <= 0}
              className="btn-glass"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '14px',
                opacity: progress <= 0 ? 0.5 : 1,
                cursor: progress <= 0 || isUpdating ? 'not-allowed' : 'pointer'
              }}
            >
              -10
            </button>
            <button
              onClick={() => updateSkillProgress(skill.id, skill.name, category, Math.min(100, progress + 10))}
              disabled={isUpdating || progress >= 100}
              className="btn-iris sheen"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '14px',
                opacity: progress >= 100 ? 0.5 : 1,
                cursor: progress >= 100 || isUpdating ? 'not-allowed' : 'pointer'
              }}
            >
              +10
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas)' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--glass-hairline)',
          borderTop: '3px solid var(--accent-iris)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const hasEditorAccess = isEditor()
  const skillCategories = getSkillCategories(t)
  const categories = Object.keys(skillCategories)
  const filteredCategories = selectedCategory === 'all' ? categories : [selectedCategory]
  const overall = getOverallProgress(selectedCategory)

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        albumTitle={session.familyName}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => setShowSignOutConfirm(true)}
      />
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={() => { setShowSettings(false); setShowSignOutConfirm(true) }}
      />
      {showSignOutConfirm && (
        <div className="modal-scrim" style={{ zIndex: 10000 }} onClick={() => setShowSignOutConfirm(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, padding: 28, textAlign: 'center' }}>
            <h3 className="text-section-title" style={{ fontSize: 18, marginBottom: 6 }}>Ieși din album?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 20 }}>
              Va trebui să te autentifici din nou cu PIN-ul.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSignOutConfirm(false)} className="btn-glass" style={{ flex: 1 }}>Rămân</button>
              <button
                onClick={() => { clearSession(); router.push('/login') }}
                className="sheen"
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'linear-gradient(135deg, #f87171, #dc2626)',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 14, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -6px rgba(220,38,38,0.45), inset 0 1px 0 0 rgba(255,255,255,0.30)',
                }}
              >Ieși</button>
            </div>
          </div>
        </div>
      )}

      <div className="main-container" style={{ paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))', paddingBottom: 'max(120px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: '28px 0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h1 className="text-display" style={{ marginBottom: '6px' }}>
                {session.familyName} · {t('skills')}
              </h1>
              <p className="text-subtle" style={{ fontSize: '14px', margin: 0 }}>
                {t('skillsTracker')}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-glass sheen"
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← {t('back')} {t('album')}
            </button>
          </div>

          {/* Overall progress card */}
          <div
            className="card-glass"
            style={{
              marginBottom: '20px',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '20px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="text-eyebrow">
                {selectedCategory === 'all' ? t('all') : skillCategories[selectedCategory]?.name}
              </span>
              <span className="text-body" style={{ fontWeight: 500 }}>
                {t('skillsTracker')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, justifyContent: 'flex-end', minWidth: '220px' }}>
              <div style={{
                flex: 1,
                maxWidth: '240px',
                height: '8px',
                background: 'var(--glass-1)',
                border: '1px solid var(--glass-hairline)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${overall}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-iris), var(--accent-aqua))',
                  borderRadius: '999px',
                  transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)'
                }}></div>
              </div>
              <span
                className="glass-pill"
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--ink-1)',
                  borderRadius: '14px',
                  minWidth: '52px',
                  textAlign: 'center'
                }}
              >
                {overall}%
              </span>
            </div>
          </div>

          {/* Category filter */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`category-pill${selectedCategory === 'all' ? ' category-pill--selected' : ''}`}
              >
                {t('all')}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`category-pill${selectedCategory === category ? ' category-pill--selected' : ''}`}
                >
                  {skillCategories[category].name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Grid */}
        {filteredCategories.map((category) => (
          <div key={category} style={{ marginBottom: '40px' }}>
            {selectedCategory === 'all' && (
              <div style={{ marginBottom: '14px' }}>
                <h3 className="text-section-title" style={{ margin: 0 }}>
                  {skillCategories[category].name}
                </h3>
              </div>
            )}

            <div>
              {skillCategories[category].skills.map((skill) =>
                renderSkillCard(skill, category)
              )}
            </div>
          </div>
        ))}

        {/* Viewer note */}
        {!hasEditorAccess && (
          <div
            className="glass-soft"
            style={{
              textAlign: 'center',
              marginTop: '24px',
              marginBottom: '32px',
              padding: '14px 18px',
              borderRadius: '20px',
              color: 'var(--ink-2)',
              fontSize: '13px'
            }}
          >
            {t('info')}: {t('edit')} PIN
          </div>
        )}
      </div>
    </div>
  )
}
