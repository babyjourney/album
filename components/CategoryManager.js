import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, RotateCcw, Save, X } from 'lucide-react'
import { getCategories, addCategory, updateCategory, deleteCategory, resetToDefaults } from '../lib/categoriesData'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'

export default function CategoryManager({ isOpen, onClose, onCategoriesUpdate }) {
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({ value: '', label: '', emoji: '📝' })
  const [isAdding, setIsAdding] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const modalRef = useRef(null)

  // Handle click outside to close modal
  useOnClickOutside(modalRef, onClose)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
      showError('Eroare la încărcarea categoriilor')
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.value.trim() || !newCategory.label.trim()) {
      showError(t('error'))
      return
    }

    // Check if value already exists
    if (categories.some(cat => cat.value === newCategory.value.trim())) {
      showError(t('error'))
      return
    }

    try {
      const categoryToAdd = {
        value: newCategory.value.trim().toLowerCase().replace(/\s+/g, '-'),
        label: newCategory.label.trim(),
        emoji: newCategory.emoji
      }

      console.log('Adding category:', categoryToAdd)
      const updatedCategories = await addCategory(categoryToAdd)
      console.log('Category added, updated list:', updatedCategories)
      setCategories(updatedCategories)
      setNewCategory({ value: '', label: '', emoji: '📝' })
      setIsAdding(false)
      onCategoriesUpdate?.(updatedCategories)
      showSuccess(t('success'))
    } catch (error) {
      console.error('Add category error:', error)
      if (error.message.includes('migration')) {
        showError('Sistemul de categorii necesită migrare. Contactează administratorul.')
      } else {
        showError(t('error'))
      }
    }
  }

  const handleUpdateCategory = async (categoryValue) => {
    if (!editingCategory.label.trim()) {
      showError('Numele categoriei nu poate fi gol')
      return
    }

    try {
      const updatedCategories = await updateCategory(categoryValue, editingCategory)
      setCategories(updatedCategories)
      setEditingCategory(null)
      onCategoriesUpdate?.(updatedCategories)
      showSuccess(t('success'))
    } catch (error) {
      showError('Eroare la actualizarea categoriei')
    }
  }

  const handleDeleteCategory = async (categoryValue) => {
    if (window.confirm(t('confirmDeleteText'))) {
      try {
        const updatedCategories = await deleteCategory(categoryValue)
        setCategories(updatedCategories)
        onCategoriesUpdate?.(updatedCategories)
        showSuccess(t('success'))
      } catch (error) {
        showError(t('error'))
      }
    }
  }

  const handleResetToDefaults = async () => {
    if (window.confirm(t('confirmResetCategories'))) {
      try {
        const defaultCategories = await resetToDefaults()
        setCategories(defaultCategories)
        onCategoriesUpdate?.(defaultCategories)
        showSuccess('Categoriile au fost resetate la valorile implicite!')
      } catch (error) {
        showError('Eroare la resetarea categoriilor')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-scrim">
      <div
        ref={modalRef}
        className="modal-glass"
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '82vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '24px'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingRight: '44px'
        }}>
          <h2 className="text-section-title" style={{ margin: 0, color: 'var(--ink-1)' }}>
            {t('categoryManagement')}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ position: 'absolute', top: 14, right: 14 }}
            aria-label="Închide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Reset Button */}
        <div style={{ marginBottom: '18px' }}>
          <button
            onClick={handleResetToDefaults}
            className="btn-glass"
            style={{
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '14px'
            }}
          >
            <RotateCcw size={15} />
            {t('resetToDefaults')}
          </button>
        </div>

        {/* Add New Category */}
        <div
          className="glass-soft"
          style={{
            padding: '18px',
            borderRadius: '18px',
            marginBottom: '20px',
            border: '1px solid var(--glass-hairline)'
          }}
        >
          <h3
            className="text-eyebrow"
            style={{
              marginTop: 0,
              marginBottom: '12px',
              color: 'var(--ink-2)'
            }}
          >
            {t('addNewCategory')}
          </h3>

          {isAdding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="emoji (ex: 🎨)"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, emoji: e.target.value }))}
                  className="input-glass"
                  style={{
                    width: '88px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="text"
                  placeholder="Numele categoriei"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  className="input-glass"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewCategory({ value: '', label: '', emoji: '📝' })
                  }}
                  className="btn-glass"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    fontSize: '14px'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddCategory}
                  className="btn-iris sheen"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={14} />
                  {t('save')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="btn-iris sheen"
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              {t('addNewCategory')}
            </button>
          )}
        </div>

        {/* Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((category) => (
            <div
              key={category.value}
              className="glass-soft"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid var(--glass-hairline)',
                transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {editingCategory && editingCategory.value === category.value ? (
                <>
                  <input
                    type="text"
                    value={editingCategory.emoji}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, emoji: e.target.value }))}
                    className="input-glass"
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      textAlign: 'center'
                    }}
                  />
                  <input
                    type="text"
                    value={editingCategory.label}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, label: e.target.value }))}
                    className="input-glass"
                    style={{
                      flex: 1,
                      padding: '6px 10px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleUpdateCategory(category.value)}
                      className="btn-icon"
                      style={{
                        width: 34,
                        height: 34,
                        background: 'linear-gradient(135deg, var(--accent-iris), #6366f1)',
                        color: '#fff',
                        borderColor: 'transparent'
                      }}
                      aria-label={t('save')}
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="btn-icon"
                      style={{ width: 34, height: 34 }}
                      aria-label={t('cancel')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px', width: '30px', textAlign: 'center' }}>
                    {category.emoji}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500, color: 'var(--ink-1)' }}>
                    {category.label}
                  </span>
                  <span className="text-tertiary" style={{ fontSize: '12px' }}>
                    {category.value}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingCategory({ ...category })}
                      className="btn-icon"
                      style={{ width: 34, height: 34 }}
                      aria-label="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!['memories', 'family'].includes(category.value) && (
                      <button
                        onClick={() => handleDeleteCategory(category.value)}
                        className="btn-icon"
                        style={{
                          width: 34,
                          height: 34,
                          color: 'var(--accent-red)'
                        }}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
