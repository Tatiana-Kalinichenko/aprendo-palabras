(() => {
  const DEFAULT_LANG = "uk";
  const STORAGE_KEY = "aprendo-palabras-ui-lang";

  const translations = {
    uk: {
      "meta.lang": "uk",
      "meta.appTitle": "Aprendo Español — картки",
      "meta.contextTitle": "Нова картка — Aprendo Palabras",
      "meta.studyMiniTitle": "Міні-вікно навчання — Aprendo Palabras",

      "language.aria": "Мова інтерфейсу",
      "language.uk": "Укр",
      "language.en": "Eng",

      "app.hero.title": "Словникові картки",
      "app.hero.description": "Створюйте власні картки українською та іноземною, додавайте теми, синоніми й відмінювання у примітках, а потім вручну керуйте режимами “Словник”, “Вивчення”, “Закріплення” і “Знаю”.",
      "app.hero.study": "Почати навчання",
      "app.hero.stopStudy": "Зупинити навчання",
      "app.hero.session": "Режим навчання",
      "app.hero.startSide": "Показувати спочатку",
      "app.hero.sideFront": "Сторона 1",
      "app.hero.sideBack": "Сторона 2",
      "app.hero.sideRandom": "Довільно",
      "app.hero.exportCsv": "Експорт",
      "app.hero.importCsv": "Імпорт",
      "app.hero.importHint": "Для CSV з Excel краще “CSV UTF-8”. Імпорт також пробує Windows-1251/1252.",

      "app.create.title": "Нова картка",
      "app.create.hint": "Нові слова автоматично потрапляють у режим “Словник”. У поле приміток можна додати відмінювання, синоніми або приклади.",
      "app.create.frontLabel": "Сторона 1 — слово українською",
      "app.create.frontPlaceholder": "Наприклад: говорити",
      "app.create.backLabel": "Сторона 2 — переклад іспанською",
      "app.create.backPlaceholder": "Наприклад: hablar",
      "app.create.accentAria": "Іспанські символи для перекладу",
      "app.create.notesLabel": "Примітки, синоніми, відмінювання",
      "app.create.notesPlaceholder": "Наприклад: hablo, hablas, habla; синонім: conversar",
      "app.create.tagsLabel": "Теги / категорії",
      "app.create.newTagsPlaceholder": "Нові теги через кому: дієслова, щоденні фрази",
      "app.create.submit": "Створити картку",
      "app.create.reset": "Очистити",

      "app.tags.title": "Теги",
      "app.tags.hint": "Перейменування тегу автоматично оновлює всі картки. Видалення тегу не видаляє картки.",
      "app.tags.quickPlaceholder": "Новий тег",
      "app.tags.quickAdd": "Додати тег",
      "app.tags.emptyPicker": "Тегів ще немає. Створіть нові через поле нижче.",
      "app.tags.emptyList": "Теги ще не створені.",
      "app.tags.countAbbr": "{count} карт.",
      "app.tags.renameAria": "Редагувати тег",
      "app.tags.deleteAria": "Видалити тег",
      "app.tags.noTags": "Без тегів",
      "app.tags.dropdownPlaceholder": "Оберіть або створіть теги",
      "app.tags.searchPlaceholder": "Пошук або новий тег",
      "app.tags.selected": "{count} обрано",
      "app.tags.removeTag": "Прибрати тег {name}",
      "app.tags.emptySearch": "Тегів не знайдено.",
      "app.tags.createTag": "Створити тег “{name}”",

      "app.list.title": "Список карток",
      "app.list.hint": "Обирайте одну, кілька або всі видимі картки. Для групової зміни режиму позначте картки, виберіть режим і натисніть “Режим” або просто виберіть режим у списку.",
      "app.list.searchPlaceholder": "Пошук за словом, перекладом, приміткою або тегом",
      "app.list.allModes": "Всі режими",
      "app.list.sortFront": "За алфавітом Сторони 1",
      "app.list.sortBack": "За алфавітом Сторони 2",
      "app.list.sortTags": "За алфавітом по тегах",
      "app.list.sortMode": "За режимом",
      "app.list.pageRange": "{from}-{to} з {total}",
      "app.list.pageRangeEmpty": "0-0 з 0",
      "app.list.paginationAria": "Посторінкова навігація списку карток",
      "app.list.pageSize": "На сторінці",
      "app.list.prevPage": "Попередня сторінка",
      "app.list.nextPage": "Наступна сторінка",
      "app.list.selected": "Обрано: {count}",
      "app.list.clearSelection": "Зняти всі",
      "app.list.bulkModePlaceholder": "Змінити режим...",
      "app.list.bulkTagsPlaceholder": "Теги через кому",
      "app.list.applyMode": "Режим",
      "app.list.addTags": "Додати теги",
      "app.list.replaceTags": "Замінити теги",
      "app.list.removeTags": "Прибрати теги",
      "app.list.deleteSelected": "Видалити обрані картки",
      "app.list.emptyCards": "Поки що немає жодної картки. Створіть першу зліва.",
      "app.list.emptySearch": "За поточним пошуком нічого не знайдено.",
      "app.list.changeModeAria": "Змінити режим картки",
      "app.list.selectAllVisible": "Обрати всі видимі картки",
      "app.list.headerFront": "Сторона 1",
      "app.list.headerBack": "Сторона 2",
      "app.list.headerNotes": "Примітки",
      "app.list.headerTags": "Теги",
      "app.list.headerMode": "Режим",
      "app.list.headerChange": "Режим",
      "app.list.headerActions": "Дії",
      "app.list.editCard": "Редагувати картку",
      "app.list.deleteCard": "Видалити картку",

      "app.edit.title": "Редагувати картку",
      "app.edit.hint": "Можна змінити обидві сторони, примітки, теги та режим.",
      "app.edit.close": "Закрити",
      "app.edit.frontLabel": "Сторона 1 — слово українською",
      "app.edit.backLabel": "Сторона 2 — переклад іспанською",
      "app.edit.accentAria": "Іспанські символи для редагування",
      "app.edit.notesLabel": "Примітки, синоніми, відмінювання",
      "app.edit.modeLabel": "Режим",
      "app.edit.tagsLabel": "Теги / категорії",
      "app.edit.newTagsPlaceholder": "Нові теги через кому",
      "app.edit.save": "Зберегти зміни",
      "app.edit.delete": "Видалити картку",

      "app.stats.total": "{count} карток усього",
      "app.stats.dictionary": "{count} у Словнику",
      "app.stats.learning": "{count}/{limit} у Вивченні",
      "app.stats.reinforcement": "{count}/{limit} у Закріпленні",
      "app.stats.known": "{count} Знаю",
      "app.stats.tags": "{count} тегів",
      "app.stats.totalLabel": "Усього карток",
      "app.stats.dictionaryLabel": "Словник",
      "app.stats.learningLabel": "Вивчення",
      "app.stats.reinforcementLabel": "Закріплення",
      "app.stats.knownLabel": "Знаю",

      "app.study.noCards": "Немає карток: {mode}",
      "app.study.sideFront": "Сторона 1 — рідною мовою",
      "app.study.sideBack": "Сторона 2 — іноземною",
      "app.study.toDictionary": "<- Словник",
      "app.study.toLearning": "<- Вчити",
      "app.study.toKnown": "Знаю ->",
      "app.study.toReinforcement": "Закріпити ->",
      "app.study.answerLabel": "Ваш переклад",
      "app.study.answerPlaceholder": "Поле необовʼязкове",
      "app.study.previous": "Попередня картка",
      "app.study.flip": "Перевернути",
      "app.study.next": "Наступна картка",
      "app.study.openMiniWindow": "Міні-вікно",
      "app.study.modeTitle": "Режим: {mode}",
      "app.study.hint": "Категорії тут не показуються, щоб не підказувати відповідь.",
      "mini.emptyTitle": "Немає карток",
      "mini.emptyText": "У цьому режимі немає карток для навчання.",
      "mini.refresh": "Оновити",
      "mini.openTab": "У вкладку",
      "mini.close": "Закрити",

      "mode.dictionary": "Словник",
      "mode.learning": "Вивчення",
      "mode.reinforcement": "Закріплення",
      "mode.known": "Знаю",
      "session.learning": "Вивчення",
      "session.reinforcement": "Закріплення",
      "session.review": "Повтор",

      "toast.modeLimit.learning": "У режимі “Вивчення” може бути не більше {limit} карток.",
      "toast.modeLimit.reinforcement": "У режимі “Закріплення” може бути не більше {limit} карток.",
      "toast.noSelectedCards": "Немає обраних карток.",
      "toast.selectionCleared": "Усі виділення знято.",
      "toast.fillBothSides": "Заповніть обидві сторони картки.",
      "toast.cardCreatedDictionary": "Картку створено в режимі “Словник”.",
      "toast.cardUpdated": "Картку оновлено.",
      "toast.selectCardsFirst": "Спочатку оберіть картки.",
      "toast.cardsDeleted": "Картки видалено.",
      "toast.chooseValidMode": "Оберіть коректний режим.",
      "toast.chooseModeForBulk": "Оберіть режим для групової дії.",
      "toast.modeChanged": "Режим змінено: {mode} ({count}).",
      "toast.modeUnchanged": "Обрані картки вже були в режимі “{mode}”.",
      "toast.enterTags": "Введіть один або кілька тегів через кому.",
      "toast.tagsUpdated": "Теги оновлено.",
      "toast.tagNameEmpty": "Назва тегу не може бути порожньою.",
      "toast.tagUpdated": "Тег оновлено на всіх картках.",
      "toast.tagDeleted": "Тег видалено з усіх карток.",
      "toast.enterTagName": "Введіть назву тегу.",
      "toast.tagExists": "Такий тег уже існує.",
      "toast.tagCreated": "Тег створено.",
      "toast.csvExported": "CSV експортовано.",
      "toast.csvEmptyTemplate": "Експортовано порожній CSV-шаблон.",
      "toast.csvEmpty": "CSV-файл порожній.",
      "toast.noCsvCardsImported": "Не імпортовано жодної картки. Перевірте, чи заповнені перші дві колонки.",
      "toast.csvImported": "Імпортовано нових карток: {count}.",
      "toast.csvNoNew": "Нових карток не імпортовано.",
      "toast.csvUpdatedDuplicates": "Оновлено дублікатів: {count}.",
      "toast.csvUnchangedDuplicates": "Дублікатів без змін: {count}.",
      "toast.csvEncoding": "Кодування: {encoding}.",
      "toast.csvSkipped": "Пропущено рядків: {count}.",
      "toast.csvLimitedMode": "{count} карт. розміщено в нижчий доступний режим через ліміт.",
      "toast.csvEncodingFailed": "Не вдалося розпізнати кодування CSV-файлу. Спробуйте зберегти файл як CSV UTF-8.",
      "toast.csvReadFailed": "Не вдалося прочитати CSV-файл.",
      "toast.studyModeEmpty": "У режимі “{mode}” більше немає карток.",
      "toast.noPreviousCard": "Попередньої картки немає.",
      "toast.cardMoved": "Картку переміщено в “{mode}”.",
      "toast.appLoadFailed": "Не вдалося завантажити дані. Спробуйте перезавантажити сторінку.",

      "confirm.deleteCards": "Видалити картки: {count}? Цю дію неможливо скасувати.",
      "confirm.mergeTags": "Такий тег уже існує. Обʼєднати ці теги?",
      "confirm.deleteTag": "Видалити тег “{name}”? Картки залишаться, але без цього тегу.",
      "prompt.renameTag": "Нова назва тегу:",

      "context.title": "Нова картка",
      "context.close": "Закрити",
      "context.frontLabel": "Сторона 1",
      "context.swapSides": "Поміняти сторони",
      "context.backLabel": "Сторона 2",
      "context.accentTitle": "Швидкі символи",
      "context.tagsTitle": "Теги",
      "context.tagPlaceholder": "Оберіть або створіть теги",
      "context.tagSearchPlaceholder": "Пошук або новий тег",
      "context.notesLabel": "Примітка",
      "context.notesPlaceholder": "Наприклад, синонім або форма слова",
      "context.submit": "Створити картку",
      "context.removeTag": "Прибрати тег {name}",
      "context.selectedTags": "{count} обрано",
      "context.emptyTags": "Тегів не знайдено.",
      "context.createTag": "Створити тег “{name}”",
      "context.longText": "Текст довгий. За потреби скоротіть сторону картки перед створенням.",
      "context.validationBoth": "Заповніть обидві сторони картки.",
      "context.validationFront": "Заповніть Сторону 1.",
      "context.validationBack": "Заповніть Сторону 2.",
      "context.created": "Картку створено",
      "context.saveFailed": "Не вдалося зберегти картку. Спробуйте ще раз.",
      "context.loadFailed": "Не вдалося завантажити дані. Спробуйте ще раз."
    },

    en: {
      "meta.lang": "en",
      "meta.appTitle": "Aprendo Español — cards",
      "meta.contextTitle": "New card — Aprendo Palabras",
      "meta.studyMiniTitle": "Study mini window — Aprendo Palabras",

      "language.aria": "Interface language",
      "language.uk": "Укр",
      "language.en": "Eng",

      "app.hero.title": "Vocabulary cards",
      "app.hero.description": "Create your own Ukrainian and foreign-language cards, add topics, synonyms, and conjugations in notes, then manually manage Dictionary, Learning, Reinforcement, and Known modes.",
      "app.hero.study": "Start studying",
      "app.hero.stopStudy": "Stop studying",
      "app.hero.session": "Study mode",
      "app.hero.startSide": "Show first",
      "app.hero.sideFront": "Side 1",
      "app.hero.sideBack": "Side 2",
      "app.hero.sideRandom": "Random",
      "app.hero.exportCsv": "Export",
      "app.hero.importCsv": "Import",
      "app.hero.importHint": "For CSV files from Excel, “CSV UTF-8” works best. Import also tries Windows-1251/1252.",

      "app.create.title": "New card",
      "app.create.hint": "New words automatically go to Dictionary mode. Use notes for conjugations, synonyms, or examples.",
      "app.create.frontLabel": "Side 1 — Ukrainian word",
      "app.create.frontPlaceholder": "For example: говорити",
      "app.create.backLabel": "Side 2 — Spanish translation",
      "app.create.backPlaceholder": "For example: hablar",
      "app.create.accentAria": "Spanish characters for the translation",
      "app.create.notesLabel": "Notes, synonyms, conjugations",
      "app.create.notesPlaceholder": "For example: hablo, hablas, habla; synonym: conversar",
      "app.create.tagsLabel": "Tags / categories",
      "app.create.newTagsPlaceholder": "New tags separated by commas: verbs, daily phrases",
      "app.create.submit": "Create card",
      "app.create.reset": "Clear",

      "app.tags.title": "Tags",
      "app.tags.hint": "Renaming a tag updates all cards automatically. Deleting a tag does not delete cards.",
      "app.tags.quickPlaceholder": "New tag",
      "app.tags.quickAdd": "Add tag",
      "app.tags.emptyPicker": "No tags yet. Create new ones with the field below.",
      "app.tags.emptyList": "No tags have been created yet.",
      "app.tags.countAbbr": "{count} cards",
      "app.tags.renameAria": "Edit tag",
      "app.tags.deleteAria": "Delete tag",
      "app.tags.noTags": "No tags",
      "app.tags.dropdownPlaceholder": "Choose or create tags",
      "app.tags.searchPlaceholder": "Search or new tag",
      "app.tags.selected": "{count} selected",
      "app.tags.removeTag": "Remove tag {name}",
      "app.tags.emptySearch": "No tags found.",
      "app.tags.createTag": "Create tag “{name}”",

      "app.list.title": "Card list",
      "app.list.hint": "Select one, several, or all visible cards. For bulk mode changes, select cards, choose a mode, and press “Mode”, or just choose a mode from the list.",
      "app.list.searchPlaceholder": "Search by word, translation, note, or tag",
      "app.list.allModes": "All modes",
      "app.list.sortFront": "Alphabetical by Side 1",
      "app.list.sortBack": "Alphabetical by Side 2",
      "app.list.sortTags": "Alphabetical by tags",
      "app.list.sortMode": "By mode",
      "app.list.pageRange": "{from}-{to} of {total}",
      "app.list.pageRangeEmpty": "0-0 of 0",
      "app.list.paginationAria": "Card list pagination",
      "app.list.pageSize": "Per page",
      "app.list.prevPage": "Previous page",
      "app.list.nextPage": "Next page",
      "app.list.selected": "Selected: {count}",
      "app.list.clearSelection": "Clear all",
      "app.list.bulkModePlaceholder": "Change mode...",
      "app.list.bulkTagsPlaceholder": "Tags separated by commas",
      "app.list.applyMode": "Mode",
      "app.list.addTags": "Add tags",
      "app.list.replaceTags": "Replace tags",
      "app.list.removeTags": "Remove tags",
      "app.list.deleteSelected": "Delete selected cards",
      "app.list.emptyCards": "There are no cards yet. Create the first one on the left.",
      "app.list.emptySearch": "Nothing found for the current search.",
      "app.list.changeModeAria": "Change card mode",
      "app.list.selectAllVisible": "Select all visible cards",
      "app.list.headerFront": "Side 1",
      "app.list.headerBack": "Side 2",
      "app.list.headerNotes": "Notes",
      "app.list.headerTags": "Tags",
      "app.list.headerMode": "Mode",
      "app.list.headerChange": "Mode",
      "app.list.headerActions": "Actions",
      "app.list.editCard": "Edit card",
      "app.list.deleteCard": "Delete card",

      "app.edit.title": "Edit card",
      "app.edit.hint": "You can change both sides, notes, tags, and mode.",
      "app.edit.close": "Close",
      "app.edit.frontLabel": "Side 1 — Ukrainian word",
      "app.edit.backLabel": "Side 2 — Spanish translation",
      "app.edit.accentAria": "Spanish characters for editing",
      "app.edit.notesLabel": "Notes, synonyms, conjugations",
      "app.edit.modeLabel": "Mode",
      "app.edit.tagsLabel": "Tags / categories",
      "app.edit.newTagsPlaceholder": "New tags separated by commas",
      "app.edit.save": "Save changes",
      "app.edit.delete": "Delete card",

      "app.stats.total": "{count} cards total",
      "app.stats.dictionary": "{count} in Dictionary",
      "app.stats.learning": "{count}/{limit} in Learning",
      "app.stats.reinforcement": "{count}/{limit} in Reinforcement",
      "app.stats.known": "{count} Known",
      "app.stats.tags": "{count} tags",
      "app.stats.totalLabel": "Total cards",
      "app.stats.dictionaryLabel": "Dictionary",
      "app.stats.learningLabel": "Learning",
      "app.stats.reinforcementLabel": "Reinforcement",
      "app.stats.knownLabel": "Known",

      "app.study.noCards": "No cards: {mode}",
      "app.study.sideFront": "Side 1 — native language",
      "app.study.sideBack": "Side 2 — foreign language",
      "app.study.toDictionary": "<- Dictionary",
      "app.study.toLearning": "<- Learn",
      "app.study.toKnown": "Known ->",
      "app.study.toReinforcement": "Reinforce ->",
      "app.study.answerLabel": "Your translation",
      "app.study.answerPlaceholder": "Optional field",
      "app.study.previous": "Previous card",
      "app.study.flip": "Flip",
      "app.study.next": "Next card",
      "app.study.openMiniWindow": "Mini window",
      "app.study.modeTitle": "Mode: {mode}",
      "app.study.hint": "Categories are hidden here so they do not give away the answer.",
      "mini.emptyTitle": "No cards",
      "mini.emptyText": "There are no cards to study in this mode.",
      "mini.refresh": "Refresh",
      "mini.openTab": "Open tab",
      "mini.close": "Close",

      "mode.dictionary": "Dictionary",
      "mode.learning": "Learning",
      "mode.reinforcement": "Reinforcement",
      "mode.known": "Known",
      "session.learning": "Learning",
      "session.reinforcement": "Reinforcement",
      "session.review": "Review",

      "toast.modeLimit.learning": "Learning mode can have no more than {limit} cards.",
      "toast.modeLimit.reinforcement": "Reinforcement mode can have no more than {limit} cards.",
      "toast.noSelectedCards": "No cards selected.",
      "toast.selectionCleared": "All selections cleared.",
      "toast.fillBothSides": "Fill in both sides of the card.",
      "toast.cardCreatedDictionary": "Card created in Dictionary mode.",
      "toast.cardUpdated": "Card updated.",
      "toast.selectCardsFirst": "Select cards first.",
      "toast.cardsDeleted": "Cards deleted.",
      "toast.chooseValidMode": "Choose a valid mode.",
      "toast.chooseModeForBulk": "Choose a mode for the bulk action.",
      "toast.modeChanged": "Mode changed: {mode} ({count}).",
      "toast.modeUnchanged": "The selected cards were already in “{mode}” mode.",
      "toast.enterTags": "Enter one or more tags separated by commas.",
      "toast.tagsUpdated": "Tags updated.",
      "toast.tagNameEmpty": "Tag name cannot be empty.",
      "toast.tagUpdated": "Tag updated on all cards.",
      "toast.tagDeleted": "Tag removed from all cards.",
      "toast.enterTagName": "Enter a tag name.",
      "toast.tagExists": "That tag already exists.",
      "toast.tagCreated": "Tag created.",
      "toast.csvExported": "CSV exported.",
      "toast.csvEmptyTemplate": "Empty CSV template exported.",
      "toast.csvEmpty": "CSV file is empty.",
      "toast.noCsvCardsImported": "No cards were imported. Check whether the first two columns are filled in.",
      "toast.csvImported": "New cards imported: {count}.",
      "toast.csvNoNew": "No new cards imported.",
      "toast.csvUpdatedDuplicates": "Duplicates updated: {count}.",
      "toast.csvUnchangedDuplicates": "Duplicates unchanged: {count}.",
      "toast.csvEncoding": "Encoding: {encoding}.",
      "toast.csvSkipped": "Rows skipped: {count}.",
      "toast.csvLimitedMode": "{count} cards were placed in a lower available mode because of the limit.",
      "toast.csvEncodingFailed": "Could not detect the CSV encoding. Try saving the file as CSV UTF-8.",
      "toast.csvReadFailed": "Could not read the CSV file.",
      "toast.studyModeEmpty": "There are no more cards in “{mode}” mode.",
      "toast.noPreviousCard": "There is no previous card.",
      "toast.cardMoved": "Card moved to “{mode}”.",
      "toast.appLoadFailed": "Could not load data. Try reloading the page.",

      "confirm.deleteCards": "Delete cards: {count}? This action cannot be undone.",
      "confirm.mergeTags": "That tag already exists. Merge these tags?",
      "confirm.deleteTag": "Delete tag “{name}”? Cards will remain, but without this tag.",
      "prompt.renameTag": "New tag name:",

      "context.title": "New card",
      "context.close": "Close",
      "context.frontLabel": "Side 1",
      "context.swapSides": "Swap sides",
      "context.backLabel": "Side 2",
      "context.accentTitle": "Quick characters",
      "context.tagsTitle": "Tags",
      "context.tagPlaceholder": "Choose or create tags",
      "context.tagSearchPlaceholder": "Search or new tag",
      "context.notesLabel": "Note",
      "context.notesPlaceholder": "For example, a synonym or word form",
      "context.submit": "Create card",
      "context.removeTag": "Remove tag {name}",
      "context.selectedTags": "{count} selected",
      "context.emptyTags": "No tags found.",
      "context.createTag": "Create tag “{name}”",
      "context.longText": "This text is long. Shorten the card side before creating it if needed.",
      "context.validationBoth": "Fill in both sides of the card.",
      "context.validationFront": "Fill in Side 1.",
      "context.validationBack": "Fill in Side 2.",
      "context.created": "Card created",
      "context.saveFailed": "Could not save the card. Try again.",
      "context.loadFailed": "Could not load data. Try again."
    }
  };

  const hasChromeStorage = () => (
    typeof chrome !== "undefined"
    && chrome.storage
    && chrome.storage.local
  );

  const isSupportedLanguage = (lang) => Object.prototype.hasOwnProperty.call(translations, lang);

  let currentLang = DEFAULT_LANG;
  const listeners = new Set();

  function format(template, params = {}) {
    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  function t(key, params = {}) {
    const dictionary = translations[currentLang] || translations[DEFAULT_LANG];
    const fallback = translations[DEFAULT_LANG];
    return format(dictionary[key] || fallback[key] || key, params);
  }

  function chromeStorageGet(key) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(null);
        return;
      }

      chrome.storage.local.get([key], (items) => {
        const error = chrome.runtime && chrome.runtime.lastError;
        resolve(error ? null : items?.[key] || null);
      });
    });
  }

  function chromeStorageSet(key, value) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(false);
        return;
      }

      chrome.storage.local.set({ [key]: value }, () => {
        resolve(!(chrome.runtime && chrome.runtime.lastError));
      });
    });
  }

  async function readStoredLanguage() {
    const storedExtensionLang = await chromeStorageGet(STORAGE_KEY);
    if (isSupportedLanguage(storedExtensionLang)) return storedExtensionLang;

    try {
      const storedLocalLang = localStorage.getItem(STORAGE_KEY);
      if (isSupportedLanguage(storedLocalLang)) return storedLocalLang;
    } catch (error) {
      // Some browser contexts restrict localStorage. Default language still works.
    }

    return DEFAULT_LANG;
  }

  async function saveLanguage(lang) {
    await chromeStorageSet(STORAGE_KEY, lang);

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // Language still changes for the current page even when persistence is unavailable.
    }
  }

  function applyTranslations(root = document) {
    document.documentElement.lang = t("meta.lang");

    const titleKey = document.documentElement.dataset.i18nTitle;
    if (titleKey) document.title = t(titleKey);

    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });

    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", t(element.dataset.i18nTitle));
    });

    root.querySelectorAll("[data-ui-lang]").forEach((button) => {
      const isActive = button.dataset.uiLang === currentLang;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function notifyListeners() {
    for (const listener of listeners) {
      listener(currentLang);
    }
  }

  async function setLanguage(lang, options = {}) {
    const nextLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANG;
    currentLang = nextLang;
    applyTranslations();
    if (options.persist !== false) await saveLanguage(nextLang);
    notifyListeners();
  }

  function bindLanguageSwitches(root = document) {
    root.querySelectorAll("[data-ui-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        setLanguage(button.dataset.uiLang);
      });
    });
  }

  async function init(options = {}) {
    if (typeof options.onChange === "function") {
      listeners.add(options.onChange);
    }

    currentLang = await readStoredLanguage();
    applyTranslations();
    bindLanguageSwitches();
    notifyListeners();
    return currentLang;
  }

  window.AprendoI18n = {
    STORAGE_KEY,
    DEFAULT_LANG,
    translations,
    init,
    t,
    setLanguage,
    getLanguage: () => currentLang,
    isSupportedLanguage,
    applyTranslations
  };
})();
