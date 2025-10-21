import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'

export default function SkillsTracker({ familyId, readOnly = false }) {
  const { t, language } = useLanguage()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchSkills()
  }, [familyId])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/skills/list?familyId=${familyId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load skills')
      }

      setSkills(result.skills || [])
    } catch (error) {
      console.error('Error fetching skills:', error)
      setError('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSkill = async (e) => {
    e.preventDefault()
    
    if (!newSkillName.trim()) {
      setError(t('skillName'))
      return
    }

    setAddingSkill(true)
    setError('')

    try {
      const response = await fetch('/api/skills/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          skillName: newSkillName.trim(),
          progress: 0
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add skill')
      }

      setNewSkillName('')
      setShowAddForm(false)
      await fetchSkills()
    } catch (error) {
      console.error('Error adding skill:', error)
      setError(t('error'))
    } finally {
      setAddingSkill(false)
    }
  }

  const handleUpdateProgress = async (skillId, newProgress) => {
    try {
      const response = await fetch('/api/skills/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillId,
          progress: newProgress
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update progress')
      }

      setSkills(skills.map(skill => 
        skill.id === skillId ? { ...skill, progress: newProgress } : skill
      ))
    } catch (error) {
      console.error('Error updating progress:', error)
      setError(t('error'))
    }
  }

  const handleDeleteSkill = async (skillId) => {
    if (!confirm(t('confirmDeleteText'))) {
      return
    }

    try {
      const response = await fetch('/api/skills/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete skill')
      }

      setSkills(skills.filter(skill => skill.id !== skillId))
    } catch (error) {
      console.error('Error deleting skill:', error)
      setError(t('error'))
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    if (progress >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">{t('skillsTracker')}</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {t('skillsTracker')} ({skills.length} {skills.length === 1 ? t('skillName') : t('skills')})
        </h2>
        {!readOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary text-sm"
          >
            {showAddForm ? t('cancel') : t('addSkill')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm mb-4">
          {error}
        </div>
      )}

      {!readOnly && showAddForm && (
        <form onSubmit={handleAddSkill} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-3">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder={t('skillName')}
              className="input flex-1"
              disabled={addingSkill}
            />
            <button
              type="submit"
              disabled={addingSkill}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingSkill ? t('uploading') : t('save')}
            </button>
          </div>
        </form>
      )}

      {skills.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🎯</div>
          <p>{t('noSkillsFound')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map((skill) => (
            <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{skill.skill_name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {skill.progress}%
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      {t('delete')}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(skill.progress)}`}
                    style={{ width: `${skill.progress}%` }}
                  ></div>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">{t('skillLevel')}:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={skill.progress}
                    onChange={(e) => handleUpdateProgress(skill.id, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
              
              {readOnly && (
                <div className="text-sm text-gray-500 text-center mt-2">
                  {t('skillLevel')}: {skill.progress}%
                </div>
              )}
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{t('beginner')}</span>
                <span>{t('expert')}</span>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {t('date')}: {new Date(skill.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'ro-RO')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}