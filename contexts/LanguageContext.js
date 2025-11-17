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
    categoriesResetSuccess: 'Categoriile au fost resetate la valorile implicite!',
    
    // Placeholders and inputs
    searchPlaceholder: 'Caută în postări...',
    hashtagPlaceholder: 'hashtag',
    titlePlaceholder: 'Introduceți un titlu pentru fotografia dumneavoastră',
    hashtagInputPlaceholder: 'Tastează o etichetă și apasă spațiu...',
    searchInDescriptions: 'Caută în descrieri, titluri sau hashtag-uri...',
    
    // Navigation and pages
    dashboard: 'Tablou de bord',
    skillsTracker: 'Urmărire Abilități',
    
    // Skills
    skills: 'Abilități',
    skillName: 'Nume abilitate',
    skillDescription: 'Descrierea abilității',
    addSkill: 'Adaugă abilitate',
    editSkill: 'Editează abilitate',
    deleteSkill: 'Șterge abilitate',
    skillLevel: 'Nivel abilitate',
    beginner: 'Începător',
    intermediate: 'Intermediar',
    advanced: 'Avansat',
    expert: 'Expert',
    
    // Post actions
    viewPost: 'Vezi postarea',
    editPost: 'Editează postarea',
    deletePost: 'Șterge postarea',
    confirmDelete: 'Confirmare ștergere',
    confirmDeleteText: 'Sunteți sigur că doriți să ștergeți această postare? Această acțiune nu poate fi anulată.',
    
    // Form actions
    save: 'Salvează',
    cancel: 'Anulează',
    confirm: 'Confirmă',
    close: 'Închide',
    back: 'Înapoi',
    next: 'Următorul',
    previous: 'Anterior',
    
    // Upload and creation
    uploadPhotos: 'Încarcă fotografii',
    createTextPost: 'Creează postare text',
    selectFiles: 'Selectează fișiere',
    dragAndDrop: 'Trage și lasă fișierele aici',
    
    // Dates and time
    today: 'Astăzi',
    yesterday: 'Ieri',
    thisWeek: 'Săptămâna aceasta',
    thisMonth: 'Luna aceasta',
    
    // Messages and notifications
    success: 'Succes',
    error: 'Eroare',
    warning: 'Avertisment',
    info: 'Informație',
    loading: 'Se încarcă...',
    saving: 'Se salvează...',
    uploading: 'Se încarcă...',
    processing: 'Se procesează...',
    
    // Modal titles
    uploadModal: 'Încarcă fotografii',
    editPostModal: 'Editează postarea',
    deletePostModal: 'Șterge postarea',
    profileModal: 'Profil utilizator',
    settingsModal: 'Setări',
    
    // Status messages
    noPostsFound: 'Nu au fost găsite postări',
    noCategoriesFound: 'Nu au fost găsite categorii',
    noSkillsFound: 'Nu au fost găsite abilități',
    emptyAlbum: 'Albumul este gol',
    
    // Photo count
    photo: 'fotografie',
    photos: 'fotografii',
    onePhoto: '1 fotografie',
    multiplePhotos: '{count} fotografii',
    
    // Post editing
    addDescription: 'Adaugă o descriere...',
    postDescription: 'Descrierea postării...',
    hashtagInputHelp: 'Tastează un cuvânt și apasă spațiu pentru a crea o etichetă',
    addHashtag: 'Adaugă etichetă...',
    shareSpecialMoment: 'Împărtășește un moment special...',
    
    // Skill categories and specific skills
    physicalSkills: 'Abilități Fizice',
    cognitiveSkills: 'Abilități Cognitive', 
    languageSkills: 'Limbaj și Comunicare',
    socialSkills: 'Abilități Sociale și Emoționale',
    selfCareSkills: 'Îngrijire Personală',
    creativeSkills: 'Abilități Creative',
    digitalSkills: 'Abilități Digitale',
    
    // Individual skills
    grossMotor: 'Abilități Motorii Globale',
    fineMotor: 'Abilități Motorii Fine',
    balanceCoordination: 'Echilibru și Coordonare',
    runningJumping: 'Alergat și Sărit',
    handEyeCoordination: 'Coordonare Ochi-Mână',
    memoryRecall: 'Memorie și Amintire',
    problemSolving: 'Rezolvarea Problemelor',
    logicalThinking: 'Gândire Logică',
    attentionFocus: 'Atenție și Concentrare',
    mathConcepts: 'Concepte Matematice',
    verbalCommunication: 'Comunicare Verbală',
    readingSkills: 'Abilități de Citire',
    writingSkills: 'Abilități de Scriere',
    listeningSkills: 'Abilități de Ascultare',
    vocabularyDevelopment: 'Dezvoltarea Vocabularului',
    sharingCooperation: 'Împărțire și Cooperare',
    empathyUnderstanding: 'Empatie și Înțelegere',
    emotionRegulation: 'Reglarea Emoțiilor',
    makingFriends: 'Făcutul de Prieteni',
    conflictResolution: 'Rezolvarea Conflictelor',
    personalHygiene: 'Igienă Personală',
    dressingCare: 'Îmbrăcare și Îngrijire',
    independentEating: 'Mâncare Independentă',
    timeManagement: 'Gestionarea Timpului',
    responsibilityChores: 'Responsabilitate și Treburi',
    drawingPainting: 'Desen și Pictură',
    musicRhythm: 'Muzică și Ritm',
    danceMovement: 'Dans și Mișcare',
    imaginativePlay: 'Joc Imaginativ',
    storytelling: 'Povestire',
    basicComputer: 'Abilități de Bază cu Calculatorul',
    digitalSafety: 'Siguranță Digitală',
    educationalApps: 'Aplicații Educaționale',
    technologyAwareness: 'Conștientizarea Tehnologiei',
    onlineLearning: 'Învățare Online',
    
    // UI Elements
    seeMore: 'vezi mai mult',
    seeLess: 'vezi mai puțin',
    more: 'în plus',
    tags: 'Etichete',
    description: 'Descriere',
    images: 'Imagini',
    loading: 'Se încarcă...',
    failedToLoad: 'Eșec la încărcare',
    newestFirst: 'Cele mai noi primul',
    oldestFirst: 'Cele mai vechi primul',
    titleAtoZ: 'Titlu A-Z',
    photoGallery: 'Galeria de Fotografii',
    
    // Admin and children management
    pinEditor: 'PIN Editor',
    fullAccess: 'Acces Complet',
    addChild: 'Adaugă Copil',
    addNewChild: 'Adaugă Copil Nou',
    adding: 'Se adaugă...',
    fullAccessDescription: 'Acces complet pentru a încărca fotografii, gestiona abilități și edita conținut',
    addFirstChild: 'Adaugă primul copil pentru a începe să folosești funcționalitatea multi-copil.',
    
    // Error messages
    photoDeleteFailed: 'Ștergerea fotografiei a eșuat'
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
    date: 'Дата',
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
    categoriesResetSuccess: 'Категории сброшены к стандартным значениям!',
    
    // Placeholders and inputs  
    searchPlaceholder: 'Поиск в постах...',
    hashtagPlaceholder: 'хештег',
    titlePlaceholder: 'Введите название для вашей фотографии',
    hashtagInputPlaceholder: 'Введите тег и нажмите пробел...',
    searchInDescriptions: 'Поиск в описаниях, заголовках или хештегах...',
    
    // Navigation and pages
    dashboard: 'Панель управления',
    skillsTracker: 'Отслеживание навыков',
    
    // Skills
    skills: 'Навыки',
    skillName: 'Название навыка',
    skillDescription: 'Описание навыка',
    addSkill: 'Добавить навык',
    editSkill: 'Редактировать навык',
    deleteSkill: 'Удалить навык',
    skillLevel: 'Уровень навыка',
    beginner: 'Начинающий',
    intermediate: 'Средний',
    advanced: 'Продвинутый',
    expert: 'Эксперт',
    
    // Post actions
    viewPost: 'Посмотреть пост',
    editPost: 'Редактировать пост',
    deletePost: 'Удалить пост',
    confirmDelete: 'Подтверждение удаления',
    confirmDeleteText: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
    
    // Form actions
    save: 'Сохранить',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    previous: 'Предыдущий',
    
    // Upload and creation
    uploadPhotos: 'Загрузить фотографии',
    createTextPost: 'Создать текстовый пост',
    selectFiles: 'Выбрать файлы',
    dragAndDrop: 'Перетащите файлы сюда',
    
    // Dates and time
    today: 'Сегодня',
    yesterday: 'Вчера',
    thisWeek: 'На этой неделе',
    thisMonth: 'В этом месяце',
    
    // Messages and notifications
    success: 'Успех',
    error: 'Ошибка',
    warning: 'Предупреждение',
    info: 'Информация',
    loading: 'Загрузка...',
    saving: 'Сохранение...',
    uploading: 'Загрузка...',
    processing: 'Обработка...',
    
    // Modal titles
    uploadModal: 'Загрузить фотографии',
    editPostModal: 'Редактировать пост',
    deletePostModal: 'Удалить пост',
    profileModal: 'Профиль пользователя',
    settingsModal: 'Настройки',
    
    // Status messages
    noPostsFound: 'Посты не найдены',
    noCategoriesFound: 'Категории не найдены',
    noSkillsFound: 'Навыки не найдены',
    emptyAlbum: 'Альбом пуст',
    
    // Photo count
    photo: 'фотография',
    photos: 'фотографии',
    onePhoto: '1 фотография',
    multiplePhotos: '{count} фотографий',
    
    // Post editing
    addDescription: 'Добавьте описание...',
    postDescription: 'Описание поста...',
    hashtagInputHelp: 'Введите слово и нажмите пробел для создания тега',
    addHashtag: 'Добавить тег...',
    shareSpecialMoment: 'Поделитесь особенным моментом...',

    // Skill categories and specific skills
    physicalSkills: 'Физические навыки',
    cognitiveSkills: 'Когнитивные навыки', 
    languageSkills: 'Язык и коммуникация',
    socialSkills: 'Социальные и эмоциональные навыки',
    selfCareSkills: 'Уход за собой',
    creativeSkills: 'Творческие навыки',
    digitalSkills: 'Цифровые навыки',
    
    // Individual skills
    grossMotor: 'Крупная моторика',
    fineMotor: 'Мелкая моторика',
    balanceCoordination: 'Равновесие и координация',
    runningJumping: 'Бег и прыжки',
    handEyeCoordination: 'Координация рук и глаз',
    memoryRecall: 'Память и припоминание',
    problemSolving: 'Решение проблем',
    logicalThinking: 'Логическое мышление',
    attentionFocus: 'Внимание и концентрация',
    mathConcepts: 'Математические понятия',
    verbalCommunication: 'Вербальная коммуникация',
    readingSkills: 'Навыки чтения',
    writingSkills: 'Навыки письма',
    listeningSkills: 'Навыки слушания',
    vocabularyDevelopment: 'Развитие словарного запаса',
    sharingCooperation: 'Обмен и сотрудничество',
    empathyUnderstanding: 'Эмпатия и понимание',
    emotionRegulation: 'Регуляция эмоций',
    makingFriends: 'Заведение друзей',
    conflictResolution: 'Решение конфликтов',
    personalHygiene: 'Личная гигиена',
    dressingCare: 'Одевание и уход',
    independentEating: 'Самостоятельное питание',
    timeManagement: 'Управление временем',
    responsibilityChores: 'Ответственность и обязанности',
    drawingPainting: 'Рисование и живопись',
    musicRhythm: 'Музыка и ритм',
    danceMovement: 'Танец и движение',
    imaginativePlay: 'Творческая игра',
    storytelling: 'Рассказывание сказок',
    basicComputer: 'Основы работы с компьютером',
    digitalSafety: 'Цифровая безопасность',
    educationalApps: 'Обучающие приложения',
    technologyAwareness: 'Осведомленность о технологиях',
    onlineLearning: 'Онлайн обучение',
    
    // UI Elements
    seeMore: 'показать больше',
    seeLess: 'показать меньше',
    more: 'еще',
    tags: 'Теги',
    description: 'Описание',
    images: 'Изображения',
    loading: 'Загрузка...',
    failedToLoad: 'Ошибка загрузки',
    newestFirst: 'Сначала новые',
    oldestFirst: 'Сначала старые',
    titleAtoZ: 'Название А-Я',
    photoGallery: 'Фотогалерея',
    
    // Admin and children management
    pinEditor: 'PIN Редактор',
    fullAccess: 'Полный Доступ',
    addChild: 'Добавить Ребенка',
    addNewChild: 'Добавить Нового Ребенка',
    adding: 'Добавление...',
    fullAccessDescription: 'Полный доступ для загрузки фотографий, управления навыками и редактирования контента',
    addFirstChild: 'Добавьте первого ребенка, чтобы начать использовать функционал для нескольких детей.',
    
    // Error messages
    photoDeleteFailed: 'Не удалось удалить фотографию'
  },
  en: {
    // Header
    home: 'Home',
    signOut: 'Sign Out',
    confirmSignOut: 'Confirm Sign Out',
    signOutConfirmText: 'Are you sure you want to sign out? You will need to authenticate again to access the album.',
    cancel: 'Cancel',
    disconnect: 'Sign Out',
    album: 'Album',
    skills: 'Skills',
    
    // Post creation/editing
    createPost: 'Create Post',
    editPost: 'Edit Post',
    postCreationFailed: 'Post creation failed',
    postCreationFailedRetry: 'Post creation failed. Please try again.',
    
    // Upload
    upload: 'Upload',
    uploadPhoto: 'Upload Photo',
    uploadTitle: 'Enter a title for your photo',
    
    // General
    date: 'Date',
    category: 'Category',
    download: 'Download',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    
    // Date picker
    selectDate: 'Select Date',
    postDate: 'Post Date',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    
    // Categories
    family: 'Family',
    travel: 'Travel',
    first: 'First Time',
    siblings: 'Siblings',
    events: 'Events',
    school: 'School',
    
    // Filters and search
    searchAndFilters: 'Search and Filters',
    filtersAndSearch: 'Filters and Search',
    search: 'Search',
    categories: 'Categories',
    hashtag: 'Hashtag',
    sorting: 'Sorting',
    all: 'All',
    newest: 'Newest',
    oldest: 'Oldest',
    titleAZ: 'Title A-Z',
    titleZA: 'Title Z-A',
    clearAllFilters: 'Clear All Filters',
    manage: 'Manage',
    title: 'Title',
    
    // Children filter
    filterByChild: 'Filter by Child',
    allPosts: 'All Posts',
    
    // Category management
    categoryManagement: 'Category Management',
    resetToDefaults: 'Reset to Defaults',
    addNewCategory: 'Add New Category',
    confirmResetCategories: 'Are you sure you want to reset to default categories? All custom categories will be deleted.',
    categoriesResetSuccess: 'Categories have been reset to default values!',
    
    // Placeholders and inputs
    searchPlaceholder: 'Search in posts...',
    hashtagPlaceholder: 'hashtag',
    titlePlaceholder: 'Enter a title for your photo',
    hashtagInputPlaceholder: 'Type a tag and press space...',
    searchInDescriptions: 'Search in descriptions, titles or hashtags...',
    
    // Navigation and pages
    dashboard: 'Dashboard',
    skillsTracker: 'Skills Tracker',
    
    // Skills
    skills: 'Skills',
    skillName: 'Skill Name',
    skillDescription: 'Skill Description',
    addSkill: 'Add Skill',
    editSkill: 'Edit Skill',
    deleteSkill: 'Delete Skill',
    skillLevel: 'Skill Level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
    
    // Post actions
    viewPost: 'View Post',
    editPost: 'Edit Post',
    deletePost: 'Delete Post',
    confirmDelete: 'Confirm Delete',
    confirmDeleteText: 'Are you sure you want to delete this post? This action cannot be undone.',
    
    // Form actions
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    // Upload and creation
    uploadPhotos: 'Upload Photos',
    createTextPost: 'Create Text Post',
    selectFiles: 'Select Files',
    dragAndDrop: 'Drag and drop files here',
    
    // Dates and time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    // Messages and notifications
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading...',
    saving: 'Saving...',
    uploading: 'Uploading...',
    processing: 'Processing...',
    
    // Modal titles
    uploadModal: 'Upload Photos',
    editPostModal: 'Edit Post',
    deletePostModal: 'Delete Post',
    profileModal: 'User Profile',
    settingsModal: 'Settings',
    
    // Status messages
    noPostsFound: 'No posts found',
    noCategoriesFound: 'No categories found',
    noSkillsFound: 'No skills found',
    emptyAlbum: 'Album is empty',
    
    // Photo count
    photo: 'photo',
    photos: 'photos',
    onePhoto: '1 photo',
    multiplePhotos: '{count} photos',
    
    // Post editing
    addDescription: 'Add a description...',
    postDescription: 'Post description...',
    hashtagInputHelp: 'Type a word and press space to create a tag',
    addHashtag: 'Add hashtag...',
    shareSpecialMoment: 'Share a special moment...',

    // Skill categories and specific skills
    physicalSkills: 'Physical Skills',
    cognitiveSkills: 'Cognitive Skills', 
    languageSkills: 'Language and Communication',
    socialSkills: 'Social and Emotional Skills',
    selfCareSkills: 'Self Care',
    creativeSkills: 'Creative Skills',
    digitalSkills: 'Digital Skills',
    
    // Individual skills
    grossMotor: 'Gross Motor Skills',
    fineMotor: 'Fine Motor Skills',
    balanceCoordination: 'Balance and Coordination',
    runningJumping: 'Running and Jumping',
    handEyeCoordination: 'Hand-Eye Coordination',
    memoryRecall: 'Memory and Recall',
    problemSolving: 'Problem Solving',
    logicalThinking: 'Logical Thinking',
    attentionFocus: 'Attention and Focus',
    mathConcepts: 'Math Concepts',
    verbalCommunication: 'Verbal Communication',
    readingSkills: 'Reading Skills',
    writingSkills: 'Writing Skills',
    listeningSkills: 'Listening Skills',
    vocabularyDevelopment: 'Vocabulary Development',
    sharingCooperation: 'Sharing and Cooperation',
    empathyUnderstanding: 'Empathy and Understanding',
    emotionRegulation: 'Emotion Regulation',
    makingFriends: 'Making Friends',
    conflictResolution: 'Conflict Resolution',
    personalHygiene: 'Personal Hygiene',
    dressingCare: 'Dressing and Care',
    independentEating: 'Independent Eating',
    timeManagement: 'Time Management',
    responsibilityChores: 'Responsibility and Chores',
    drawingPainting: 'Drawing and Painting',
    musicRhythm: 'Music and Rhythm',
    danceMovement: 'Dance and Movement',
    imaginativePlay: 'Imaginative Play',
    storytelling: 'Storytelling',
    basicComputer: 'Basic Computer Skills',
    digitalSafety: 'Digital Safety',
    educationalApps: 'Educational Apps',
    technologyAwareness: 'Technology Awareness',
    onlineLearning: 'Online Learning',
    
    // UI Elements
    seeMore: 'see more',
    seeLess: 'see less',
    more: 'more',
    tags: 'Tags',
    description: 'Description',
    images: 'Images',
    loading: 'Loading...',
    failedToLoad: 'Failed to load',
    newestFirst: 'Newest first',
    oldestFirst: 'Oldest first',
    titleAtoZ: 'Title A-Z',
    photoGallery: 'Photo Gallery',
    
    // Admin and children management
    pinEditor: 'PIN Editor',
    fullAccess: 'Full Access',
    addChild: 'Add Child',
    addNewChild: 'Add New Child',
    adding: 'Adding...',
    fullAccessDescription: 'Full access to upload photos, manage skills and edit content',
    addFirstChild: 'Add the first child to start using multi-child functionality.',
    
    // Error messages
    photoDeleteFailed: 'Failed to delete photo'
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