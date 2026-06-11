const STORAGE_KEY = "aprendo-espanol-cards-v1";
    const STUDY_SIDE_MODE_KEY = "aprendo-espanol-study-side-mode";
    const MAX_LEARNING = 30;
    const MAX_REINFORCEMENT = 100;
    const PAGE_SIZE_KEY = "aprendo-espanol-page-size";
    const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
    const DEFAULT_PAGE_SIZE = 50;

    const MODE_LABELS = {
      dictionary: "Словник",
      learning: "Вивчення",
      reinforcement: "Закріплення",
      known: "Знаю"
    };

    const MODE_ORDER = ["dictionary", "learning", "reinforcement", "known"];

    const STUDY_SESSION_LABELS = {
      learning: "Вивчення",
      reinforcement: "Закріплення"
    };

    let state = { cards: [], tags: [] };
    let selectedIds = new Set();
    let study = null;
    let studyHistory = [];
    let toastTimer = null;

    let currentPage = 1;
    let pageSize = DEFAULT_PAGE_SIZE;
    let savedStudySideMode = null;
    let storageBackend = "local";
    let storageWriteQueue = Promise.resolve();

    const $ = (selector) => document.querySelector(selector);

    const els = {
      stats: $("#stats"),
      studyBtn: $("#studyBtn"),
      closeStudyBtn: $("#closeStudyBtn"),
      studySessionMode: $("#studySessionMode"),
      studySideMode: $("#studySideMode"),
      exportCsvBtn: $("#exportCsvBtn"),
      importCsvBtn: $("#importCsvBtn"),
      csvFileInput: $("#csvFileInput"),
      studyPanel: $("#studyPanel"),
      createCardForm: $("#createCardForm"),
      cardFront: $("#cardFront"),
      cardBack: $("#cardBack"),
      cardNotes: $("#cardNotes"),
      createTagPicker: $("#createTagPicker"),
      newTagsInput: $("#newTagsInput"),
      quickTagName: $("#quickTagName"),
      quickAddTag: $("#quickAddTag"),
      tagList: $("#tagList"),
      searchInput: $("#searchInput"),
      modeFilter: $("#modeFilter"),
      sortSelect: $("#sortSelect"),
      pageRangeInfo: $("#pageRangeInfo"),
      pageSizeSelect: $("#pageSizeSelect"),
      prevPageBtn: $("#prevPageBtn"),
      nextPageBtn: $("#nextPageBtn"),
      selectedInfo: $("#selectedInfo"),
      clearSelectionBtn: $("#clearSelectionBtn"),
      bulkModeSelect: $("#bulkModeSelect"),
      bulkTagInput: $("#bulkTagInput"),
      bulkApplyMode: $("#bulkApplyMode"),
      bulkAddTags: $("#bulkAddTags"),
      bulkReplaceTags: $("#bulkReplaceTags"),
      bulkRemoveTags: $("#bulkRemoveTags"),
      bulkDelete: $("#bulkDelete"),
      tableWrap: $("#tableWrap"),
      modalBackdrop: $("#cardModalBackdrop"),
      closeCardModal: $("#closeCardModal"),
      editCardForm: $("#editCardForm"),
      editCardId: $("#editCardId"),
      editFront: $("#editFront"),
      editBack: $("#editBack"),
      editNotes: $("#editNotes"),
      editMode: $("#editMode"),
      editTagPicker: $("#editTagPicker"),
      editNewTagsInput: $("#editNewTagsInput"),
      deleteFromModal: $("#deleteFromModal"),
      toast: $("#toast")
    };

    function getDefaultState() {
      return { cards: [], tags: [] };
    }

    function normalizeStoredState(value) {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!parsed || typeof parsed !== "object") return getDefaultState();

        return {
          cards: Array.isArray(parsed.cards) ? parsed.cards : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : []
        };
      } catch (error) {
        console.warn("Could not parse stored data", error);
        return getDefaultState();
      }
    }

    function normalizePageSize(value) {
      const saved = Number(value);
      return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
    }

    function normalizeStudySideMode(value) {
      return ["front", "back", "random"].includes(value) ? value : null;
    }

    function canUseExtensionStorage() {
      return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
    }

    function chromeStorageGet(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
          const error = chrome.runtime && chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve(items || {});
        });
      });
    }

    function chromeStorageSet(items) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          const error = chrome.runtime && chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        });
      });
    }

    function readLocalStorageValue(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Could not read ${key} from localStorage`, error);
        return null;
      }
    }

    function writeLocalStorageValue(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Could not write ${key} to localStorage`, error);
      }
    }

    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }

    function cloneStorageValue(value) {
      return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    async function loadStoredData() {
      if (!canUseExtensionStorage()) {
        state = normalizeStoredState(readLocalStorageValue(STORAGE_KEY));
        pageSize = normalizePageSize(readLocalStorageValue(PAGE_SIZE_KEY));
        savedStudySideMode = normalizeStudySideMode(readLocalStorageValue(STUDY_SIDE_MODE_KEY));
        return;
      }

      try {
        storageBackend = "extension";

        const stored = await chromeStorageGet([STORAGE_KEY, PAGE_SIZE_KEY, STUDY_SIDE_MODE_KEY]);
        const migrated = {};

        if (hasOwn(stored, STORAGE_KEY)) {
          state = normalizeStoredState(stored[STORAGE_KEY]);
        } else {
          state = normalizeStoredState(readLocalStorageValue(STORAGE_KEY));
          migrated[STORAGE_KEY] = state;
        }

        if (hasOwn(stored, PAGE_SIZE_KEY)) {
          pageSize = normalizePageSize(stored[PAGE_SIZE_KEY]);
        } else {
          pageSize = normalizePageSize(readLocalStorageValue(PAGE_SIZE_KEY));
          migrated[PAGE_SIZE_KEY] = pageSize;
        }

        if (hasOwn(stored, STUDY_SIDE_MODE_KEY)) {
          savedStudySideMode = normalizeStudySideMode(stored[STUDY_SIDE_MODE_KEY]);
        } else {
          savedStudySideMode = normalizeStudySideMode(readLocalStorageValue(STUDY_SIDE_MODE_KEY));
          if (savedStudySideMode) {
            migrated[STUDY_SIDE_MODE_KEY] = savedStudySideMode;
          }
        }

        if (Object.keys(migrated).length) {
          await chromeStorageSet(migrated);
        }
      } catch (error) {
        console.warn("Could not load extension storage, falling back to localStorage", error);
        storageBackend = "local";
        state = normalizeStoredState(readLocalStorageValue(STORAGE_KEY));
        pageSize = normalizePageSize(readLocalStorageValue(PAGE_SIZE_KEY));
        savedStudySideMode = normalizeStudySideMode(readLocalStorageValue(STUDY_SIDE_MODE_KEY));
      }
    }

    function saveStoredValue(key, value) {
      if (storageBackend === "extension") {
        const snapshot = cloneStorageValue(value);

        storageWriteQueue = storageWriteQueue
          .catch(() => {})
          .then(() => chromeStorageSet({ [key]: snapshot }))
          .catch((error) => {
            console.warn(`Could not save ${key} to extension storage`, error);
          });

        return storageWriteQueue;
      }

      writeLocalStorageValue(key, typeof value === "string" ? value : JSON.stringify(value));
      return Promise.resolve();
    }

    function saveState() {
      return saveStoredValue(STORAGE_KEY, {
        cards: state.cards,
        tags: state.tags
      });
    }

    function uid(prefix) {
      if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    function normalize(value) {
      return String(value || "").trim().toLocaleLowerCase("uk");
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function multiline(value) {
      return escapeHtml(value).replace(/\n/g, "<br>");
    }

    function splitTags(value) {
      return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function uniqueByNormalized(names) {
      const seen = new Set();
      return names.filter((name) => {
        const key = normalize(name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function ensureTags(names) {
      const ids = [];
      for (const name of uniqueByNormalized(names)) {
        const existing = state.tags.find((tag) => normalize(tag.name) === normalize(name));
        if (existing) {
          ids.push(existing.id);
        } else {
          const tag = { id: uid("tag"), name: name.trim() };
          state.tags.push(tag);
          ids.push(tag.id);
        }
      }
      sortTags();
      return ids;
    }

    function sortTags() {
      state.tags.sort((a, b) => a.name.localeCompare(b.name, "uk", { sensitivity: "base" }));
    }

    function getTagNames(card) {
      return (card.tagIds || [])
        .map((id) => state.tags.find((tag) => tag.id === id))
        .filter(Boolean)
        .map((tag) => tag.name)
        .sort((a, b) => a.localeCompare(b, "uk", { sensitivity: "base" }));
    }

    function getPrimaryTagName(card) {
      return getTagNames(card)[0] || "Без тегів";
    }

    function isExistingCardId(id) {
      return state.cards.some((card) => card.id === id);
    }

    function getSelectedCardIds() {
      const checkedIds = Array.from(els.tableWrap.querySelectorAll(".card-check:checked"))
        .map((checkbox) => checkbox.dataset.cardId)
        .filter(Boolean);

      for (const id of checkedIds) {
        selectedIds.add(id);
      }

      selectedIds = new Set(Array.from(selectedIds).filter(isExistingCardId));
      return Array.from(selectedIds);
    }

    function updateSelectedInfo() {
      selectedIds = new Set(Array.from(selectedIds).filter(isExistingCardId));

      const selectedCount = selectedIds.size;
      els.selectedInfo.textContent = `Обрано: ${selectedCount}`;

      if (els.clearSelectionBtn) {
        els.clearSelectionBtn.disabled = selectedCount === 0;
      }
    }

    function sortHeaderButton(sortValue, label, activeSort) {
      const isActive = activeSort === sortValue;
      return `<button class="sort-header ${isActive ? "active" : ""}" data-sort="${escapeHtml(sortValue)}" type="button">${escapeHtml(label)}${isActive ? '<span class="sort-indicator">↑</span>' : ''}</button>`;
    }

    function getInitialStudySide() {
  const mode = els.studySideMode ? els.studySideMode.value : "random";

  if (mode === "front") return "front";
  if (mode === "back") return "back";

  return Math.random() < 0.5 ? "front" : "back";
}

function setStudyCard(card, options = {}) {
  const {
  rememberCurrent = true,
  scroll = true,
  sessionMode = study?.sessionMode || getSelectedStudySessionMode()
} = options;

  if (rememberCurrent && study?.cardId && study.cardId !== card.id) {
    studyHistory.push(study.cardId);
  }

  study = {
  sessionMode,
  cardId: card.id,
  side: getInitialStudySide(),
  flipped: false,
  answer: ""
};

  renderAll();

  if (scroll) {
    els.studyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

    function getModeLimit(mode) {
  if (mode === "learning") return MAX_LEARNING;
  if (mode === "reinforcement") return MAX_REINFORCEMENT;
  return Infinity;
}

function getModeLimitMessage(mode) {
  if (mode === "learning") {
    return `У режимі “Вивчення” може бути не більше ${MAX_LEARNING} карток.`;
  }

  if (mode === "reinforcement") {
    return `У режимі “Закріплення” може бути не більше ${MAX_REINFORCEMENT} карток.`;
  }

  return "";
}

function canMoveToMode(ids, mode) {
  const limit = getModeLimit(mode);
  if (!Number.isFinite(limit)) return true;

  const idSet = new Set(Array.from(ids).filter(isExistingCardId));
  const currentOutsideSelection = state.cards.filter((card) => card.mode === mode && !idSet.has(card.id)).length;
  const movingIntoMode = state.cards.filter((card) => idSet.has(card.id) && card.mode !== mode).length;

  return currentOutsideSelection + movingIntoMode <= limit;
}

function getSelectedStudySessionMode() {
  return els.studySessionMode?.value === "reinforcement" ? "reinforcement" : "learning";
}

    function showToast(message) {
      window.clearTimeout(toastTimer);
      els.toast.textContent = message;
      els.toast.classList.add("show");
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove("show");
      }, 2600);
    }

    function renderAll() {
      selectedIds = new Set(Array.from(selectedIds).filter((id) => state.cards.some((card) => card.id === id)));
      renderStats();
      renderTagPickers();
      renderTagList();
      renderCardList();
      renderStudy();
      updateStudyButton();
    }

    function renderStats() {
  const counts = {
    dictionary: state.cards.filter((card) => card.mode === "dictionary").length,
    learning: state.cards.filter((card) => card.mode === "learning").length,
    reinforcement: state.cards.filter((card) => card.mode === "reinforcement").length,
    known: state.cards.filter((card) => card.mode === "known").length
  };

  els.stats.innerHTML = `
    <span class="stat"><strong>${state.cards.length}</strong> карток усього</span>
    <span class="stat"><strong>${counts.dictionary}</strong> у Словнику</span>
    <span class="stat"><strong>${counts.learning}/${MAX_LEARNING}</strong> у Вивченні</span>
    <span class="stat"><strong>${counts.reinforcement}/${MAX_REINFORCEMENT}</strong> у Закріпленні</span>
    <span class="stat"><strong>${counts.known}</strong> Знаю</span>
    <span class="stat"><strong>${state.tags.length}</strong> тегів</span>
`;
}

    function renderTagPickers() {
      const renderPicker = (container, name, selected = []) => {
        if (!state.tags.length) {
          container.innerHTML = `<p class="muted-text">Тегів ще немає. Створіть нові через поле нижче.</p>`;
          return;
        }

        container.innerHTML = state.tags.map((tag) => `
          <label class="tag-check">
            <input type="checkbox" name="${name}" value="${escapeHtml(tag.id)}" ${selected.includes(tag.id) ? "checked" : ""}>
            ${escapeHtml(tag.name)}
          </label>
        `).join("");
      };

      renderPicker(els.createTagPicker, "createTags");
      const editCard = state.cards.find((card) => card.id === els.editCardId.value);
      renderPicker(els.editTagPicker, "editTags", editCard ? editCard.tagIds || [] : []);
    }

    function renderTagList() {
      if (!state.tags.length) {
        els.tagList.innerHTML = `<div class="empty">Теги ще не створені.</div>`;
        return;
      }

      els.tagList.innerHTML = state.tags.map((tag) => {
        const count = state.cards.filter((card) => (card.tagIds || []).includes(tag.id)).length;
        return `
          <div class="tag-line">
            <div>
              <strong>${escapeHtml(tag.name)}</strong>
              <div class="muted-text">${count} карт.</div>
            </div>
            <div class="row-actions">
              <button class="mini icon-btn" data-tag-action="rename" data-tag-id="${escapeHtml(tag.id)}" aria-label="Редагувати тег" title="Редагувати тег">✎</button>
              <button class="mini danger icon-btn" data-tag-action="delete" data-tag-id="${escapeHtml(tag.id)}" aria-label="Видалити тег" title="Видалити тег">🗑</button>
            </div>
          </div>
        `;
      }).join("");
    }

    function getVisibleCards() {
      const search = normalize(els.searchInput.value);
      const mode = els.modeFilter.value;
      const sort = els.sortSelect.value;

      const filtered = state.cards.filter((card) => {
        const tagNames = getTagNames(card).join(" ");
        const haystack = normalize(`${card.front} ${card.back} ${card.notes || ""} ${tagNames}`);
        const matchesSearch = !search || haystack.includes(search);
        const matchesMode = mode === "all" || card.mode === mode;
        return matchesSearch && matchesMode;
      });

      filtered.sort((a, b) => {
        if (sort === "back") {
          return a.back.localeCompare(b.back, "uk", { sensitivity: "base" });
        }
        if (sort === "tags") {
          return getPrimaryTagName(a).localeCompare(getPrimaryTagName(b), "uk", { sensitivity: "base" })
            || a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
        }
        if (sort === "mode") {
          return MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode)
            || a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
        }
        return a.front.localeCompare(b.front, "uk", { sensitivity: "base" });
      });

      return filtered;
    }

    function getPageCount(total) {
      return Math.max(1, Math.ceil(total / pageSize));
    }

    function clampCurrentPage(total) {
      const pageCount = getPageCount(total);
      currentPage = Math.min(Math.max(currentPage, 1), pageCount);
      return pageCount;
    }

    function getPaginatedCards(cards) {
      const pageCount = clampCurrentPage(cards.length);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, cards.length);

      return {
        cards: cards.slice(startIndex, endIndex),
        startIndex,
        endIndex,
        pageCount
      };
    }

    function getDisplayedCards() {
      return getPaginatedCards(getVisibleCards()).cards;
    }

    function updatePaginationControls(totalFiltered, startIndex, endIndex, pageCount) {
      if (els.pageSizeSelect && els.pageSizeSelect.value !== String(pageSize)) {
      els.pageSizeSelect.value = String(pageSize);
      }

      els.pageRangeInfo.textContent = totalFiltered
      ? `${startIndex + 1}-${endIndex} з ${totalFiltered}`
        : "0-0 з 0";

      els.prevPageBtn.disabled = currentPage <= 1 || totalFiltered === 0;
      els.nextPageBtn.disabled = currentPage >= pageCount || totalFiltered === 0;
    }

    function resetPageAndRenderCardList() {
      currentPage = 1;
      renderCardList();
    }

    function clearAllSelections() {
      if (!selectedIds.size) {
        showToast("Немає обраних карток.");
        return;
      }

      selectedIds.clear();
      renderCardList();
      showToast("Усі виділення знято.");
    }

    function renderCardList() {
      const visible = getVisibleCards();
      const {
        cards: pageCards,
        startIndex,
        endIndex,
        pageCount
      } = getPaginatedCards(visible);

      const allVisibleSelected = pageCards.length > 0 && pageCards.every((card) => selectedIds.has(card.id));

      updateSelectedInfo();
      updatePaginationControls(visible.length, startIndex, endIndex, pageCount);

      if (!state.cards.length) {
        els.tableWrap.innerHTML = `<div class="empty">Поки що немає жодної картки. Створіть першу зліва.</div>`;
        return;
      }

      if (!visible.length) {
        els.tableWrap.innerHTML = `<div class="empty">За поточним пошуком нічого не знайдено.</div>`;
        return;
      }

      const sort = els.sortSelect.value;
      let lastGroup = null;
      const rows = [];

      for (const card of pageCards) {
        const group = sort === "tags" ? getPrimaryTagName(card) : sort === "mode" ? MODE_LABELS[card.mode] : null;
        if (group && group !== lastGroup) {
          rows.push(`<tr class="group-row"><td colspan="8">${escapeHtml(group)}</td></tr>`);
          lastGroup = group;
        }

        const tagsHtml = getTagNames(card).map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("") || `<span class="muted-text">Без тегів</span>`;
        const notes = card.notes ? `<div class="muted-text">${multiline(card.notes)}</div>` : `<span class="muted-text">—</span>`;

        rows.push(`
          <tr>
            <td>
              <input type="checkbox" class="card-check" data-card-id="${escapeHtml(card.id)}" ${selectedIds.has(card.id) ? "checked" : ""}>
            </td>
            <td class="word-cell">${multiline(card.front)}</td>
            <td class="word-cell">${multiline(card.back)}</td>
            <td>${notes}</td>
            <td>${tagsHtml}</td>
            <td><span class="mode-badge mode-${escapeHtml(card.mode)}">${MODE_LABELS[card.mode]}</span></td>
            <td>
              <select data-card-action="mode" data-card-id="${escapeHtml(card.id)}" aria-label="Змінити режим картки">
                <option value="dictionary" ${card.mode === "dictionary" ? "selected" : ""}>Словник</option>
                <option value="learning" ${card.mode === "learning" ? "selected" : ""}>Вивчення</option>
                <option value="reinforcement" ${card.mode === "reinforcement" ? "selected" : ""}>Закріплення</option>
                <option value="known" ${card.mode === "known" ? "selected" : ""}>Знаю</option>
              </select>
            </td>
            <td>
              <div class="row-actions">
                <button class="mini icon-btn" data-card-action="edit" data-card-id="${escapeHtml(card.id)}" aria-label="Редагувати картку" title="Редагувати картку">✎</button>
                <button class="mini danger icon-btn" data-card-action="delete" data-card-id="${escapeHtml(card.id)}" aria-label="Видалити картку" title="Видалити картку">🗑</button>
              </div>
            </td>
          </tr>
        `);
      }

      els.tableWrap.innerHTML = `
        <table>
          <colgroup>
            <col class="select-col">
            <col class="word-col">
            <col class="word-col">
            <col class="notes-col">
            <col class="tags-col">
            <col class="mode-col">
            <col class="change-col">
            <col class="actions-col">
          </colgroup>
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAllVisible" ${allVisibleSelected ? "checked" : ""} aria-label="Обрати всі видимі картки"></th>
              <th>${sortHeaderButton("front", "Сторона 1", sort)}</th>
              <th>${sortHeaderButton("back", "Сторона 2", sort)}</th>
              <th>Примітки</th>
              <th>${sortHeaderButton("tags", "Теги", sort)}</th>
              <th>${sortHeaderButton("mode", "Режим", sort)}</th>
              <th>Змінити</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      `;
    }

    function updateStudyButton() {
     const sessionMode = getSelectedStudySessionMode();
      const cardsCount = state.cards.filter((card) => card.mode === sessionMode).length;
      const sessionLabel = STUDY_SESSION_LABELS[sessionMode];

      els.studyBtn.disabled = cardsCount < 1;
     els.studyBtn.textContent = cardsCount < 1 ? `Немає карток: ${sessionLabel}` : "Вчити";
     els.closeStudyBtn.style.display = study ? "block" : "none";
    }

function renderStudy() {
  if (!study) {
    els.studyPanel.classList.remove("active");
    els.studyPanel.innerHTML = "";
    return;
  }

  const sessionMode = study.sessionMode || "learning";
  const card = state.cards.find((item) => item.id === study.cardId);

  if (!card || card.mode !== sessionMode) {
    pickStudyCard(study.cardId, { rememberCurrent: false, sessionMode });
    return;
  }

  els.studyPanel.classList.add("active");

  const showingSide = study.flipped
    ? (study.side === "front" ? "back" : "front")
    : study.side;

  const label = showingSide === "front"
    ? "Сторона 1 — українською"
    : "Сторона 2 — іспанською";

  const text = showingSide === "front" ? card.front : card.back;

  const notesHtml = showingSide === "back" && card.notes
    ? `<div class="study-notes">${multiline(card.notes)}</div>`
    : "";

  const modeControls = sessionMode === "reinforcement"
    ? `
      <button class="mini blue" data-study-action="dictionary" type="button">&lt;- Словник</button>
      <button class="mini" data-study-action="learning" type="button">&lt;- Вчити</button>
      <button class="mini good" data-study-action="known" type="button">Знаю -&gt;</button>
    `
    : `
      <button class="mini blue" data-study-action="dictionary" type="button">&lt;- Словник</button>
      <button class="mini good" data-study-action="reinforcement" type="button">Закріпити -&gt;</button>
    `;

  const controls = `
    <label for="studyAnswer">Ваш переклад, якщо хочете перевірити себе</label>

    <textarea id="studyAnswer" class="answer-box" placeholder="Поле необовʼязкове. Напишіть переклад і натисніть кнопку перевороту.">${escapeHtml(study.answer)}</textarea>

    <div class="study-icon-row">
      <button class="ghost icon-btn study-nav-icon" data-study-action="previous" type="button" aria-label="Попередня картка" title="Попередня картка">←</button>

      <button class="primary icon-btn study-nav-icon" data-study-action="flip" type="button" aria-label="Перевернути" title="Перевернути">↻</button>

      <button class="ghost icon-btn study-nav-icon" data-study-action="next" type="button" aria-label="Наступна картка" title="Наступна картка">→</button>

      <button class="mini icon-btn study-nav-icon" data-study-action="edit" type="button" aria-label="Редагувати картку" title="Редагувати картку">✎</button>
    </div>

    <div class="study-mode-row">
      ${modeControls}
    </div>
  `;

  els.studyPanel.innerHTML = `
    <div class="study-layout">
      <div class="flashcard">
        <p class="side-label">${escapeHtml(label)}</p>
        <p class="card-word">${multiline(text)}</p>
        ${notesHtml}
      </div>

      <div class="study-controls">
        <div>
          <h2 class="study-title">Режим: ${escapeHtml(STUDY_SESSION_LABELS[sessionMode])}</h2>
          <p class="hint study-hint">Категорії тут не показуються, щоб не підказувати відповідь.</p>
        </div>

        ${controls}
      </div>
    </div>
  `;
}

    function getCheckedTagIds(container) {
      return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
    }

    function createCard(event) {
      event.preventDefault();

      const front = els.cardFront.value.trim();
      const back = els.cardBack.value.trim();
      if (!front || !back) {
        showToast("Заповніть обидві сторони картки.");
        return;
      }

      const tagIds = [
        ...getCheckedTagIds(els.createTagPicker),
        ...ensureTags(splitTags(els.newTagsInput.value))
      ];

      state.cards.push({
        id: uid("card"),
        front,
        back,
        notes: els.cardNotes.value.trim(),
        tagIds: Array.from(new Set(tagIds)),
        mode: "dictionary",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      saveState();
      els.createCardForm.reset();
      renderAll();
      showToast("Картку створено в режимі “Словник”.");
    }

    function openCardModal(cardId) {
      const card = state.cards.find((item) => item.id === cardId);
      if (!card) return;

      els.editCardId.value = card.id;
      els.editFront.value = card.front;
      els.editBack.value = card.back;
      els.editNotes.value = card.notes || "";
      els.editMode.value = card.mode;
      els.editNewTagsInput.value = "";
      renderTagPickers();
      els.modalBackdrop.classList.add("active");
      els.editFront.focus();
    }

    function closeCardModal() {
      els.modalBackdrop.classList.remove("active");
      els.editCardForm.reset();
      els.editCardId.value = "";
    }

    function saveCardEdit(event) {
      event.preventDefault();

      const card = state.cards.find((item) => item.id === els.editCardId.value);
      if (!card) return;

      const newMode = els.editMode.value;
      if (newMode !== card.mode && !canMoveToMode([card.id], newMode)) {
        showToast(getModeLimitMessage(newMode));
        els.editMode.value = card.mode;
        return;
      }

      const tagIds = [
        ...getCheckedTagIds(els.editTagPicker),
        ...ensureTags(splitTags(els.editNewTagsInput.value))
      ];

      card.front = els.editFront.value.trim();
      card.back = els.editBack.value.trim();
      card.notes = els.editNotes.value.trim();
      card.mode = newMode;
      card.tagIds = Array.from(new Set(tagIds));
      card.updatedAt = new Date().toISOString();

      if (!card.front || !card.back) {
        showToast("Обидві сторони картки мають бути заповнені.");
        return;
      }

      saveState();
      closeCardModal();
      renderAll();
      showToast("Картку оновлено.");
    }

    function deleteCards(ids) {
      const idList = Array.from(ids);
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return;
      }

      const confirmed = confirm(`Видалити картки: ${idList.length}? Цю дію неможливо скасувати.`);
      if (!confirmed) return;

      state.cards = state.cards.filter((card) => !idList.includes(card.id));
      selectedIds = new Set(Array.from(selectedIds).filter((id) => !idList.includes(id)));

      if (study && idList.includes(study.cardId)) {
        study = null;
      }

      saveState();
      renderAll();
      showToast("Картки видалено.");
    }

    function moveCards(ids, mode) {
      if (!MODE_LABELS[mode]) {
        showToast("Оберіть коректний режим.");
        return false;
      }

      const idList = Array.from(new Set(Array.from(ids).filter(isExistingCardId)));
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return false;
      }

      if (!canMoveToMode(idList, mode)) {
        showToast(getModeLimitMessage(mode));
        return false;
      }

      let changedCount = 0;
      for (const card of state.cards) {
        if (idList.includes(card.id) && card.mode !== mode) {
          card.mode = mode;
          card.updatedAt = new Date().toISOString();
          changedCount += 1;
        }
      }

      if (study) {
        const current = state.cards.find((card) => card.id === study.cardId);
        const sessionMode = study.sessionMode || getSelectedStudySessionMode();

        if (!current || current.mode !== sessionMode) {
          pickStudyCard(study.cardId, { rememberCurrent: false, sessionMode });
        }
      }

      saveState();
      renderAll();
      const message = changedCount
        ? `Режим змінено: ${MODE_LABELS[mode]} (${changedCount}).`
        : `Обрані картки вже були в режимі “${MODE_LABELS[mode]}”.`;
      showToast(message);
      return true;
    }

    function applyTagChange(ids, action) {
      const idList = Array.from(ids);
      if (!idList.length) {
        showToast("Спочатку оберіть картки.");
        return;
      }

      const names = splitTags(els.bulkTagInput.value);
      if (!names.length) {
        showToast("Введіть один або кілька тегів через кому.");
        return;
      }

      const tagIds = ensureTags(names);

      for (const card of state.cards) {
        if (!idList.includes(card.id)) continue;

        if (action === "replace") {
          card.tagIds = Array.from(new Set(tagIds));
        } else if (action === "add") {
          card.tagIds = Array.from(new Set([...(card.tagIds || []), ...tagIds]));
        } else if (action === "remove") {
          card.tagIds = (card.tagIds || []).filter((id) => !tagIds.includes(id));
        }

        card.updatedAt = new Date().toISOString();
      }

      els.bulkTagInput.value = "";
      saveState();
      renderAll();
      showToast("Теги оновлено.");
    }

    function renameTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const name = prompt("Нова назва тегу:", tag.name);
      if (name === null) return;

      const trimmed = name.trim();
      if (!trimmed) {
        showToast("Назва тегу не може бути порожньою.");
        return;
      }

      const duplicate = state.tags.find((item) => item.id !== tagId && normalize(item.name) === normalize(trimmed));
      if (duplicate) {
        const confirmed = confirm("Такий тег уже існує. Обʼєднати ці теги?");
        if (!confirmed) return;

        for (const card of state.cards) {
          if ((card.tagIds || []).includes(tagId)) {
            card.tagIds = Array.from(new Set((card.tagIds || []).map((id) => id === tagId ? duplicate.id : id)));
          }
        }
        state.tags = state.tags.filter((item) => item.id !== tagId);
      } else {
        tag.name = trimmed;
      }

      sortTags();
      saveState();
      renderAll();
      showToast("Тег оновлено на всіх картках.");
    }

    function deleteTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const confirmed = confirm(`Видалити тег “${tag.name}”? Картки залишаться, але без цього тегу.`);
      if (!confirmed) return;

      state.tags = state.tags.filter((item) => item.id !== tagId);
      for (const card of state.cards) {
        card.tagIds = (card.tagIds || []).filter((id) => id !== tagId);
      }

      saveState();
      renderAll();
      showToast("Тег видалено з усіх карток.");
    }

    function addQuickTag() {
      const name = els.quickTagName.value.trim();
      if (!name) {
        showToast("Введіть назву тегу.");
        return;
      }

      const existing = state.tags.find((tag) => normalize(tag.name) === normalize(name));
      if (existing) {
        showToast("Такий тег уже існує.");
        return;
      }

      state.tags.push({ id: uid("tag"), name });
      sortTags();
      els.quickTagName.value = "";
      saveState();
      renderAll();
      showToast("Тег створено.");
    }

    function csvEscape(value) {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
      }
      return text;
    }

    function exportCardsToCsv() {
      const headers = ["side_1_ukrainian", "side_2_spanish", "notes", "mode", "tags"];
      const rows = state.cards.map((card) => [
        card.front,
        card.back,
        card.notes || "",
        card.mode || "dictionary",
        getTagNames(card).join("; ")
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `aprendo-espanol-cards-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(state.cards.length ? "CSV експортовано." : "Експортовано порожній CSV-шаблон.");
    }

    function parseCsv(text) {
      const rows = [];
      let row = [];
      let field = "";
      let inQuotes = false;

      const cleanText = String(text || "").replace(/^\uFEFF/, "");

      for (let i = 0; i < cleanText.length; i += 1) {
        const char = cleanText[i];
        const next = cleanText[i + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === "," && !inQuotes) {
          row.push(field);
          field = "";
          continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
          if (char === "\r" && next === "\n") i += 1;
          row.push(field);
          if (row.some((item) => item.trim() !== "")) rows.push(row);
          row = [];
          field = "";
          continue;
        }

        field += char;
      }

      row.push(field);
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      return rows;
    }

    function countMatches(text, pattern) {
      const matches = String(text || "").match(pattern);
      return matches ? matches.length : 0;
    }

    function scoreDecodedCsvText(text) {
      const value = String(text || "");
      const rows = parseCsv(value).slice(0, 12);
      const replacementCount = countMatches(value, /�/g);
      const suspiciousMojibakeCount = countMatches(value, /(?:Ð|Ñ|Ã|Â|Р|С)/g);
      const controlCount = countMatches(value, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
      const cyrillicCount = countMatches(value, /[А-Яа-яЄєІіЇїҐґ]/g);
      const spanishAccentCount = countMatches(value, /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/g);
      const headerScore = looksLikeCsvHeader(rows[0] || []) ? 200 : 0;
      const tableScore = rows.reduce((sum, row) => {
        const filled = row.filter((cell) => String(cell || "").trim()).length;
        return sum + Math.min(filled, 5) * 8;
      }, 0);

      return headerScore + tableScore + cyrillicCount * 3 + spanishAccentCount * 3
        - replacementCount * 250 - suspiciousMojibakeCount * 14 - controlCount * 80;
    }

    function decodeCsvArrayBuffer(buffer) {
      const bytes = new Uint8Array(buffer);
      const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      const hasUtf16LeBom = bytes[0] === 0xFF && bytes[1] === 0xFE;
      const hasUtf16BeBom = bytes[0] === 0xFE && bytes[1] === 0xFF;

      const decodeWith = (label, fatal = false) => new TextDecoder(label, { fatal }).decode(buffer);

      if (hasUtf8Bom) return { text: decodeWith("utf-8"), encoding: "UTF-8 BOM" };
      if (hasUtf16LeBom) return { text: decodeWith("utf-16le"), encoding: "UTF-16 LE" };
      if (hasUtf16BeBom) return { text: decodeWith("utf-16be"), encoding: "UTF-16 BE" };

      const evenNulls = bytes.filter((byte, index) => index % 2 === 0 && byte === 0).length;
      const oddNulls = bytes.filter((byte, index) => index % 2 === 1 && byte === 0).length;
      if (oddNulls > bytes.length * 0.2 && evenNulls < oddNulls / 3) {
        return { text: decodeWith("utf-16le"), encoding: "UTF-16 LE" };
      }
      if (evenNulls > bytes.length * 0.2 && oddNulls < evenNulls / 3) {
        return { text: decodeWith("utf-16be"), encoding: "UTF-16 BE" };
      }

      try {
        return { text: decodeWith("utf-8", true), encoding: "UTF-8" };
      } catch (error) {
        // Not valid UTF-8, so the file was likely saved by Excel/Windows in another encoding.
      }

      const candidates = ["windows-1251", "windows-1252", "iso-8859-1"]
        .map((label) => ({ label, text: decodeWith(label) }))
        .map((candidate) => ({
          ...candidate,
          score: scoreDecodedCsvText(candidate.text)
        }))
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      const encodingNames = {
        "windows-1251": "Windows-1251",
        "windows-1252": "Windows-1252",
        "iso-8859-1": "ISO-8859-1"
      };

      return { text: best.text, encoding: encodingNames[best.label] || best.label };
    }

    function normalizeHeader(value) {
      return normalize(value).replace(/[\s_-]+/g, "");
    }

    function mapCsvMode(value) {
      const key = normalize(value);

      if (["learning", "вивчення", "учу", "вчу"].includes(key)) return "learning";

      if (["reinforcement", "закріплення", "закріпити", "повторення", "review"].includes(key)) {
        return "reinforcement";
      }

      if (["known", "знаю", "вивчено"].includes(key)) return "known";

      return "dictionary";
    }

    function splitCsvTags(value) {
      return String(value || "")
        .split(/[;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function getCsvColumnIndexes(headerRow) {
      const normalized = headerRow.map(normalizeHeader);
      const findAny = (names, fallback) => {
        const keys = names.map(normalizeHeader);
        const index = normalized.findIndex((name) => keys.includes(name));
        return index >= 0 ? index : fallback;
      };

      return {
        front: findAny(["side_1_ukrainian", "side 1", "сторона 1", "українською", "front"], 0),
        back: findAny(["side_2_spanish", "side 2", "сторона 2", "іспанською", "spanish", "back"], 1),
        notes: findAny(["notes", "примітки", "синоніми", "відмінювання"], 2),
        mode: findAny(["mode", "режим"], 3),
        tags: findAny(["tags", "теги", "категорії", "categories"], 4)
      };
    }

    function looksLikeCsvHeader(row) {
      const names = row.map(normalizeHeader);
      return names.some((name) => [
        "side1ukrainian", "side2spanish", "сторона1", "сторона2",
        "українською", "іспанською", "front", "back", "notes", "mode", "tags"
      ].includes(name));
    }

    function importCardsFromCsvText(text, sourceEncoding = "") {
      const rows = parseCsv(text);
      if (!rows.length) {
        showToast("CSV-файл порожній.");
        return;
      }

      const hasHeader = looksLikeCsvHeader(rows[0]);
      const indexes = hasHeader ? getCsvColumnIndexes(rows[0]) : { front: 0, back: 1, notes: 2, mode: 3, tags: 4 };
      const dataRows = hasHeader ? rows.slice(1) : rows;
      let imported = 0;
      let skipped = 0;
      let movedToDictionary = 0;

      let plannedLearning = state.cards.filter((card) => card.mode === "learning").length;
      let plannedReinforcement = state.cards.filter((card) => card.mode === "reinforcement").length;

      for (const row of dataRows) {
        const front = String(row[indexes.front] || "").trim();
        const back = String(row[indexes.back] || "").trim();

        if (!front || !back) {
          skipped += 1;
          continue;
        }

        let mode = mapCsvMode(row[indexes.mode] || "dictionary");

        if (mode === "learning") {
          if (plannedLearning >= MAX_LEARNING) {
            mode = "dictionary";
            movedToDictionary += 1;
          } else {
            plannedLearning += 1;
          }
        }

        if (mode === "reinforcement") {
          if (plannedReinforcement >= MAX_REINFORCEMENT) {
            mode = "dictionary";
            movedToDictionary += 1;
          } else {
            plannedReinforcement += 1;
          }
        }

        state.cards.push({
          id: uid("card"),
          front,
          back,
          notes: String(row[indexes.notes] || "").trim(),
          tagIds: ensureTags(splitCsvTags(row[indexes.tags] || "")),
          mode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        imported += 1;
      }

      if (!imported) {
        showToast("Не імпортовано жодної картки. Перевірте, чи заповнені перші дві колонки.");
        return;
      }

      selectedIds.clear();
      saveState();
      renderAll();

      let message = `Імпортовано карток: ${imported}.`;
      if (sourceEncoding) message += ` Кодування: ${sourceEncoding}.`;
      if (skipped) message += ` Пропущено рядків: ${skipped}.`;
      if (movedToDictionary) {
        message += ` ${movedToDictionary} карт. перенесено в Словник через ліміт режимів.`;
      }
      showToast(message);
    }

    function importCardsFromCsvFile(file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const decoded = decodeCsvArrayBuffer(reader.result);
          importCardsFromCsvText(decoded.text, decoded.encoding);
        } catch (error) {
          showToast("Не вдалося розпізнати кодування CSV-файлу. Спробуйте зберегти файл як CSV UTF-8.");
        }
      };
      reader.onerror = () => showToast("Не вдалося прочитати CSV-файл.");
      reader.readAsArrayBuffer(file);
    }

    function pickStudyCard(excludeId = null, options = {}) {
      const sessionMode = options.sessionMode || study?.sessionMode || getSelectedStudySessionMode();
      const pool = state.cards.filter((card) => card.mode === sessionMode);
      const sessionLabel = STUDY_SESSION_LABELS[sessionMode] || MODE_LABELS[sessionMode];

      if (!pool.length) {
        study = null;
        studyHistory = [];
        saveState();
        renderAll();
        showToast(`У режимі “${sessionLabel}” більше немає карток.`);
        return;
      }

      const candidates = pool.length > 1
        ? pool.filter((card) => card.id !== excludeId)
        : pool;

      const card = candidates[Math.floor(Math.random() * candidates.length)];

      setStudyCard(card, { ...options, sessionMode });
    }

    function handleStudyAction(action) {
  if (!study) return;

  const sessionMode = study.sessionMode || getSelectedStudySessionMode();
  const card = state.cards.find((item) => item.id === study.cardId);

  if (!card) return;

  const answerEl = $("#studyAnswer");
  if (answerEl) study.answer = answerEl.value;

  if (action === "flip") {
    study.flipped = !study.flipped;
    renderStudy();
    return;
  }

  if (action === "next") {
    pickStudyCard(study.cardId, { sessionMode });
    return;
  }

  if (action === "previous") {
    while (studyHistory.length) {
      const previousId = studyHistory.pop();
      const previousCard = state.cards.find((item) => item.id === previousId && item.mode === sessionMode);

      if (previousCard) {
        setStudyCard(previousCard, { rememberCurrent: false, sessionMode });
        return;
      }
    }

    showToast("Попередньої картки немає.");
    return;
  }

  if (["dictionary", "learning", "reinforcement", "known"].includes(action)) {
    if (!canMoveToMode([card.id], action)) {
      showToast(getModeLimitMessage(action));
      return;
    }

    card.mode = action;
    card.updatedAt = new Date().toISOString();

    saveState();

    pickStudyCard(card.id, { rememberCurrent: false, sessionMode });

    showToast(`Картку переміщено в “${MODE_LABELS[action]}”.`);
    return;
  }

  if (action === "edit") {
    openCardModal(card.id);
  }
}

    function insertAtCursor(targetId, char) {
      const input = document.getElementById(targetId);
      if (!input) return;

      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = `${input.value.slice(0, start)}${char}${input.value.slice(end)}`;
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }

    function bindEvents() {
      els.createCardForm.addEventListener("submit", createCard);

      els.quickAddTag.addEventListener("click", addQuickTag);
      els.quickTagName.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addQuickTag();
        }
      });

      els.searchInput.addEventListener("input", resetPageAndRenderCardList);
      els.modeFilter.addEventListener("change", resetPageAndRenderCardList);
      els.sortSelect.addEventListener("change", resetPageAndRenderCardList);

      els.pageSizeSelect.addEventListener("change", () => {
        const nextPageSize = Number(els.pageSizeSelect.value);
        pageSize = PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : DEFAULT_PAGE_SIZE;
        saveStoredValue(PAGE_SIZE_KEY, pageSize);
        currentPage = 1;
        renderCardList();
      });

      els.prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          renderCardList();
        }
      });

      els.nextPageBtn.addEventListener("click", () => {
        const pageCount = getPageCount(getVisibleCards().length);
        if (currentPage < pageCount) {
          currentPage += 1;
          renderCardList();
        }
      });

      if (savedStudySideMode && els.studySideMode) {
        els.studySideMode.value = savedStudySideMode;
      }

      els.studySideMode.addEventListener("change", () => {
        saveStoredValue(STUDY_SIDE_MODE_KEY, els.studySideMode.value);
      });

      els.studySessionMode.addEventListener("change", () => {
        study = null;
        studyHistory = [];
        renderAll();
      });

      els.studyBtn.addEventListener("click", () => {
        const sessionMode = getSelectedStudySessionMode();

        studyHistory = [];
        pickStudyCard(null, { rememberCurrent: false, sessionMode });
      });
      els.closeStudyBtn.addEventListener("click", () => {
        study = null;
        studyHistory = [];
        renderAll();
      });

      els.exportCsvBtn.addEventListener("click", exportCardsToCsv);
      els.importCsvBtn.addEventListener("click", () => els.csvFileInput.click());
      els.csvFileInput.addEventListener("change", (event) => {
        importCardsFromCsvFile(event.target.files[0]);
        event.target.value = "";
      });

      function applyBulkModeFromToolbar() {
        const mode = els.bulkModeSelect.value;
        if (!mode) {
          showToast("Оберіть режим для групової дії.");
          return;
        }

        const ids = getSelectedCardIds();
        const changed = moveCards(ids, mode);
        if (changed) {
          els.bulkModeSelect.value = "";
        }
      }
      
      els.clearSelectionBtn.addEventListener("click", clearAllSelections);
      els.bulkApplyMode.addEventListener("click", applyBulkModeFromToolbar);
      els.bulkModeSelect.addEventListener("change", () => {
        if (els.bulkModeSelect.value) applyBulkModeFromToolbar();
      });

      els.bulkAddTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "add"));
      els.bulkReplaceTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "replace"));
      els.bulkRemoveTags.addEventListener("click", () => applyTagChange(getSelectedCardIds(), "remove"));
      els.bulkDelete.addEventListener("click", () => deleteCards(getSelectedCardIds()));

      els.closeCardModal.addEventListener("click", closeCardModal);
      els.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === els.modalBackdrop) closeCardModal();
      });
      els.editCardForm.addEventListener("submit", saveCardEdit);
      els.deleteFromModal.addEventListener("click", () => {
        const id = els.editCardId.value;
        closeCardModal();
        deleteCards([id]);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && els.modalBackdrop.classList.contains("active")) {
          closeCardModal();
        }
      });

      document.addEventListener("click", (event) => {
        const accentButton = event.target.closest("[data-char][data-target]");
        if (accentButton) {
          insertAtCursor(accentButton.dataset.target, accentButton.dataset.char);
          return;
        }

        const sortButton = event.target.closest("[data-sort]");
        if (sortButton) {
          els.sortSelect.value = sortButton.dataset.sort;
          currentPage = 1;
          renderCardList();
          return;
        }

        const tagButton = event.target.closest("[data-tag-action]");
        if (tagButton) {
          if (tagButton.dataset.tagAction === "rename") renameTag(tagButton.dataset.tagId);
          if (tagButton.dataset.tagAction === "delete") deleteTag(tagButton.dataset.tagId);
          return;
        }

        const cardButton = event.target.closest("button[data-card-action]");
        if (cardButton) {
          const id = cardButton.dataset.cardId;
          if (cardButton.dataset.cardAction === "edit") openCardModal(id);
          if (cardButton.dataset.cardAction === "delete") deleteCards([id]);
          return;
        }

        const studyButton = event.target.closest("[data-study-action]");
        if (studyButton) {
          handleStudyAction(studyButton.dataset.studyAction);
        }
      });

      document.addEventListener("change", (event) => {
        const checkbox = event.target.closest(".card-check");
        if (checkbox) {
          if (checkbox.checked) selectedIds.add(checkbox.dataset.cardId);
          else selectedIds.delete(checkbox.dataset.cardId);
          renderCardList();
          return;
        }

        if (event.target.id === "selectAllVisible") {
          const visible = getDisplayedCards();

          if (event.target.checked) {
            visible.forEach((card) => selectedIds.add(card.id));
          } else {
            visible.forEach((card) => selectedIds.delete(card.id));
          }

          renderCardList();
          return;
        }

        const modeSelect = event.target.closest("select[data-card-action='mode']");
        if (modeSelect) {
          const id = modeSelect.dataset.cardId;
          const card = state.cards.find((item) => item.id === id);
          const previous = card ? card.mode : null;
          const ok = moveCards([id], modeSelect.value);
          if (!ok && previous) {
            modeSelect.value = previous;
          }
        }
      });

      els.studyPanel.addEventListener("input", (event) => {
        if (event.target.id === "studyAnswer" && study) {
          study.answer = event.target.value;
        }
      });
    }

    async function initApp() {
      await loadStoredData();
      bindEvents();
      sortTags();
      await saveState();
      renderAll();
    }

    initApp().catch((error) => {
      console.warn("Could not initialize app", error);
      renderAll();
      showToast("Не вдалося завантажити дані. Спробуйте перезавантажити сторінку.");
    });
