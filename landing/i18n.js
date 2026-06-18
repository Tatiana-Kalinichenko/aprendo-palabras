(() => {
  const DEFAULT_LANG = "uk";
  const STORAGE_KEY = "aprendo-palabras-landing-lang";

  const translations = {
    uk: {
      "meta.lang": "uk",
      "meta.title": "Aprendo palabras - розширення Chrome",
      "meta.description": "Aprendo palabras допомагає створювати власні словникові картки, повторювати слова й закріплювати їх у пам'яті.",
      "language.aria": "Мова інтерфейсу",
      "language.uk": "Укр",
      "language.en": "Eng",
      "nav.aria": "Основна навігація",
      "nav.benefits": "Переваги",
      "nav.features": "Можливості",
      "nav.howItWorks": "Як працює",
      "nav.install": "Встановити",
      "hero.badge": "Chrome extension для власного словника",
      "hero.title.1": "Вивчай іноземні",
      "hero.title.2": "слова прямо",
      "hero.title.3": "у браузері",
      "hero.lead": "Aprendo palabras допомагає створювати власні словникові картки, повторювати слова й поступово закріплювати їх у пам'яті.",
      "hero.primaryCta": "Встановити з Chrome Web Store",
      "hero.secondaryCta": "Як це працює",
      "hero.previewAria": "Попередній вигляд Aprendo palabras",
      "hero.modesAria": "Режими",
      "hero.learningMode": "Вивчення",
      "hero.reviewMode": "Повтор",
      "benefits.kicker": "Переваги",
      "benefits.title": "Наші переваги",
      "benefits.lead": "Усе продумано так, щоб додавати й повторювати слова було легко з першого дня.",
      "benefits.simpleTitle": "Простий інтерфейс",
      "benefits.simpleText": "Усі основні функції під рукою: додавання карток, режими вивчення та повторення без складних налаштувань.",
      "benefits.contextTitle": "Додавання слів із сайтів",
      "benefits.contextText": "Виділіть слово або фразу на сторінці, відкрийте контекстне меню й одразу створіть нову картку.",
      "benefits.copy": "Копіювати",
      "benefits.createCard": "Створити картку — Aprendo Palabras",
      "benefits.googleSearch": "Пошук у Google",
      "benefits.easyTitle": "Без зайвого клопоту",
      "benefits.easyText": "Без логінів, без реклами, без складного старту — просто встановіть розширення і починайте користуватися.",
      "features.kicker": "Можливості",
      "features.title": "Усе потрібне для простих словникових карток",
      "features.item.1.title": "Створення власних карток",
      "features.item.1.text": "Вводиш слово, переклад, тег і додаткові позначки.",
      "features.item.2.title": "Режими вивчення",
      "features.item.2.text": "Обирай етапи для нових, знайомих і вже вивчених слів.",
      "features.item.3.title": "Повтор уже знайомих слів",
      "features.item.3.text": "Повертаєшся до уроків, які не хочеться втратити з пам'яті.",
      "features.item.4.title": "Імпорт CSV",
      "features.item.4.text": "Можна завантажити готовий список слів у потрібному форматі.",
      "features.item.5.title": "Робота у Chrome",
      "features.item.5.text": "Додаток відкривається прямо в браузері, без окремої програми.",
      "features.item.6.title": "Двомовний інтерфейс",
      "features.item.6.text": "Перемикайся між українською та англійською мовами інтерфейсу.",
      "steps.kicker": "Як працює",
      "steps.title": "Три кроки — і словник уже з тобою",
      "steps.item.1.title": "Додай картки",
      "steps.item.1.text": "Наповни словник іноземними словами з перекладом, примітками та тегом.",
      "steps.item.2.title": "Обирай слова для вивчення",
      "steps.item.2.text": "Перенеси обрані слова в режим Вивчення і повторюй їх для запам’ятовування.",
      "steps.item.3.title": "Збирай словник",
      "steps.item.3.text": "Переміщуй вивчені слова в категорію \"Знаю\", створюючи свій особистий лексикон.",
      "cta.title": "Спробуй Aprendo palabras у своєму браузері",
      "cta.text": "Додай розширення в Chrome і почни збирати власний словник уже сьогодні.",
      "cta.button": "Встановити з Chrome Web Store",
      "footer.meta": "Макет лендінгу • HTML • PNG-прев'ю",
      "backToTop.aria": "Повернутися нагору"
    },
    en: {
      "meta.lang": "en",
      "meta.title": "Aprendo palabras - Chrome extension",
      "meta.description": "Aprendo palabras helps you create personal vocabulary cards, review words, and gradually remember them.",
      "language.aria": "Interface language",
      "language.uk": "Укр",
      "language.en": "Eng",
      "nav.aria": "Main navigation",
      "nav.benefits": "Benefits",
      "nav.features": "Features",
      "nav.howItWorks": "How it works",
      "nav.install": "Install",
      "hero.badge": "Chrome extension for your personal vocabulary",
      "hero.title.1": "Learn foreign",
      "hero.title.2": "words right",
      "hero.title.3": "in your browser",
      "hero.lead": "Aprendo palabras helps you create personal vocabulary cards, review words, and gradually commit them to memory.",
      "hero.primaryCta": "Install from Chrome Web Store",
      "hero.secondaryCta": "How it works",
      "hero.previewAria": "Aprendo palabras preview",
      "hero.modesAria": "Modes",
      "hero.learningMode": "Learning",
      "hero.reviewMode": "Review",
      "benefits.kicker": "Benefits",
      "benefits.title": "Why it helps",
      "benefits.lead": "Everything is designed to make adding and reviewing words easy from day one.",
      "benefits.simpleTitle": "Simple interface",
      "benefits.simpleText": "The essentials are always close at hand: adding cards, learning modes, and review without complicated setup.",
      "benefits.contextTitle": "Add words from websites",
      "benefits.contextText": "Select a word or phrase on a page, open the context menu, and create a new card right away.",
      "benefits.copy": "Copy",
      "benefits.createCard": "Create card — Aprendo Palabras",
      "benefits.googleSearch": "Search with Google",
      "benefits.easyTitle": "No extra hassle",
      "benefits.easyText": "No logins, no ads, no complicated start — just install the extension and begin.",
      "features.kicker": "Features",
      "features.title": "Everything you need for simple vocabulary cards",
      "features.item.1.title": "Create your own cards",
      "features.item.1.text": "Add a word, translation, tag, and extra notes.",
      "features.item.2.title": "Learning modes",
      "features.item.2.text": "Choose stages for new, familiar, and already learned words.",
      "features.item.3.title": "Review familiar words",
      "features.item.3.text": "Return to lessons you do not want to lose from memory.",
      "features.item.4.title": "CSV import",
      "features.item.4.text": "Upload a ready-made word list in the format you need.",
      "features.item.5.title": "Works in Chrome",
      "features.item.5.text": "The app opens right in your browser, without a separate program.",
      "features.item.6.title": "Bilingual interface",
      "features.item.6.text": "Switch the interface between Ukrainian and English.",
      "steps.kicker": "How it works",
      "steps.title": "Three steps — and your vocabulary is with you",
      "steps.item.1.title": "Add cards",
      "steps.item.1.text": "Fill your vocabulary with foreign words, translations, notes, and tags.",
      "steps.item.2.title": "Choose words to learn",
      "steps.item.2.text": "Move selected words into Learning mode and review them to remember them.",
      "steps.item.3.title": "Build your vocabulary",
      "steps.item.3.text": "Move learned words into the \"Known\" category as you grow your personal lexicon.",
      "cta.title": "Try Aprendo palabras in your browser",
      "cta.text": "Add the extension to Chrome and start building your own vocabulary today.",
      "cta.button": "Install from Chrome Web Store",
      "footer.meta": "Landing design mockup • HTML • PNG preview",
      "backToTop.aria": "Back to top"
    }
  };

  const isSupportedLanguage = (lang) => Object.prototype.hasOwnProperty.call(translations, lang);

  function readStoredLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // Some browsers restrict localStorage for local files. The switch still works for the page session.
    }
  }

  function getInitialLanguage() {
    const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
    if (isSupportedLanguage(requestedLanguage)) return requestedLanguage;

    const storedLanguage = readStoredLanguage();
    if (isSupportedLanguage(storedLanguage)) return storedLanguage;

    return DEFAULT_LANG;
  }

  function translate(lang, key) {
    return translations[lang][key] || translations[DEFAULT_LANG][key] || "";
  }

  function applyLanguage(lang, shouldPersist = true) {
    const nextLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANG;
    document.documentElement.lang = translate(nextLang, "meta.lang");
    document.title = translate(nextLang, "meta.title");

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", translate(nextLang, "meta.description"));
    }

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(nextLang, element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", translate(nextLang, element.dataset.i18nAriaLabel));
    });

    document.querySelectorAll("[data-lang]").forEach((button) => {
      const isActive = button.dataset.lang === nextLang;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (shouldPersist) saveLanguage(nextLang);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(getInitialLanguage(), false);

    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => applyLanguage(button.dataset.lang));
    });

    const backToTopButton = document.querySelector(".back-to-top");
    if (backToTopButton) {
      const toggleBackToTopButton = () => {
        backToTopButton.classList.toggle("is-visible", window.scrollY > 360);
      };

      backToTopButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      toggleBackToTopButton();
      window.addEventListener("scroll", toggleBackToTopButton, { passive: true });
    }
  });
})();
