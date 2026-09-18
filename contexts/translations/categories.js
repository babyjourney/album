// (Sergiu 18.09) Category names in the search/filter panel and the "+" create
// forms lived their own life in English while the rest of the site followed the
// global language. These are the display names for the six DEFAULT categories
// (lib/defaultCategories.js) — custom categories keep whatever label the family
// typed, see categoryDisplayLabel() there.
const translations = {
  ro: {
    categoryMilestones: 'Repere',
    categoryFamily: 'Familie',
    categoryHealth: 'Sănătate',
    categoryEducation: 'Educație',
    categoryAdventures: 'Aventuri',
    categoryEveryday: 'Viața de zi cu zi',
  },
  ru: {
    categoryMilestones: 'Важные моменты',
    categoryFamily: 'Семья',
    categoryHealth: 'Здоровье',
    categoryEducation: 'Образование',
    categoryAdventures: 'Приключения',
    categoryEveryday: 'Повседневная жизнь',
  },
  en: {
    categoryMilestones: 'Milestones',
    categoryFamily: 'Family',
    categoryHealth: 'Health',
    categoryEducation: 'Education',
    categoryAdventures: 'Adventures',
    categoryEveryday: 'Everyday Life',
  },
}

export default translations
