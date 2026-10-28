import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/router'
import extraTranslations from './translations'

const LanguageContext = createContext()

export const translations = {
  ro: {
    home: 'Acasă',
    signOut: 'Deconectare',
    confirmSignOut: 'Confirmare deconectare',
    signOutConfirmText: 'Sunteți sigur că doriți să vă deconectați? Va trebui să vă autentificați din nou pentru a accesa albumul.',
    cancel: 'Anulează',
    disconnect: 'Deconectează',
    album: 'Album',
    language: 'Limbă',
    theme: 'Temă',
    done: 'Gata',
    
    editPost: 'Editează postarea',
    postCreationFailed: 'Crearea postării a eșuat',
    postCreationFailedRetry: 'Crearea postării a eșuat. Vă rugăm să încercați din nou.',
    
    upload: 'Încarcă',
    uploadPhoto: 'Încarcă fotografia',
    uploadTitle: 'Introduceți un titlu pentru fotografia dumneavoastră',
    
    date: 'Data',
    category: 'Categorie',
    download: 'Descarcă',
    edit: 'Editează',
    delete: 'Șterge',
    save: 'Salvează',
    
    selectDate: 'Selectează data',
    postDate: 'Data postării',
    day: 'Zi',
    month: 'Luna',
    year: 'Anul',
    
    family: 'Familie',
    travel: 'Călătorie',
    first: 'Prima dată',
    siblings: 'Frați',
    events: 'Evenimente',
    school: 'Școală',
    
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
    
    filterByChild: 'Filtrează după copil',
    allPosts: 'Toate postările',
    
    categoryManagement: 'Gestionare Categorii',
    resetToDefaults: 'Resetează la categoriile implicite',
    addNewCategory: 'Adaugă categorie nouă',
    confirmResetCategories: 'Sunteți sigur că doriți să resetați la categoriile implicite? Toate categoriile personalizate vor fi șterse.',
    categoriesResetSuccess: 'Categoriile au fost resetate la valorile implicite!',
    
    searchPlaceholder: 'Caută în postări...',
    hashtagPlaceholder: 'hashtag',
    titlePlaceholder: 'Introduceți un titlu pentru fotografia dumneavoastră',
    hashtagInputPlaceholder: 'Tastează o etichetă și apasă spațiu...',
    searchInDescriptions: 'Caută în descrieri, titluri sau hashtag-uri...',
    
    dashboard: 'Tablou de bord',
    skillsTracker: 'Urmărire Abilități',
    
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
    
    viewPost: 'Vezi postarea',
    editPost: 'Editează postarea',
    deletePost: 'Șterge postarea',
    confirmDelete: 'Confirmare ștergere',
    confirmDeleteText: 'Sunteți sigur că doriți să ștergeți această postare? Această acțiune nu poate fi anulată.',
    
    save: 'Salvează',
    cancel: 'Anulează',
    confirm: 'Confirmă',
    close: 'Închide',
    back: 'Înapoi',
    next: 'Următorul',
    previous: 'Anterior',
    
    uploadPhotos: 'Încarcă fotografii',
    createTextPost: 'Creează postare text',
    selectFiles: 'Selectează fișiere',
    dragAndDrop: 'Trage și lasă fișierele aici',
    
    today: 'Astăzi',
    yesterday: 'Ieri',
    thisWeek: 'Săptămâna aceasta',
    thisMonth: 'Luna aceasta',
    
    success: 'Succes',
    error: 'Eroare',
    warning: 'Avertisment',
    info: 'Informație',
    loading: 'Se încarcă...',
    saving: 'Se salvează...',
    uploading: 'Se încarcă...',
    processing: 'Se procesează...',
    
    uploadModal: 'Încarcă fotografii',
    editPostModal: 'Editează postarea',
    deletePostModal: 'Șterge postarea',
    profileModal: 'Profil utilizator',
    settingsModal: 'Setări',
    
    noPostsFound: 'Nu au fost găsite postări',
    noCategoriesFound: 'Nu au fost găsite categorii',
    noSkillsFound: 'Nu au fost găsite abilități',
    emptyAlbum: 'Albumul este gol',
    
    photo: 'fotografie',
    photos: 'fotografii',
    onePhoto: '1 fotografie',
    multiplePhotos: '{count} fotografii',
    
    addDescription: 'Adaugă o descriere...',
    postDescription: 'Descrierea postării...',
    hashtagInputHelp: 'Tastează un cuvânt și apasă spațiu pentru a crea o etichetă',
    addHashtag: 'Adaugă etichetă...',
    shareSpecialMoment: 'Împărtășește un moment special...',
    
    physicalSkills: 'Abilități Fizice',
    cognitiveSkills: 'Abilități Cognitive', 
    languageSkills: 'Limbaj și Comunicare',
    socialSkills: 'Abilități Sociale și Emoționale',
    selfCareSkills: 'Îngrijire Personală',
    creativeSkills: 'Abilități Creative',
    digitalSkills: 'Abilități Digitale',
    
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
    makingFriends: 'Legarea prieteniilor',
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
    
    pinEditor: 'PIN Editor',
    fullAccess: 'Acces Complet',
    addChild: 'Adaugă Copil',
    addNewChild: 'Adaugă Copil Nou',
    adding: 'Se adaugă...',
    fullAccessDescription: 'Acces complet pentru a încărca fotografii, gestiona abilități și edita conținut',
    addFirstChild: 'Adaugă primul copil pentru a începe să folosești funcționalitatea multi-copil.',
    
    photoDeleteFailed: 'Ștergerea fotografiei a eșuat',
    albumSuspended: 'Acest album a fost suspendat. Contactați administratorul pentru mai multe informații.',

    createPost: 'Creează Postare',
    sharePhotosMemories: 'Împărtășește fotografii și amintiri',
    uploadPhotosVideos: 'Încarcă Fotografii & Video',
    postDetails: 'Detalii Postare',
    chooseFiles: 'Alege fișiere',
    dropFilesHere: 'Lasă fișierele aici',
    dragAndDropBrowse: 'Trage și lasă sau apasă pentru a răsfoi',
    maxFiles: 'Maxim 10 fișiere',
    tapForThumbnail: 'Apasă pentru coperta',
    thumbnail: 'Coperta',
    enterPostTitle: 'Introduceți titlul postării...',
    tellStory: 'Povestește...',
    addHashtags: 'Adaugă hashtag-uri...',
    addMagicalHashtags: '✨ Adaugă hashtag-uri magice...',
    typeSpaceToAdd: 'Tastează și apasă spațiu pentru a adăuga • Maxim 10 hashtag-uri',
    associatedChildren: 'Copii Asociați',
    readyToPublish: 'Gata să publici?',
    selectFilesToStart: 'Selectează fișiere pentru a începe',
    publishPost: 'Publică Postarea',
    publishing: 'Se publică...',
    uploadError: 'Eroare la încărcare',
    maxFilesWarning: 'Maximum 10 fișiere sunt permise per postare. Restul fișierelor nu vor fi adăugate.',
    fileTooLarge: 'Fișierul {fileName} trebuie să fie mai mic de 500MB',
  },
  ru: {
    home: 'Главная',
    signOut: 'Выйти',
    confirmSignOut: 'Подтверждение выхода',
    signOutConfirmText: 'Вы уверены, что хотите выйти? Вам нужно будет войти снова, чтобы получить доступ к альбому.',
    cancel: 'Отмена',
    disconnect: 'Выйти',
    album: 'Альбом',
    skills: 'Навыки',
    language: 'Язык',
    theme: 'Тема',
    done: 'Готово',
    
    createPost: 'Создать пост',
    editPost: 'Редактировать пост',
    postCreationFailed: 'Не удалось создать пост',
    postCreationFailedRetry: 'Не удалось создать пост. Пожалуйста, попробуйте еще раз.',
    
    upload: 'Загрузить',
    uploadPhoto: 'Загрузить фото',
    uploadTitle: 'Введите название для вашей фотографии',
    
    date: 'Дата',
    category: 'Категория',
    download: 'Скачать',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    
    selectDate: 'Выберите дату',
    postDate: 'Дата поста',
    day: 'День',
    month: 'Месяц',
    year: 'Год',
    
    family: 'Семья',
    travel: 'Путешествие',
    first: 'Первый раз',
    siblings: 'Братья и сестры',
    events: 'События',
    school: 'Школа',
    
    searchAndFilters: 'Поиск и фильтры',
    filtersAndSearch: 'Фильтры и поиск',
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
    
    filterByChild: 'Фильтр по ребенку',
    allPosts: 'Все посты',
    
    categoryManagement: 'Управление категориями',
    resetToDefaults: 'Сбросить к стандартным',
    addNewCategory: 'Добавить новую категорию',
    confirmResetCategories: 'Вы уверены, что хотите сбросить к стандартным категориям? Все пользовательские категории будут удалены.',
    categoriesResetSuccess: 'Категории сброшены к стандартным значениям!',
    
    searchPlaceholder: 'Поиск в постах...',
    hashtagPlaceholder: 'хештег',
    titlePlaceholder: 'Введите название для вашей фотографии',
    hashtagInputPlaceholder: 'Введите тег и нажмите пробел...',
    searchInDescriptions: 'Поиск в описаниях, заголовках или хештегах...',
    
    dashboard: 'Панель управления',
    skillsTracker: 'Отслеживание навыков',
    
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
    
    viewPost: 'Посмотреть пост',
    editPost: 'Редактировать пост',
    deletePost: 'Удалить пост',
    confirmDelete: 'Подтверждение удаления',
    confirmDeleteText: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
    
    save: 'Сохранить',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    previous: 'Предыдущий',
    
    uploadPhotos: 'Загрузить фотографии',
    createTextPost: 'Создать текстовый пост',
    selectFiles: 'Выбрать файлы',
    dragAndDrop: 'Перетащите файлы сюда',
    
    today: 'Сегодня',
    yesterday: 'Вчера',
    thisWeek: 'На этой неделе',
    thisMonth: 'В этом месяце',
    
    success: 'Успех',
    error: 'Ошибка',
    warning: 'Предупреждение',
    info: 'Информация',
    loading: 'Загрузка...',
    saving: 'Сохранение...',
    uploading: 'Загрузка...',
    processing: 'Обработка...',
    
    uploadModal: 'Загрузить фотографии',
    editPostModal: 'Редактировать пост',
    deletePostModal: 'Удалить пост',
    profileModal: 'Профиль пользователя',
    settingsModal: 'Настройки',
    
    noPostsFound: 'Посты не найдены',
    noCategoriesFound: 'Категории не найдены',
    noSkillsFound: 'Навыки не найдены',
    emptyAlbum: 'Альбом пуст',
    
    photo: 'фотография',
    photos: 'фотографии',
    onePhoto: '1 фотография',
    multiplePhotos: '{count} фотографий',
    
    addDescription: 'Добавьте описание...',
    postDescription: 'Описание поста...',
    hashtagInputHelp: 'Введите слово и нажмите пробел для создания тега',
    addHashtag: 'Добавить тег...',
    shareSpecialMoment: 'Поделитесь особенным моментом...',

    physicalSkills: 'Физические навыки',
    cognitiveSkills: 'Когнитивные навыки', 
    languageSkills: 'Язык и коммуникация',
    socialSkills: 'Социальные и эмоциональные навыки',
    selfCareSkills: 'Уход за собой',
    creativeSkills: 'Творческие навыки',
    digitalSkills: 'Цифровые навыки',
    
    grossMotor: 'Крупная моторика',
    fineMotor: 'Мелкая моторика',
    balanceCoordination: 'Равновесие и координация',
    runningJumping: 'Бег и прыжки',
    handEyeCoordination: 'Координация рук и глаз',
    memoryRecall: 'Память и запоминание',
    problemSolving: 'Решение проблем',
    logicalThinking: 'Логическое мышление',
    attentionFocus: 'Внимание и концентрация',
    mathConcepts: 'Математические понятия',
    verbalCommunication: 'Вербальная коммуникация',
    readingSkills: 'Навыки чтения',
    writingSkills: 'Навыки письма',
    listeningSkills: 'Навыки слушания',
    vocabularyDevelopment: 'Развитие словарного запаса',
    sharingCooperation: 'Умение делиться и сотрудничать',
    empathyUnderstanding: 'Эмпатия и понимание',
    emotionRegulation: 'Регуляция эмоций',
    makingFriends: 'Умение заводить друзей',
    conflictResolution: 'Решение конфликтов',
    personalHygiene: 'Личная гигиена',
    dressingCare: 'Одевание и уход',
    independentEating: 'Самостоятельный приём пищи',
    timeManagement: 'Управление временем',
    responsibilityChores: 'Ответственность и обязанности',
    drawingPainting: 'Рисование и живопись',
    musicRhythm: 'Музыка и ритм',
    danceMovement: 'Танец и движение',
    imaginativePlay: 'Творческая игра',
    storytelling: 'Рассказывание историй',
    basicComputer: 'Основы работы с компьютером',
    digitalSafety: 'Цифровая безопасность',
    educationalApps: 'Обучающие приложения',
    technologyAwareness: 'Знакомство с технологиями',
    onlineLearning: 'Онлайн-обучение',
    
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
    
    pinEditor: 'PIN Редактор',
    fullAccess: 'Полный доступ',
    addChild: 'Добавить ребёнка',
    addNewChild: 'Добавить нового ребёнка',
    adding: 'Добавление...',
    fullAccessDescription: 'Полный доступ для загрузки фотографий, управления навыками и редактирования контента',
    addFirstChild: 'Добавьте первого ребенка, чтобы начать использовать функционал для нескольких детей.',
    
    photoDeleteFailed: 'Не удалось удалить фотографию',
    albumSuspended: 'Этот альбом приостановлен. Свяжитесь с администратором для получения дополнительной информации.',

    createPost: 'Создать пост',
    sharePhotosMemories: 'Поделитесь фотографиями и воспоминаниями',
    uploadPhotosVideos: 'Загрузить фото и видео',
    postDetails: 'Детали поста',
    chooseFiles: 'Выбрать файлы',
    dropFilesHere: 'Перетащите файлы сюда',
    dragAndDropBrowse: 'Перетащите или нажмите для просмотра',
    maxFiles: 'Максимум 10 файлов',
    tapForThumbnail: 'Нажмите для обложки',
    thumbnail: 'Обложка',
    enterPostTitle: 'Введите заголовок поста...',
    tellStory: 'Расскажите историю...',
    addHashtags: 'Добавить хештеги...',
    addMagicalHashtags: '✨ Добавьте волшебные хештеги...',
    typeSpaceToAdd: 'Введите и нажмите пробел для добавления • Максимум 10 хештегов',
    associatedChildren: 'Связанные дети',
    readyToPublish: 'Готовы к публикации?',
    selectFilesToStart: 'Выберите файлы для начала',
    publishPost: 'Опубликовать пост',
    publishing: 'Публикация...',
    uploadError: 'Ошибка загрузки',
    maxFilesWarning: 'Максимум 10 файлов разрешено на пост. Остальные файлы не будут добавлены.',
    fileTooLarge: 'Файл {fileName} должен быть меньше 500 МБ',
  },
  en: {
    home: 'Home',
    signOut: 'Sign Out',
    confirmSignOut: 'Confirm Sign Out',
    signOutConfirmText: 'Are you sure you want to sign out? You will need to authenticate again to access the album.',
    cancel: 'Cancel',
    disconnect: 'Sign Out',
    album: 'Album',
    skills: 'Skills',
    language: 'Language',
    theme: 'Theme',
    done: 'Done',
    
    createPost: 'Create Post',
    editPost: 'Edit Post',
    postCreationFailed: 'Post creation failed',
    postCreationFailedRetry: 'Post creation failed. Please try again.',
    
    upload: 'Upload',
    uploadPhoto: 'Upload Photo',
    uploadTitle: 'Enter a title for your photo',
    
    date: 'Date',
    category: 'Category',
    download: 'Download',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    
    selectDate: 'Select Date',
    postDate: 'Post Date',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    
    family: 'Family',
    travel: 'Travel',
    first: 'First Time',
    siblings: 'Siblings',
    events: 'Events',
    school: 'School',
    
    searchAndFilters: 'Search and Filters',
    filtersAndSearch: 'Filters and Search',
    search: 'Search',
    categories: 'Categories',
    data: 'Date',
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
    
    filterByChild: 'Filter by Child',
    allPosts: 'All Posts',
    
    categoryManagement: 'Category Management',
    resetToDefaults: 'Reset to Defaults',
    addNewCategory: 'Add New Category',
    confirmResetCategories: 'Are you sure you want to reset to default categories? All custom categories will be deleted.',
    categoriesResetSuccess: 'Categories have been reset to default values!',
    
    searchPlaceholder: 'Search in posts...',
    hashtagPlaceholder: 'hashtag',
    titlePlaceholder: 'Enter a title for your photo',
    hashtagInputPlaceholder: 'Type a tag and press space...',
    searchInDescriptions: 'Search in descriptions, titles or hashtags...',
    
    dashboard: 'Dashboard',
    skillsTracker: 'Skills Tracker',
    
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
    
    viewPost: 'View Post',
    editPost: 'Edit Post',
    deletePost: 'Delete Post',
    confirmDelete: 'Confirm Delete',
    confirmDeleteText: 'Are you sure you want to delete this post? This action cannot be undone.',
    
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    uploadPhotos: 'Upload Photos',
    createTextPost: 'Create Text Post',
    selectFiles: 'Select Files',
    dragAndDrop: 'Drag and drop files here',
    
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading...',
    saving: 'Saving...',
    uploading: 'Uploading...',
    processing: 'Processing...',
    
    uploadModal: 'Upload Photos',
    editPostModal: 'Edit Post',
    deletePostModal: 'Delete Post',
    profileModal: 'User Profile',
    settingsModal: 'Settings',
    
    noPostsFound: 'No posts found',
    noCategoriesFound: 'No categories found',
    noSkillsFound: 'No skills found',
    emptyAlbum: 'Album is empty',
    
    photo: 'photo',
    photos: 'photos',
    onePhoto: '1 photo',
    multiplePhotos: '{count} photos',
    
    addDescription: 'Add a description...',
    postDescription: 'Post description...',
    hashtagInputHelp: 'Type a word and press space to create a tag',
    addHashtag: 'Add hashtag...',
    shareSpecialMoment: 'Share a special moment...',

    physicalSkills: 'Physical Skills',
    cognitiveSkills: 'Cognitive Skills', 
    languageSkills: 'Language and Communication',
    socialSkills: 'Social and Emotional Skills',
    selfCareSkills: 'Self Care',
    creativeSkills: 'Creative Skills',
    digitalSkills: 'Digital Skills',
    
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
    
    pinEditor: 'PIN Editor',
    fullAccess: 'Full Access',
    addChild: 'Add Child',
    addNewChild: 'Add New Child',
    adding: 'Adding...',
    fullAccessDescription: 'Full access to upload photos, manage skills and edit content',
    addFirstChild: 'Add the first child to start using multi-child functionality.',
    
    photoDeleteFailed: 'Failed to delete photo',
    albumSuspended: 'This album has been suspended. Contact the administrator for more information.',

    createPost: 'Create Post',
    sharePhotosMemories: 'Share photos and memories',
    uploadPhotosVideos: 'Upload Photos & Videos',
    postDetails: 'Post Details',
    chooseFiles: 'Choose files',
    dropFilesHere: 'Drop files here',
    dragAndDropBrowse: 'Drag and drop or click to browse',
    maxFiles: 'Max 10 files',
    tapForThumbnail: 'Tap for thumbnail',
    thumbnail: 'Thumbnail',
    enterPostTitle: 'Enter post title...',
    tellStory: 'Tell the story...',
    addHashtags: 'Add hashtags...',
    addMagicalHashtags: '✨ Add magical hashtags...',
    typeSpaceToAdd: 'Type and press space to add • Max 10 hashtags',
    associatedChildren: 'Associated Children',
    readyToPublish: 'Ready to publish?',
    selectFilesToStart: 'Select files to get started',
    publishPost: 'Publish Post',
    publishing: 'Publishing...',
    uploadError: 'Upload Error',
    maxFilesWarning: 'Maximum 10 files are allowed per post. Remaining files will not be added.',
    fileTooLarge: 'File {fileName} must be smaller than 500MB',
  }
}

const ALL = ['ro', 'ru', 'en'].reduce((acc, lang) => {
  acc[lang] = { ...(translations[lang] || {}), ...(extraTranslations[lang] || {}) }
  return acc
}, {})

export const localeOf = (lang) => ({ ro: 'ro-RO', ru: 'ru-RU', en: 'en-GB' }[lang] || 'ro-RO')

export const SUPPORTED_LANGUAGES = ['ro', 'ru', 'en']
export const DEFAULT_LANGUAGE = 'ro'
const LANGUAGE_STORAGE_KEY = 'selectedLanguage'
const SYSTEM_LANGUAGE_MAP = new Map([['ro', 'ro'], ['mo', 'ro'], ['ru', 'ru'], ['en', 'en']])

export const detectSystemLanguage = (preferences) => {
  for (const tag of preferences || []) {
    const primary = String(tag || '').trim().toLowerCase().split(/[-_]/)[0]
    if (SYSTEM_LANGUAGE_MAP.has(primary)) return SYSTEM_LANGUAGE_MAP.get(primary)
  }
  return null
}

const systemLanguagePreferences = () => {
  if (typeof navigator === 'undefined') return []
  if (navigator.languages && navigator.languages.length) return navigator.languages
  return navigator.language ? [navigator.language] : []
}

const readStoredLanguage = () => {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : null
  } catch {
    return null
  }
}

const resolvePreferredLanguage = () =>
  readStoredLanguage() || detectSystemLanguage(systemLanguagePreferences()) || DEFAULT_LANGUAGE

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const LANGUAGE_PENDING_ATTRIBUTE = 'data-lang-pending'

const isAdminPathname = (pathname) => typeof pathname === 'string' && pathname.startsWith('/admin')

export function LanguageProvider({ children }) {
  const router = useRouter()
  const [preferredLanguage, setPreferredLanguage] = useState(DEFAULT_LANGUAGE)
  const language = isAdminPathname(router?.pathname) ? DEFAULT_LANGUAGE : preferredLanguage

  useIsomorphicLayoutEffect(() => {
    const applyPreferredLanguage = () => setPreferredLanguage(resolvePreferredLanguage())
    const onStorage = (event) => {
      if (!event.key || event.key === LANGUAGE_STORAGE_KEY) applyPreferredLanguage()
    }
    applyPreferredLanguage()
    try { document.documentElement.removeAttribute(LANGUAGE_PENDING_ATTRIBUTE) } catch {}
    window.addEventListener('languagechange', applyPreferredLanguage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('languagechange', applyPreferredLanguage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    try { document.documentElement.lang = language } catch {}
  }, [language])

  const changeLanguage = (newLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(newLanguage)) return
    setPreferredLanguage(newLanguage)
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage) } catch {}
  }

  const t = (key, variables = {}) => {
    let text = ALL[language]?.[key] ?? ALL.ro?.[key] ?? key

    if (process.env.NODE_ENV !== 'production' && ALL[language]?.[key] === undefined) {
      console.warn(`[i18n] missing "${key}" for language "${language}"`)
    }

    Object.keys(variables).forEach(variable => {
      text = text.replace(new RegExp(`{${variable}}`, 'g'), variables[variable])
    })

    return text
  }

  return (
    <LanguageContext.Provider value={{
      language, locale: localeOf(language),
      changeLanguage,
      t,
      translations: ALL[language]
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