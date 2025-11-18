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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div ref={modalRef} style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)'
          }}>
{t('categoryManagement')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Reset Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleResetToDefaults}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-gray)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-secondary)'
            }}
          >
            <RotateCcw size={16} />
            {t('resetToDefaults')}
          </button>
        </div>

        {/* Add New Category */}
        <div style={{
          background: 'var(--bg-gray)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '12px',
            color: 'var(--text-primary)'
          }}>
            {t('addNewCategory')}
          </h3>
          
          {isAdding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="emoji (ex: 🎨)"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, emoji: e.target.value }))}
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="text"
                  placeholder="Numele categoriei"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewCategory({ value: '', label: '', emoji: '📝' })
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddCategory}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
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
              style={{
                padding: '8px 16px',
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'white',
                border: '1px solid var(--border-light)',
                borderRadius: '8px'
              }}
            >
              {editingCategory && editingCategory.value === category.value ? (
                <>
                  <input
                    type="text"
                    value={editingCategory.emoji}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, emoji: e.target.value }))}
                    style={{
                      width: '50px',
                      padding: '4px 8px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}
                  />
                  <input
                    type="text"
                    value={editingCategory.label}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, label: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleUpdateCategory(category.value)}
                      style={{
                        padding: '6px',
                        background: 'var(--accent-blue)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      style={{
                        padding: '6px',
                        background: 'var(--bg-gray)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
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
                  <span style={{ flex: 1, fontWeight: '500' }}>
                    {category.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {category.value}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setEditingCategory({ ...category })}
                      style={{
                        padding: '6px',
                        background: 'var(--bg-gray)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    {!['memories', 'family'].includes(category.value) && (
                      <button
                        onClick={() => handleDeleteCategory(category.value)}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
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