const legal = {
  ro: {
    errConciergeServiceInvalid: 'Serviciul solicitat nu există.',
    errConciergeUnavailable: 'Cererea nu a putut fi trimisă acum. Te rugăm să încerci din nou mai târziu.',
    exportUntitledSlug: 'fara-titlu',
    exportErrTooManyFiles: 'Prea multe fișiere ({count}). Exportă un singur an.',
    exportErrFileTooLarge: 'Fișierul „{path}” depășește 4 GB și nu poate fi arhivat.',
    exportErrArchiveTooLarge: 'Arhiva depășește 4 GB. Exportă an cu an.',
  },
  ru: {
    errConciergeServiceInvalid: 'Запрошенная услуга не существует.',
    errConciergeUnavailable: 'Не удалось отправить запрос. Пожалуйста, попробуйте позже.',
    exportUntitledSlug: 'bez-nazvaniya',
    exportErrTooManyFiles: 'Слишком много файлов ({count}). Экспортируйте один год.',
    exportErrFileTooLarge: 'Файл «{path}» больше 4 ГБ и не может быть добавлен в архив.',
    exportErrArchiveTooLarge: 'Архив больше 4 ГБ. Экспортируйте по одному году.',
  },
  en: {
    errConciergeServiceInvalid: 'The requested service does not exist.',
    errConciergeUnavailable: 'We could not send your request right now. Please try again later.',
    exportUntitledSlug: 'untitled',
    exportErrTooManyFiles: 'Too many files ({count}). Export a single year.',
    exportErrFileTooLarge: 'The file “{path}” is larger than 4 GB and cannot be archived.',
    exportErrArchiveTooLarge: 'The archive is larger than 4 GB. Export one year at a time.',
  },
}

export default legal
