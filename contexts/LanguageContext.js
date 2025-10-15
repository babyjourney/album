import React, { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export const translations = {
  ro: {
    // Header
    home: 'Acasă',
    signOut: 'Deconectare',
    confirmSignOut: 'Confirmare deconectare',
    signOutConfirmText: 'Sunteți sigur că doriți să vă deconectați? Va trebui să vă autentificați din nou pentru a accesa albumul.',
    cancel: 'Anulează',
    disconnect: 'Deconectează',
    album: 'Album',
    skills: 'Skills',
    
    // Post creation/editing
    createPost: 'Creaza postare',
    editPost: 'Editează postarea',
    postCreationFailed: 'Crearea postării a eșuat',
    postCreationFailedRetry: 'Crearea postării a eșuat. Vă rugăm să încercați din nou.',
    
    // Upload
    upload: 'Încarcă',
    uploadPhoto: 'Încarcă fotografia',
    uploadTitle: 'Introduceți un titlu pentru fotografia dumneavoastră',
    
    // General
    date: 'Data',
    category: 'Categorie',
    download: 'Descarcă',
    edit: 'Editează',
    delete: 'Șterge',
    save: 'Salvează',
    
    // Date picker
    selectDate: 'Selectează data',
    postDate: 'Data postării',
    day: 'Zi',
    month: 'Luna',
    year: 'Anul',
    
    // Categories
    family: 'Familie',
    travel: 'Călătorie',
    first: 'Prima dată',
    siblings: 'Frați',
    events: 'Evenimente',
    school: 'Școală',
    
    // Filters and search
    searchAndFilters: 'Căutare și Filtre',
    filtersAndSearch: 'Filtre și Căutare',
    search: 'Căutare',
    categories: 'Categorii',
    data: 'Data',
    hashtag: 'Hashtag',
    sorting: 'Sortare',
    all: 'Toate',
    newest: 'Cel mai nou',
    oldest: 'Cel mai vechi',
    titleAZ: 'Titlu A-Z',
    titleZA: 'Titlu Z-A',
    clearAllFilters: 'Șterge toate filtrele',
    manage: 'Gestionează',
    title: 'Titlu',
    
    // Children filter
    filterByChild: 'Filtrează după copil',
    allPosts: 'Toate postările',
    
    // Category management
    categoryManagement: 'Gestionare Categorii',
    resetToDefaults: 'Resetează la categoriile implicite',
    addNewCategory: 'Adaugă categorie nouă',
    confirmResetCategories: 'Sunteți sigur că doriți să resetați la categoriile implicite? Toate categoriile personalizate vor fi șterse.',
    categoriesResetSuccess: 'Categoriile au fost resetate la valorile implicite!'
  },
  ru: {
    // Header
    home: 'Главная',
    signOut: 'Выйти',
    confirmSignOut: 'Подтверждение выхода',
    signOutConfirmText: 'Вы уверены, что хотите выйти? Вам нужно будет войти снова, чтобы получить доступ к альбому.',
    cancel: 'Отмена',
    disconnect: 'Выйти',
    album: 'Альбом',
    skills: 'Навыки',
    
    // Post creation/editing
    createPost: 'Создать пост',
    editPost: 'Редактировать пост',
    postCreationFailed: 'Не удалось создать пост',
    postCreationFailedRetry: 'Не удалось создать пост. Пожалуйста, попробуйте еще раз.',
    
    // Upload
    upload: 'Загрузить',
    uploadPhoto: 'Загрузить фото',
    uploadTitle: 'Введите название для вашей фотографии',
    
    // General
    date: 'Дата',
    category: 'Категория',
    download: 'Скачать',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    
    // Date picker
    selectDate: 'Выберите дату',
    postDate: 'Дата поста',
    day: 'День',
    month: 'Месяц',
    year: 'Год',
    
    // Categories
    family: 'Семья',
    travel: 'Путешествие',
    first: 'Первый раз',
    siblings: 'Братья и сестры',
    events: 'События',
    school: 'Школа',
    
    // Filters and search
    searchAndFilters: 'Поиск и Фильтры',
    filtersAndSearch: 'Фильтры и Поиск',
    search: 'Поиск',
    categories: 'Категории',
    data: 'Дата',
    hashtag: 'Хештег',
    sorting: 'Сортировка',
    all: 'Все',
    newest: 'Новые',
    oldest: 'Старые',
    titleAZ: 'Название А-Я',
    titleZA: 'Название Я-А',
    clearAllFilters: 'Очистить все фильтры',
    manage: 'Управлять',
    title: 'Название',
    
    // Children filter
    filterByChild: 'Фильтр по ребенку',
    allPosts: 'Все посты',
    
    // Category management
    categoryManagement: 'Управление Категориями',
    resetToDefaults: 'Сбросить к стандартным',
    addNewCategory: 'Добавить новую категорию',
    confirmResetCategories: 'Вы уверены, что хотите сбросить к стандартным категориям? Все пользовательские категории будут удалены.',
    categoriesResetSuccess: 'Категории сброшены к стандартным значениям!'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ro')

  useEffect(() => {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem('selectedLanguage')
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage)
    }
  }, [])

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage)
      localStorage.setItem('selectedLanguage', newLanguage)
    }
  }

  const t = (key) => {
    return translations[language]?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      t,
      translations: translations[language]
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}