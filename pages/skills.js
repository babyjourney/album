import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, isEditor } from '../lib/pinAuth'
import { getSkillCategories, SKILL_CATEGORIES } from '../lib/skillsData'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import Header from '../components/Header'

export default function Skills() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skillsProgress, setSkillsProgress] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [updatingSkill, setUpdatingSkill] = useState(null)
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
      const response = await fetch(`/api/skills/progress?familyId=${session.familyId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('loading'))
      }

      const progressMap = {}
      result.skills.forEach(skill => {
        progressMap[skill.skill_id] = skill
      })
      setSkillsProgress(progressMap)
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
      setSkillsProgress(prev => ({
        ...prev,
        [skillId]: result.skill
      }))

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

    return (
      <div
        key={skill.id}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          opacity: isUpdating ? 0.7 : 1,
          transition: 'opacity 0.2s'
        }}
      >
        {/* Skill Image */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          background: '#f8fafc'
        }}>
          <img
            src={getSkillImage(skill.id, category)}
            alt={skill.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentNode.innerHTML = '<div style="color: #9ca3af; font-size: 20px; display: flex; align-items: center; justify-content: center; height: 100%;">📋</div>'
            }}
          />
        </div>

        {/* Skill Info */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ 
              fontWeight: '500', 
              fontSize: '15px',
              color: '#374151',
              margin: 0,
              marginBottom: '2px'
            }}>
              {skill.name}
            </h3>
          </div>

          {/* Simple Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              flex: 1,
              height: '4px',
              background: '#f1f5f9',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: progress < 50 ? '#f59e0b' : '#10b981',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <span style={{ 
              fontSize: '13px',
              color: '#6b7280',
              minWidth: '32px'
            }}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Simple Controls */}
        {hasEditorAccess && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => updateSkillProgress(skill.id, skill.name, category, Math.max(0, progress - 10))}
              disabled={isUpdating || progress <= 0}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: progress <= 0 ? '#f3f4f6' : '#fef3c7',
                color: progress <= 0 ? '#9ca3af' : '#d97706',
                cursor: progress <= 0 || isUpdating ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                opacity: progress <= 0 ? 0.5 : 1
              }}
            >
              -10
            </button>
            <button
              onClick={() => updateSkillProgress(skill.id, skill.name, category, Math.min(100, progress + 10))}
              disabled={isUpdating || progress >= 100}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: progress >= 100 ? '#f3f4f6' : '#dcfce7',
                color: progress >= 100 ? '#9ca3af' : '#16a34a',
                cursor: progress >= 100 || isUpdating ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                opacity: progress >= 100 ? 0.5 : 1
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--bg-gray)',
          borderTop: '3px solid var(--accent-blue)',
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-gray)' }}>
      {/* Header */}
      <Header 
        familyName={session.familyName} 
        role={session.role}
      />

      <div className="main-container">
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '4px'
              }}>
{session.familyName} - {t('skills')}
              </h1>
              <p style={{ 
                fontSize: '14px',
                color: '#9ca3af'
              }}>
{t('skillsTracker')}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                background: 'white',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--bg-gray)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'white'
              }}
            >
← {t('back')} {t('album')}
            </button>
          </div>

          {/* Simple Progress */}
          <div style={{ 
            marginBottom: '20px',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ 
                fontSize: '14px',
                color: '#6b7280'
              }}>
{selectedCategory === 'all' ? t('all') : getSkillCategories(t)[selectedCategory]?.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '100px',
                height: '6px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getOverallProgress(selectedCategory)}%`,
                  height: '100%',
                  background: '#10b981',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <span style={{ 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                minWidth: '32px'
              }}>
                {getOverallProgress(selectedCategory)}%
              </span>
            </div>
          </div>

          {/* Simple Filter */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px'
            }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: selectedCategory === 'all' ? '#3b82f6' : '#f3f4f6',
                  color: selectedCategory === 'all' ? 'white' : '#6b7280'
                }}
              >
{t('all')}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: selectedCategory === category ? '#3b82f6' : '#f3f4f6',
                    color: selectedCategory === category ? 'white' : '#6b7280'
                  }}
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
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                  marginBottom: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
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

        {/* Simple viewer note */}
        {!hasEditorAccess && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '24px',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '13px'
          }}>
{t('info')}: {t('edit')} PIN
          </div>
        )}
      </div>
    </div>
  )
}