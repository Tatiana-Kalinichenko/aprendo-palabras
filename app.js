const STORAGE_KEY = "aprendo-espanol-cards-v1";
    const STUDY_SIDE_MODE_KEY = "aprendo-espanol-study-side-mode";
    const STUDY_SYNC_KEY = "aprendo-palabras-study-state-v1";
    const MAX_LEARNING = 30;
    const MAX_REINFORCEMENT = 100;
    const PAGE_SIZE_KEY = "aprendo-espanol-page-size";
    const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
    const DEFAULT_PAGE_SIZE = 50;

    const MODE_LABEL_KEYS = {
      dictionary: "mode.dictionary",
      learning: "mode.learning",
      reinforcement: "mode.reinforcement",
      known: "mode.known"
    };

    const MODE_ORDER = ["dictionary", "learning", "reinforcement", "known"];

    const STUDY_SESSION_LABEL_KEYS = {
      learning: "session.learning",
      reinforcement: "session.reinforcement",
      review: "session.review"
    };

    const STUDY_SESSION_CARD_MODES = {
      learning: "learning",
      reinforcement: "reinforcement",
      review: "known"
    };

    const t = (key, params = {}) => (
      window.AprendoI18n ? window.AprendoI18n.t(key, params) : key
    );

    function getModeLabel(mode) {
      return t(MODE_LABEL_KEYS[mode] || MODE_LABEL_KEYS.dictionary);
    }

    function getStudySessionLabel(sessionMode) {
      return t(STUDY_SESSION_LABEL_KEYS[sessionMode] || STUDY_SESSION_LABEL_KEYS.learning);
    }

    function getCustomSelectIcon(selectId, value) {
      const icons = {
        studySessionMode: {
          learning: "book",
          reinforcement: "reinforcement",
          review: "check"
        },
        studySideMode: {
          front: "side1",
          back: "side2",
          random: "random"
        }
      };

      return icons[selectId]?.[value] || "dropdown";
    }

    let state = { cards: [], tags: [] };
    let selectedIds = new Set();
    const tagSelections = {
      create: new Set(),
      edit: new Set()
    };
    let study = null;
    let studyHistory = [];
    let studyDeck = createEmptyStudyDeck();
    let toastTimer = null;

    let currentPage = 1;
    let pageSize = DEFAULT_PAGE_SIZE;
    let savedStudySideMode = null;
    let storedStudySnapshot = null;
    let storageBackend = "local";
    let storageWriteQueue = Promise.resolve();
    let storageSyncBound = false;
    let syncingStudyState = false;
    let lastStudySyncUpdatedAt = 0;
    const STUDY_SYNC_SOURCE = `main-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const $ = (selector) => document.querySelector(selector);

    const els = {
      stats: $("#stats"),
      studyBtn: $("#studyBtn"),
      studySessionMode: $("#studySessionMode"),
      studySideMode: $("#studySideMode"),
      exportCsvBtn: $("#exportCsvBtn"),
      importCsvBtn: $("#importCsvBtn"),
      csvFileInput: $("#csvFileInput"),
      studyPanel: $("#studyPanel"),
      createCardForm: $("#createCardForm"),
      cardFront: $("#cardFront"),
      cardBack: $("#cardBack"),
      cardFrontSuggestions: $("#cardFrontSuggestions"),
      cardBackSuggestions: $("#cardBackSuggestions"),
      cardNotes: $("#cardNotes"),
      createTagDropdownButton: $("#createTagDropdownButton"),
      createTagDropdownLabel: $("#createTagDropdownLabel"),
      createTagDropdown: $("#createTagDropdown"),
      createTagSearch: $("#createTagSearch"),
      createTagOptions: $("#createTagOptions"),
      createTagCreateButton: $("#createTagCreateButton"),
      createSelectedTags: $("#createSelectedTags"),
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
      editTagDropdownButton: $("#editTagDropdownButton"),
      editTagDropdownLabel: $("#editTagDropdownLabel"),
      editTagDropdown: $("#editTagDropdown"),
      editTagSearch: $("#editTagSearch"),
      editTagOptions: $("#editTagOptions"),
      editTagCreateButton: $("#editTagCreateButton"),
      editSelectedTags: $("#editSelectedTags"),
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
        storedStudySnapshot = normalizeStudySnapshot(readLocalStorageValue(STUDY_SYNC_KEY));
        return;
      }

      try {
        storageBackend = "extension";

        const stored = await chromeStorageGet([STORAGE_KEY, PAGE_SIZE_KEY, STUDY_SIDE_MODE_KEY, STUDY_SYNC_KEY]);
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

        if (hasOwn(stored, STUDY_SYNC_KEY)) {
          storedStudySnapshot = normalizeStudySnapshot(stored[STUDY_SYNC_KEY]);
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
        storedStudySnapshot = normalizeStudySnapshot(readLocalStorageValue(STUDY_SYNC_KEY));
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

    function normalizeStudySnapshot(value) {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!parsed || typeof parsed !== "object") return null;
        const sessionMode = STUDY_SESSION_CARD_MODES[parsed.sessionMode] ? parsed.sessionMode : "learning";

        return {
          active: Boolean(parsed.active),
          source: String(parsed.source || ""),
          updatedAt: Number(parsed.updatedAt) || 0,
          sessionMode,
          sideMode: normalizeStudySideMode(parsed.sideMode) || "random",
          cardId: String(parsed.cardId || ""),
          side: ["front", "back"].includes(parsed.side) ? parsed.side : "front",
          flipped: Boolean(parsed.flipped),
          answer: String(parsed.answer || ""),
          history: normalizeIdList(parsed.history),
          deck: normalizeStudyDeckSnapshot(parsed.deck, sessionMode)
        };
      } catch (error) {
        return null;
      }
    }

    function createStudySnapshot() {
      const sessionMode = study?.sessionMode || getSelectedStudySessionMode();
      return {
        active: Boolean(study),
        source: STUDY_SYNC_SOURCE,
        updatedAt: Date.now(),
        sessionMode,
        sideMode: els.studySideMode?.value || "random",
        cardId: study?.cardId || "",
        side: study?.side || "front",
        flipped: Boolean(study?.flipped),
        answer: study?.answer || "",
        history: studyHistory.slice(),
        deck: normalizeStudyDeckSnapshot(studyDeck, sessionMode)
      };
    }

    function publishStudyState() {
      if (syncingStudyState) return;

      const snapshot = createStudySnapshot();
      lastStudySyncUpdatedAt = snapshot.updatedAt;
      saveStoredValue(STUDY_SYNC_KEY, snapshot);
    }

    function applySharedStudyState(value, options = {}) {
      const snapshot = normalizeStudySnapshot(value);
      if (!snapshot) return false;
      if (!options.force && snapshot.source === STUDY_SYNC_SOURCE) return false;
      if (!options.force && snapshot.updatedAt <= lastStudySyncUpdatedAt) return false;

      lastStudySyncUpdatedAt = snapshot.updatedAt;
      syncingStudyState = true;

      if (els.studySessionMode) els.studySessionMode.value = snapshot.sessionMode;
      if (els.studySideMode) els.studySideMode.value = snapshot.sideMode;

      if (!snapshot.active) {
        study = null;
        studyHistory = [];
        resetStudyDeck(snapshot.sessionMode);
        renderAll();
        syncingStudyState = false;
        return true;
      }

      const cardMode = getStudyCardMode(snapshot.sessionMode);
      const card = state.cards.find((item) => item.id === snapshot.cardId && item.mode === cardMode);

      if (!card) {
        study = null;
        studyHistory = [];
        resetStudyDeck(snapshot.sessionMode);
        renderAll();
        syncingStudyState = false;
        return true;
      }

      study = {
        sessionMode: snapshot.sessionMode,
        cardId: snapshot.cardId,
        side: snapshot.side,
        flipped: snapshot.flipped,
        answer: snapshot.answer
      };
      studyHistory = snapshot.history.slice();
      studyDeck = snapshot.deck;
      if (!studyDeck.queueIds.length && !studyDeck.lastCycleIds.length) {
        primeStudyDeckAfterCurrent(card.id, snapshot.sessionMode);
      }
      renderAll();
      syncingStudyState = false;
      return true;
    }

    function bindExternalStorageSync() {
      if (storageSyncBound) return;

      if (storageBackend !== "extension") {
        storageSyncBound = true;
        window.addEventListener("storage", (event) => {
          if (event.key === STORAGE_KEY) {
            state = normalizeStoredState(event.newValue);
            sortTags();
            syncingStudyState = true;
            renderAll();
            syncingStudyState = false;
          }

          if (event.key === STUDY_SYNC_KEY) {
            applySharedStudyState(event.newValue);
          }
        });
        return;
      }

      if (!chrome.storage?.onChanged) return;

      storageSyncBound = true;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;

        if (changes[STORAGE_KEY]) {
          state = normalizeStoredState(changes[STORAGE_KEY].newValue);
          sortTags();
          syncingStudyState = true;
          renderAll();
          syncingStudyState = false;
        }

        if (changes[STUDY_SYNC_KEY]) {
          applySharedStudyState(changes[STUDY_SYNC_KEY].newValue);
        }
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

    function normalizeSideSuggestionText(value) {
      return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("uk");
    }

    function getSideSuggestionMatches(side, value) {
      const query = normalizeSideSuggestionText(value);
      if (!query) return [];

      return state.cards.filter((card) => {
        const sideText = side === "front" ? card.front : card.back;
        return normalizeSideSuggestionText(sideText).startsWith(query);
      });
    }

    function renderSideSuggestionList(container, matches) {
      if (!container) return;

      if (!matches.length) {
        container.hidden = true;
        container.innerHTML = "";
        return;
      }

      container.hidden = false;
      container.innerHTML = matches.map((card) => `
        <div class="side-suggestion">${escapeHtml(card.front)} &mdash; ${escapeHtml(card.back)}</div>
      `).join("");
    }

    function renderCreateSideSuggestions() {
      renderSideSuggestionList(
        els.cardFrontSuggestions,
        getSideSuggestionMatches("front", els.cardFront.value)
      );
      renderSideSuggestionList(
        els.cardBackSuggestions,
        getSideSuggestionMatches("back", els.cardBack.value)
      );
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
      return getTagNames(card)[0] || t("app.tags.noTags");
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
      els.selectedInfo.textContent = t("app.list.selected", { count: selectedCount });

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

function createEmptyStudyDeck(sessionMode = null) {
  return {
    sessionMode,
    queueIds: [],
    lastCycleIds: []
  };
}

function resetStudyDeck(sessionMode = null) {
  studyDeck = createEmptyStudyDeck(sessionMode);
}

function normalizeIdList(value) {
  return Array.isArray(value)
    ? value.map((id) => String(id || "")).filter(Boolean)
    : [];
}

function uniqueIds(ids) {
  return Array.from(new Set(ids));
}

function normalizeStudyDeckSnapshot(value, fallbackSessionMode = null) {
  const deck = value && typeof value === "object" ? value : {};
  const deckSessionMode = STUDY_SESSION_CARD_MODES[deck.sessionMode] ? deck.sessionMode : null;
  const sessionMode = deckSessionMode === fallbackSessionMode
    ? deckSessionMode
    : fallbackSessionMode || deckSessionMode;

  return {
    sessionMode,
    queueIds: uniqueIds(normalizeIdList(deck.queueIds)),
    lastCycleIds: uniqueIds(normalizeIdList(deck.lastCycleIds))
  };
}

function primeStudyDeckAfterCurrent(currentId, sessionMode) {
  const cardMode = getStudyCardMode(sessionMode);
  const poolIds = state.cards
    .filter((card) => card.mode === cardMode)
    .map((card) => card.id);

  if (!poolIds.includes(currentId)) {
    resetStudyDeck(sessionMode);
    return;
  }

  const remainingIds = shuffleIds(poolIds.filter((id) => id !== currentId));
  studyDeck = {
    sessionMode,
    queueIds: remainingIds,
    lastCycleIds: [currentId].concat(remainingIds)
  };
}

function getStudyCardMode(sessionMode) {
  return STUDY_SESSION_CARD_MODES[sessionMode] || STUDY_SESSION_CARD_MODES.learning;
}

function shuffleIds(ids) {
  const shuffled = ids.slice();

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function isSameOrder(first, second) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

function rotateFirstIdToEnd(ids) {
  return ids.length > 1 ? ids.slice(1).concat(ids[0]) : ids;
}

function avoidSameCycleOrder(ids, previousIds) {
  if (ids.length <= 1 || !isSameOrder(ids, previousIds)) return ids;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shuffled = shuffleIds(ids);
    if (!isSameOrder(shuffled, previousIds)) return shuffled;
  }

  return rotateFirstIdToEnd(ids);
}

function avoidImmediateRepeat(ids, previousId, previousCycleIds = []) {
  if (ids.length <= 1 || !previousId || ids[0] !== previousId) return ids;

  const rotated = rotateFirstIdToEnd(ids);
  return isSameOrder(rotated, previousCycleIds) ? ids : rotated;
}

function buildStudyCycle(ids, previousCycleIds, previousId) {
  const shuffled = avoidSameCycleOrder(shuffleIds(ids), previousCycleIds);
  return avoidImmediateRepeat(shuffled, previousId, previousCycleIds);
}

function setStudyCard(card, options = {}) {
  const {
  rememberCurrent = true,
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
  publishStudyState();
}

    function getModeLimit(mode) {
  if (mode === "learning") return MAX_LEARNING;
  if (mode === "reinforcement") return MAX_REINFORCEMENT;
  return Infinity;
}

function getModeLimitMessage(mode) {
  if (mode === "learning") {
    return t("toast.modeLimit.learning", { limit: MAX_LEARNING });
  }

  if (mode === "reinforcement") {
    return t("toast.modeLimit.reinforcement", { limit: MAX_REINFORCEMENT });
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

function getModeRank(mode) {
  const rank = MODE_ORDER.indexOf(mode);
  return rank >= 0 ? rank : MODE_ORDER.indexOf("dictionary");
}

function getHigherMode(firstMode, secondMode) {
  return getModeRank(firstMode) >= getModeRank(secondMode) ? firstMode : secondMode;
}

function getImportModeFallbacks(mode) {
  const modeIndex = getModeRank(mode);
  return MODE_ORDER.slice(0, modeIndex + 1).reverse();
}

function canFitImportedMode(mode, ignoredCardId = null) {
  const limit = getModeLimit(mode);
  if (!Number.isFinite(limit)) return true;

  const count = state.cards.filter((card) => card.mode === mode && card.id !== ignoredCardId).length;
  return count < limit;
}

function resolveImportMode(mode, existingCard = null) {
  const currentMode = existingCard?.mode || null;
  const currentRank = currentMode ? getModeRank(currentMode) : getModeRank("dictionary");

  for (const candidate of getImportModeFallbacks(mode)) {
    if (getModeRank(candidate) < currentRank) break;
    if (candidate === currentMode || canFitImportedMode(candidate, existingCard?.id || null)) {
      return candidate;
    }
  }

  return currentMode || "dictionary";
}

function getSelectedStudySessionMode() {
  const selectedMode = els.studySessionMode?.value;
  return STUDY_SESSION_CARD_MODES[selectedMode] ? selectedMode : "learning";
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
      syncCustomSelects();
      renderStats();
      renderTagPickers();
      renderTagList();
      renderCardList();
      renderCreateSideSuggestions();
      renderStudy();
      updateStudyButton();
    }

    function closeCustomSelects() {
      document.querySelectorAll("[data-custom-select]").forEach((shell) => {
        const trigger = shell.querySelector(".custom-select-trigger");
        const menu = shell.querySelector(".custom-select-menu");
        if (menu) menu.hidden = true;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    }

    function syncCustomSelect(selectId) {
      const select = document.getElementById(selectId);
      const shell = document.querySelector(`[data-custom-select="${selectId}"]`);
      if (!select || !shell) return;

      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      const icon = shell.querySelector("[data-custom-select-icon]");
      const label = shell.querySelector("[data-custom-select-label]");
      const menu = shell.querySelector(".custom-select-menu");

      if (icon) {
        icon.className = `ui-icon ui-icon-${getCustomSelectIcon(selectId, select.value)}`;
      }

      if (label && selectedOption) {
        label.textContent = selectedOption.textContent;
      }

      if (menu) {
        menu.innerHTML = Array.from(select.options).map((option) => {
          const isSelected = option.value === select.value;
          return `
            <button class="custom-select-option ${isSelected ? "is-selected" : ""}" type="button" role="option" aria-selected="${isSelected ? "true" : "false"}" data-custom-option="${escapeHtml(selectId)}" data-value="${escapeHtml(option.value)}">
              <span class="ui-icon ui-icon-${escapeHtml(getCustomSelectIcon(selectId, option.value))}" aria-hidden="true"></span>
              <span>${escapeHtml(option.textContent)}</span>
            </button>
          `;
        }).join("");
      }
    }

    function syncCustomSelects() {
      syncCustomSelect("studySessionMode");
      syncCustomSelect("studySideMode");
    }

    function renderStats() {
      const counts = {
        dictionary: state.cards.filter((card) => card.mode === "dictionary").length,
        learning: state.cards.filter((card) => card.mode === "learning").length,
        reinforcement: state.cards.filter((card) => card.mode === "reinforcement").length,
        known: state.cards.filter((card) => card.mode === "known").length
      };

      const statItems = [
        { key: "total", icon: "cards", label: t("app.stats.totalLabel"), value: state.cards.length },
        { key: "dictionary", icon: "books", label: t("app.stats.dictionaryLabel"), value: counts.dictionary },
        { key: "learning", icon: "book", label: t("app.stats.learningLabel"), value: `${counts.learning}/${MAX_LEARNING}` },
        { key: "reinforcement", icon: "reinforcement", label: t("app.stats.reinforcementLabel"), value: `${counts.reinforcement}/${MAX_REINFORCEMENT}` },
        { key: "known", icon: "check", label: t("app.stats.knownLabel"), value: counts.known }
      ];

      els.stats.innerHTML = statItems.map((item) => `
        <article class="stat stat-${escapeHtml(item.key)}">
          <span class="stat-icon ui-icon ui-icon-${escapeHtml(item.icon)}" aria-hidden="true"></span>
          <span class="stat-label">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `).join("");
    }

    function getTagCombobox(type) {
      if (type === "edit") {
        return {
          button: els.editTagDropdownButton,
          label: els.editTagDropdownLabel,
          dropdown: els.editTagDropdown,
          search: els.editTagSearch,
          options: els.editTagOptions,
          createButton: els.editTagCreateButton,
          selected: els.editSelectedTags
        };
      }

      return {
        button: els.createTagDropdownButton,
        label: els.createTagDropdownLabel,
        dropdown: els.createTagDropdown,
        search: els.createTagSearch,
        options: els.createTagOptions,
        createButton: els.createTagCreateButton,
        selected: els.createSelectedTags
      };
    }

    function getSelectedTagIds(type) {
      const existingIds = new Set(state.tags.map((tag) => tag.id));
      tagSelections[type] = new Set(Array.from(tagSelections[type] || []).filter((id) => existingIds.has(id)));
      return Array.from(tagSelections[type]);
    }

    function getSelectedTags(type) {
      const selectedIds = new Set(getSelectedTagIds(type));
      return state.tags.filter((tag) => selectedIds.has(tag.id));
    }

    function closeTagDropdown(type) {
      const ui = getTagCombobox(type);
      if (!ui.dropdown) return;
      ui.dropdown.hidden = true;
      ui.button.setAttribute("aria-expanded", "false");
    }

    function closeAllTagDropdowns() {
      closeTagDropdown("create");
      closeTagDropdown("edit");
    }

    function openTagDropdown(type) {
      const ui = getTagCombobox(type);
      if (!ui.dropdown) return;
      closeAllTagDropdowns();
      ui.dropdown.hidden = false;
      ui.button.setAttribute("aria-expanded", "true");
      renderTagCombobox(type);
      ui.search.focus();
    }

    function toggleTagDropdown(type) {
      const ui = getTagCombobox(type);
      if (!ui.dropdown) return;
      if (ui.dropdown.hidden) openTagDropdown(type);
      else closeTagDropdown(type);
    }

    function renderTagCombobox(type) {
      const ui = getTagCombobox(type);
      if (!ui.button) return;

      const selectedTags = getSelectedTags(type);
      ui.label.innerHTML = selectedTags.length
        ? `<strong>${selectedTags.length}</strong> ${escapeHtml(t("app.tags.selected", { count: selectedTags.length })).replace(String(selectedTags.length), "").trim()}`
        : escapeHtml(t("app.tags.dropdownPlaceholder"));

      ui.selected.innerHTML = selectedTags.map((tag) => `
        <button class="selected-tag" type="button" data-tag-remove="${escapeHtml(type)}" data-tag-id="${escapeHtml(tag.id)}" aria-label="${escapeHtml(t("app.tags.removeTag", { name: tag.name }))}">
          <span>${escapeHtml(tag.name)}</span>
          <span aria-hidden="true">×</span>
        </button>
      `).join("");
      ui.selected.classList.toggle("is-empty", !selectedTags.length);

      const query = normalize(ui.search.value);
      const filteredTags = state.tags.filter((tag) => !query || normalize(tag.name).includes(query));
      const selectedIds = new Set(getSelectedTagIds(type));

      ui.options.innerHTML = filteredTags.length
        ? filteredTags.map((tag) => {
          const selected = selectedIds.has(tag.id);
          return `
            <button class="tag-option ${selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${selected ? "true" : "false"}" data-tag-option="${escapeHtml(type)}" data-tag-id="${escapeHtml(tag.id)}">
              <span class="ui-icon ui-icon-check" aria-hidden="true"></span>
              <span>${escapeHtml(tag.name)}</span>
            </button>
          `;
        }).join("")
        : `<div class="empty-tags">${escapeHtml(t("app.tags.emptySearch"))}</div>`;

      const rawName = ui.search.value.trim();
      const canCreate = rawName && !state.tags.some((tag) => normalize(tag.name) === normalize(rawName));
      ui.createButton.hidden = !canCreate;
      ui.createButton.textContent = canCreate ? t("app.tags.createTag", { name: rawName }) : "";
    }

    function renderTagPickers() {
      renderTagCombobox("create");
      renderTagCombobox("edit");
    }

    function renderTagList() {
      if (!state.tags.length) {
        els.tagList.innerHTML = `<div class="empty">${escapeHtml(t("app.tags.emptyList"))}</div>`;
        return;
      }

      els.tagList.innerHTML = state.tags.map((tag) => {
        const count = state.cards.filter((card) => (card.tagIds || []).includes(tag.id)).length;
        return `
          <div class="tag-line">
            <div>
              <strong>${escapeHtml(tag.name)}</strong>
              <div class="muted-text">${escapeHtml(t("app.tags.countAbbr", { count }))}</div>
            </div>
            <div class="row-actions">
              <button class="mini icon-btn" data-tag-action="rename" data-tag-id="${escapeHtml(tag.id)}" aria-label="${escapeHtml(t("app.tags.renameAria"))}" title="${escapeHtml(t("app.tags.renameAria"))}"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button>
              <button class="mini danger icon-btn" data-tag-action="delete" data-tag-id="${escapeHtml(tag.id)}" aria-label="${escapeHtml(t("app.tags.deleteAria"))}" title="${escapeHtml(t("app.tags.deleteAria"))}"><span class="ui-icon ui-icon-trash" aria-hidden="true"></span></button>
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
      ? t("app.list.pageRange", { from: startIndex + 1, to: endIndex, total: totalFiltered })
        : t("app.list.pageRangeEmpty");

      els.prevPageBtn.disabled = currentPage <= 1 || totalFiltered === 0;
      els.nextPageBtn.disabled = currentPage >= pageCount || totalFiltered === 0;
    }

    function resetPageAndRenderCardList() {
      currentPage = 1;
      renderCardList();
    }

    function clearAllSelections() {
      if (!selectedIds.size) {
        showToast(t("toast.noSelectedCards"));
        return;
      }

      selectedIds.clear();
      renderCardList();
      showToast(t("toast.selectionCleared"));
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
        els.tableWrap.innerHTML = `<div class="empty">${escapeHtml(t("app.list.emptyCards"))}</div>`;
        return;
      }

      if (!visible.length) {
        els.tableWrap.innerHTML = `<div class="empty">${escapeHtml(t("app.list.emptySearch"))}</div>`;
        return;
      }

      const sort = els.sortSelect.value;
      let lastGroup = null;
      const rows = [];

      for (const card of pageCards) {
        const group = sort === "tags" ? getPrimaryTagName(card) : sort === "mode" ? getModeLabel(card.mode) : null;
        if (group && group !== lastGroup) {
          rows.push(`<tr class="group-row"><td colspan="7">${escapeHtml(group)}</td></tr>`);
          lastGroup = group;
        }

        const tagsHtml = getTagNames(card).map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("") || `<span class="muted-text">${escapeHtml(t("app.tags.noTags"))}</span>`;
        const notes = card.notes ? `<div class="muted-text">${multiline(card.notes)}</div>` : `<span class="muted-text">—</span>`;

        rows.push(`
          <tr>
            <td>
              <input type="checkbox" class="card-check" data-card-id="${escapeHtml(card.id)}" ${selectedIds.has(card.id) ? "checked" : ""}>
            </td>
            <td class="word-cell">${multiline(card.front)}</td>
            <td class="word-cell">${multiline(card.back)}</td>
            <td>
              <select data-card-action="mode" data-card-id="${escapeHtml(card.id)}" aria-label="${escapeHtml(t("app.list.changeModeAria"))}">
                <option value="dictionary" ${card.mode === "dictionary" ? "selected" : ""}>${escapeHtml(getModeLabel("dictionary"))}</option>
                <option value="learning" ${card.mode === "learning" ? "selected" : ""}>${escapeHtml(getModeLabel("learning"))}</option>
                <option value="reinforcement" ${card.mode === "reinforcement" ? "selected" : ""}>${escapeHtml(getModeLabel("reinforcement"))}</option>
                <option value="known" ${card.mode === "known" ? "selected" : ""}>${escapeHtml(getModeLabel("known"))}</option>
              </select>
            </td>
            <td>${notes}</td>
            <td>${tagsHtml}</td>
            <td>
              <div class="row-actions">
                <button class="mini icon-btn" data-card-action="edit" data-card-id="${escapeHtml(card.id)}" aria-label="${escapeHtml(t("app.list.editCard"))}" title="${escapeHtml(t("app.list.editCard"))}"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button>
                <button class="mini danger icon-btn" data-card-action="delete" data-card-id="${escapeHtml(card.id)}" aria-label="${escapeHtml(t("app.list.deleteCard"))}" title="${escapeHtml(t("app.list.deleteCard"))}"><span class="ui-icon ui-icon-trash" aria-hidden="true"></span></button>
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
            <col class="change-col">
            <col class="notes-col">
            <col class="tags-col">
            <col class="actions-col">
          </colgroup>
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAllVisible" ${allVisibleSelected ? "checked" : ""} aria-label="${escapeHtml(t("app.list.selectAllVisible"))}"></th>
              <th>${sortHeaderButton("front", t("app.list.headerFront"), sort)}</th>
              <th>${sortHeaderButton("back", t("app.list.headerBack"), sort)}</th>
              <th>${escapeHtml(t("app.list.headerChange"))}</th>
              <th>${escapeHtml(t("app.list.headerNotes"))}</th>
              <th>${sortHeaderButton("tags", t("app.list.headerTags"), sort)}</th>
              <th>${escapeHtml(t("app.list.headerActions"))}</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      `;
    }

    function updateStudyButton() {
     const sessionMode = getSelectedStudySessionMode();
      const cardMode = getStudyCardMode(sessionMode);
      const cardsCount = state.cards.filter((card) => card.mode === cardMode).length;
      const sessionLabel = getStudySessionLabel(sessionMode);

      els.studyBtn.disabled = cardsCount < 1;
     els.studyBtn.innerHTML = cardsCount < 1
       ? `<span>${escapeHtml(t("app.study.noCards", { mode: sessionLabel }))}</span>`
       : study
         ? `<span class="stop-mark" aria-hidden="true"></span><span>${escapeHtml(t("app.hero.stopStudy"))}</span>`
         : `<span class="play-mark" aria-hidden="true"></span><span>${escapeHtml(t("app.hero.study"))}</span>`;
    }

    function studyModeButton(action, label, direction, tone = "") {
      const cleanLabel = String(label || "").replace(/^<-\s*/, "").replace(/\s*->$/, "");
      const leftIcon = direction === "left"
        ? '<span class="ui-icon ui-icon-arrow-left" aria-hidden="true"></span>'
        : "";
      const rightIcon = direction === "right"
        ? '<span class="ui-icon ui-icon-arrow-right" aria-hidden="true"></span>'
        : "";

      return `
        <button class="mini ${tone}" data-study-action="${escapeHtml(action)}" type="button">
          ${leftIcon}<span>${escapeHtml(cleanLabel)}</span>${rightIcon}
        </button>
      `;
    }

function renderStudy() {
  if (!study) {
    els.studyPanel.classList.remove("active");
    els.studyPanel.innerHTML = "";
    return;
  }

  const sessionMode = STUDY_SESSION_CARD_MODES[study.sessionMode] ? study.sessionMode : "learning";
  const cardMode = getStudyCardMode(sessionMode);
  const card = state.cards.find((item) => item.id === study.cardId);

  if (!card || card.mode !== cardMode) {
    pickStudyCard(study.cardId, { rememberCurrent: false, sessionMode });
    return;
  }

  els.studyPanel.classList.add("active");

  const showingSide = study.flipped
    ? (study.side === "front" ? "back" : "front")
    : study.side;

  const label = showingSide === "front"
    ? t("app.study.sideFront")
    : t("app.study.sideBack");

  const text = showingSide === "front" ? card.front : card.back;

  const notesHtml = showingSide === "back" && card.notes
    ? `<div class="study-notes">${multiline(card.notes)}</div>`
    : "";

  const modeControls = sessionMode === "reinforcement"
    ? `
      ${studyModeButton("dictionary", t("app.study.toDictionary"), "left", "blue")}
      ${studyModeButton("learning", t("app.study.toLearning"), "left")}
      ${studyModeButton("known", t("app.study.toKnown"), "right", "good")}
    `
    : `
      ${studyModeButton("dictionary", t("app.study.toDictionary"), "left", "blue")}
      ${studyModeButton("reinforcement", t("app.study.toReinforcement"), "right", "good")}
    `;

  const controls = `
    <label for="studyAnswer">${escapeHtml(t("app.study.answerLabel"))}</label>

    <textarea id="studyAnswer" class="answer-box" placeholder="${escapeHtml(t("app.study.answerPlaceholder"))}">${escapeHtml(study.answer)}</textarea>

    <div class="study-icon-row">
      <button class="ghost icon-btn study-nav-icon" data-study-action="previous" type="button" aria-label="${escapeHtml(t("app.study.previous"))}" title="${escapeHtml(t("app.study.previous"))}"><span class="ui-icon ui-icon-arrow-left" aria-hidden="true"></span></button>

      <button class="primary icon-btn study-nav-icon study-flip-icon" data-study-action="flip" type="button" aria-label="${escapeHtml(t("app.study.flip"))}" title="${escapeHtml(t("app.study.flip"))}"><span class="ui-icon ui-icon-flip" aria-hidden="true"></span></button>

      <button class="ghost icon-btn study-nav-icon" data-study-action="next" type="button" aria-label="${escapeHtml(t("app.study.next"))}" title="${escapeHtml(t("app.study.next"))}"><span class="ui-icon ui-icon-arrow-right" aria-hidden="true"></span></button>

      <button class="mini icon-btn study-nav-icon" data-study-action="edit" type="button" aria-label="${escapeHtml(t("app.list.editCard"))}" title="${escapeHtml(t("app.list.editCard"))}"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button>
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
        <div class="study-controls-head">
          <h2 class="study-title">${escapeHtml(t("app.study.modeTitle", { mode: getStudySessionLabel(sessionMode) }))}</h2>
          <p class="hint study-hint">${escapeHtml(t("app.study.hint"))}</p>
          <button class="ghost study-mini-link" data-study-action="mini-window" type="button">${escapeHtml(t("app.study.openMiniWindow"))}</button>
        </div>

        ${controls}
      </div>
    </div>
  `;
}

    function toggleTagSelection(type, tagId) {
      if (!tagSelections[type]) return;
      if (tagSelections[type].has(tagId)) tagSelections[type].delete(tagId);
      else tagSelections[type].add(tagId);
      renderTagCombobox(type);
    }

    function removeTagSelection(type, tagId) {
      if (!tagSelections[type]) return;
      tagSelections[type].delete(tagId);
      renderTagCombobox(type);
    }

    function createTagFromCombobox(type) {
      const ui = getTagCombobox(type);
      const name = ui.search.value.trim();
      if (!name) return;

      const [tagId] = ensureTags([name]);
      tagSelections[type].add(tagId);
      ui.search.value = "";
      saveState();
      renderAll();
      openTagDropdown(type);
    }

    function createCard(event) {
      event.preventDefault();

      const front = els.cardFront.value.trim();
      const back = els.cardBack.value.trim();
      if (!front || !back) {
        showToast(t("toast.fillBothSides"));
        return;
      }

      const tagIds = getSelectedTagIds("create");

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
      tagSelections.create.clear();
      renderAll();
      showToast(t("toast.cardCreatedDictionary"));
    }

    function openCardModal(cardId) {
      const card = state.cards.find((item) => item.id === cardId);
      if (!card) return;

      els.editCardId.value = card.id;
      els.editFront.value = card.front;
      els.editBack.value = card.back;
      els.editNotes.value = card.notes || "";
      els.editMode.value = card.mode;
      tagSelections.edit = new Set(card.tagIds || []);
      if (els.editTagSearch) els.editTagSearch.value = "";
      renderTagPickers();
      els.modalBackdrop.classList.add("active");
      els.editFront.focus();
    }

    function closeCardModal() {
      els.modalBackdrop.classList.remove("active");
      els.editCardForm.reset();
      els.editCardId.value = "";
      tagSelections.edit.clear();
      closeAllTagDropdowns();
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

      const tagIds = getSelectedTagIds("edit");

      card.front = els.editFront.value.trim();
      card.back = els.editBack.value.trim();
      card.notes = els.editNotes.value.trim();
      card.mode = newMode;
      card.tagIds = Array.from(new Set(tagIds));
      card.updatedAt = new Date().toISOString();

      if (!card.front || !card.back) {
        showToast(t("toast.fillBothSides"));
        return;
      }

      saveState();
      closeCardModal();
      renderAll();
      showToast(t("toast.cardUpdated"));
    }

    function deleteCards(ids) {
      const idList = Array.from(ids);
      if (!idList.length) {
        showToast(t("toast.selectCardsFirst"));
        return;
      }

      const confirmed = confirm(t("confirm.deleteCards", { count: idList.length }));
      if (!confirmed) return;

      state.cards = state.cards.filter((card) => !idList.includes(card.id));
      selectedIds = new Set(Array.from(selectedIds).filter((id) => !idList.includes(id)));

      if (study && idList.includes(study.cardId)) {
        study = null;
        studyHistory = [];
        resetStudyDeck();
      }

      saveState();
      renderAll();
      publishStudyState();
      showToast(t("toast.cardsDeleted"));
    }

    function moveCards(ids, mode) {
      if (!MODE_LABEL_KEYS[mode]) {
        showToast(t("toast.chooseValidMode"));
        return false;
      }

      const idList = Array.from(new Set(Array.from(ids).filter(isExistingCardId)));
      if (!idList.length) {
        showToast(t("toast.selectCardsFirst"));
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
        const cardMode = getStudyCardMode(sessionMode);

        if (!current || current.mode !== cardMode) {
          pickStudyCard(study.cardId, { rememberCurrent: false, sessionMode });
        }
      }

      saveState();
      renderAll();
      const message = changedCount
        ? t("toast.modeChanged", { mode: getModeLabel(mode), count: changedCount })
        : t("toast.modeUnchanged", { mode: getModeLabel(mode) });
      showToast(message);
      return true;
    }

    function renameTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const name = prompt(t("prompt.renameTag"), tag.name);
      if (name === null) return;

      const trimmed = name.trim();
      if (!trimmed) {
        showToast(t("toast.tagNameEmpty"));
        return;
      }

      const duplicate = state.tags.find((item) => item.id !== tagId && normalize(item.name) === normalize(trimmed));
      if (duplicate) {
        const confirmed = confirm(t("confirm.mergeTags"));
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
      showToast(t("toast.tagUpdated"));
    }

    function deleteTag(tagId) {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) return;

      const confirmed = confirm(t("confirm.deleteTag", { name: tag.name }));
      if (!confirmed) return;

      state.tags = state.tags.filter((item) => item.id !== tagId);
      for (const card of state.cards) {
        card.tagIds = (card.tagIds || []).filter((id) => id !== tagId);
      }

      saveState();
      renderAll();
      showToast(t("toast.tagDeleted"));
    }

    function addQuickTag() {
      const name = els.quickTagName.value.trim();
      if (!name) {
        showToast(t("toast.enterTagName"));
        return;
      }

      const existing = state.tags.find((tag) => normalize(tag.name) === normalize(name));
      if (existing) {
        showToast(t("toast.tagExists"));
        return;
      }

      state.tags.push({ id: uid("tag"), name });
      sortTags();
      els.quickTagName.value = "";
      saveState();
      renderAll();
      showToast(t("toast.tagCreated"));
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
      showToast(state.cards.length ? t("toast.csvExported") : t("toast.csvEmptyTemplate"));
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

    function normalizeCsvCardSide(value) {
      return String(value || "").trim();
    }

    function findImportedCardDuplicate(front, back) {
      return state.cards.find((card) => (
        normalizeCsvCardSide(card.front) === front
        && normalizeCsvCardSide(card.back) === back
      ));
    }

    function appendUniqueNotes(card, notes) {
      const importedNotes = String(notes || "").trim();
      if (!importedNotes) return false;

      const currentNotes = String(card.notes || "").trim();
      if (currentNotes.includes(importedNotes)) return false;

      card.notes = currentNotes ? `${currentNotes}\n${importedNotes}` : importedNotes;
      return true;
    }

    function mergeCardTagIds(card, tagIds) {
      const currentTagIds = Array.isArray(card.tagIds) ? card.tagIds : [];
      const mergedTagIds = Array.from(new Set([...currentTagIds, ...tagIds]));
      const changed = mergedTagIds.length !== currentTagIds.length
        || mergedTagIds.some((id, index) => id !== currentTagIds[index]);

      if (changed) {
        card.tagIds = mergedTagIds;
      }

      return changed;
    }

    function mergeImportedCardMetadata(card, importedCard) {
      let changed = false;

      if (appendUniqueNotes(card, importedCard.notes)) {
        changed = true;
      }

      if (mergeCardTagIds(card, importedCard.tagIds)) {
        changed = true;
      }

      const currentMode = card.mode || "dictionary";
      const desiredMode = getHigherMode(currentMode, importedCard.mode || "dictionary");
      const resolvedMode = resolveImportMode(desiredMode, card);
      const modeLimited = getModeRank(resolvedMode) < getModeRank(desiredMode);

      if (resolvedMode !== card.mode) {
        card.mode = resolvedMode;
        changed = true;
      }

      if (changed) {
        card.updatedAt = new Date().toISOString();
      }

      return { changed, modeLimited };
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
        showToast(t("toast.csvEmpty"));
        return;
      }

      const hasHeader = looksLikeCsvHeader(rows[0]);
      const indexes = hasHeader ? getCsvColumnIndexes(rows[0]) : { front: 0, back: 1, notes: 2, mode: 3, tags: 4 };
      const dataRows = hasHeader ? rows.slice(1) : rows;
      let imported = 0;
      let skipped = 0;
      let updatedDuplicates = 0;
      let unchangedDuplicates = 0;
      let limitedModeFallbacks = 0;

      for (const row of dataRows) {
        const front = normalizeCsvCardSide(row[indexes.front]);
        const back = normalizeCsvCardSide(row[indexes.back]);

        if (!front || !back) {
          skipped += 1;
          continue;
        }

        const requestedMode = mapCsvMode(row[indexes.mode] || "dictionary");
        const notes = String(row[indexes.notes] || "").trim();
        const tagIds = ensureTags(splitCsvTags(row[indexes.tags] || ""));
        const duplicate = findImportedCardDuplicate(front, back);

        if (duplicate) {
          const result = mergeImportedCardMetadata(duplicate, { notes, tagIds, mode: requestedMode });
          if (result.modeLimited) limitedModeFallbacks += 1;
          if (result.changed) updatedDuplicates += 1;
          else unchangedDuplicates += 1;
          continue;
        }

        const mode = resolveImportMode(requestedMode);
        if (getModeRank(mode) < getModeRank(requestedMode)) {
          limitedModeFallbacks += 1;
        }

        state.cards.push({
          id: uid("card"),
          front,
          back,
          notes,
          tagIds,
          mode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        imported += 1;
      }

      if (!imported && !updatedDuplicates && !unchangedDuplicates) {
        showToast(t("toast.noCsvCardsImported"));
        return;
      }

      if (imported || updatedDuplicates) {
        selectedIds.clear();
        saveState();
        renderAll();
      }

      let message = imported ? t("toast.csvImported", { count: imported }) : t("toast.csvNoNew");
      if (updatedDuplicates) message += ` ${t("toast.csvUpdatedDuplicates", { count: updatedDuplicates })}`;
      if (unchangedDuplicates) message += ` ${t("toast.csvUnchangedDuplicates", { count: unchangedDuplicates })}`;
      if (sourceEncoding) message += ` ${t("toast.csvEncoding", { encoding: sourceEncoding })}`;
      if (skipped) message += ` ${t("toast.csvSkipped", { count: skipped })}`;
      if (limitedModeFallbacks) {
        message += ` ${t("toast.csvLimitedMode", { count: limitedModeFallbacks })}`;
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
          showToast(t("toast.csvEncodingFailed"));
        }
      };
      reader.onerror = () => showToast(t("toast.csvReadFailed"));
      reader.readAsArrayBuffer(file);
    }

    function pickStudyCard(excludeId = null, options = {}) {
      const sessionMode = options.sessionMode || study?.sessionMode || getSelectedStudySessionMode();
      const cardMode = getStudyCardMode(sessionMode);
      const pool = state.cards.filter((card) => card.mode === cardMode);
      const sessionLabel = getStudySessionLabel(sessionMode);

      if (!pool.length) {
        study = null;
        studyHistory = [];
        resetStudyDeck();
        saveState();
        renderAll();
        publishStudyState();
        showToast(t("toast.studyModeEmpty", { mode: sessionLabel }));
        return;
      }

      const poolIds = pool.map((card) => card.id);
      const poolIdSet = new Set(poolIds);
      const cardsById = new Map(pool.map((card) => [card.id, card]));

      if (studyDeck.sessionMode !== sessionMode) {
        resetStudyDeck(sessionMode);
      }

      studyDeck.queueIds = studyDeck.queueIds.filter((id) => poolIdSet.has(id));

      if (!studyDeck.queueIds.length) {
        const cycleIds = buildStudyCycle(poolIds, studyDeck.lastCycleIds, excludeId);
        studyDeck.lastCycleIds = cycleIds.slice();
        studyDeck.queueIds = cycleIds.slice();
      } else {
        studyDeck.queueIds = avoidImmediateRepeat(studyDeck.queueIds, excludeId);
      }

      const cardId = studyDeck.queueIds.shift();
      const card = cardsById.get(cardId);

      if (!card) {
        pickStudyCard(excludeId, { ...options, sessionMode });
        return;
      }

      setStudyCard(card, { ...options, sessionMode });
    }

function getExtensionUrl(path) {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }

  return path;
}

function openStudyMiniWindow() {
  const sessionMode = study?.sessionMode || getSelectedStudySessionMode();
  const sideMode = els.studySideMode?.value || "random";
  const params = new URLSearchParams({
    session: sessionMode,
    side: sideMode
  });

  if (study?.cardId) {
    params.set("card", study.cardId);
  }

  const url = `${getExtensionUrl("study-mini.html")}?${params.toString()}`;

  if (typeof chrome !== "undefined" && chrome.windows?.create) {
    chrome.windows.create({
      url,
      type: "popup",
      width: 480,
      height: 720,
      focused: true
    });
    return;
  }

  window.open(url, "aprendoStudyMini", "width=480,height=720");
}

    function handleStudyAction(action) {
  if (!study) return;

  const sessionMode = STUDY_SESSION_CARD_MODES[study.sessionMode] ? study.sessionMode : getSelectedStudySessionMode();
  const cardMode = getStudyCardMode(sessionMode);
  const card = state.cards.find((item) => item.id === study.cardId);

  if (!card) return;

  const answerEl = $("#studyAnswer");
  if (answerEl) study.answer = answerEl.value;

  if (action === "flip") {
    study.flipped = !study.flipped;
    renderStudy();
    publishStudyState();
    return;
  }

  if (action === "mini-window") {
    publishStudyState();
    openStudyMiniWindow();
    return;
  }

  if (action === "next") {
    pickStudyCard(study.cardId, { sessionMode });
    return;
  }

  if (action === "previous") {
    while (studyHistory.length) {
      const previousId = studyHistory.pop();
      const previousCard = state.cards.find((item) => item.id === previousId && item.mode === cardMode);

      if (previousCard) {
        setStudyCard(previousCard, { rememberCurrent: false, sessionMode });
        return;
      }
    }

    showToast(t("toast.noPreviousCard"));
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

    showToast(t("toast.cardMoved", { mode: getModeLabel(action) }));
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
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function bindEvents() {
      els.createCardForm.addEventListener("submit", createCard);
      els.createCardForm.addEventListener("reset", () => {
        window.setTimeout(() => {
          tagSelections.create.clear();
          if (els.createTagSearch) els.createTagSearch.value = "";
          renderTagCombobox("create");
          renderCreateSideSuggestions();
        }, 0);
      });

      [els.cardFront, els.cardBack].forEach((input) => {
        input.addEventListener("input", renderCreateSideSuggestions);
        input.addEventListener("change", renderCreateSideSuggestions);
      });

      const bindTagComboboxEvents = (type) => {
        const ui = getTagCombobox(type);
        if (!ui.search) return;

        ui.search.addEventListener("input", () => renderTagCombobox(type));
        ui.search.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeTagDropdown(type);
            ui.button.focus();
          }

          if (event.key === "Enter" && !ui.createButton.hidden) {
            event.preventDefault();
            createTagFromCombobox(type);
          }
        });
      };

      bindTagComboboxEvents("create");
      bindTagComboboxEvents("edit");

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
        syncCustomSelect("studySideMode");
        saveStoredValue(STUDY_SIDE_MODE_KEY, els.studySideMode.value);
        publishStudyState();
      });

      els.studySessionMode.addEventListener("change", () => {
        syncCustomSelect("studySessionMode");
        study = null;
        studyHistory = [];
        resetStudyDeck();
        renderAll();
        publishStudyState();
      });

      els.studyBtn.addEventListener("click", () => {
        if (study) {
          study = null;
          studyHistory = [];
          resetStudyDeck();
          renderAll();
          publishStudyState();
          return;
        }

        const sessionMode = getSelectedStudySessionMode();

        studyHistory = [];
        resetStudyDeck(sessionMode);
        pickStudyCard(null, { rememberCurrent: false, sessionMode });
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
          showToast(t("toast.chooseModeForBulk"));
          return;
        }

        const ids = getSelectedCardIds();
        const changed = moveCards(ids, mode);
        if (changed) {
          els.bulkModeSelect.value = "";
        }
      }
      
      els.clearSelectionBtn.addEventListener("click", clearAllSelections);
      els.bulkModeSelect.addEventListener("change", () => {
        if (els.bulkModeSelect.value) applyBulkModeFromToolbar();
      });

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
        if (!event.target.closest(".tag-combobox")) {
          closeAllTagDropdowns();
        }

        if (!event.target.closest("[data-custom-select]")) {
          closeCustomSelects();
        }

        const customTrigger = event.target.closest(".custom-select-trigger");
        if (customTrigger) {
          const shell = customTrigger.closest("[data-custom-select]");
          const menu = shell?.querySelector(".custom-select-menu");
          if (menu) {
            const willOpen = menu.hidden;
            closeCustomSelects();
            menu.hidden = !willOpen;
            customTrigger.setAttribute("aria-expanded", String(willOpen));
          }
          return;
        }

        const customOption = event.target.closest("[data-custom-option]");
        if (customOption) {
          const select = document.getElementById(customOption.dataset.customOption);
          if (select) {
            select.value = customOption.dataset.value;
            syncCustomSelect(select.id);
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          closeCustomSelects();
          return;
        }

        const accentButton = event.target.closest("[data-char][data-target]");
        if (accentButton) {
          insertAtCursor(accentButton.dataset.target, accentButton.dataset.char);
          return;
        }

        const tagComboboxTrigger = event.target.closest("[data-tag-combobox-trigger]");
        if (tagComboboxTrigger) {
          toggleTagDropdown(tagComboboxTrigger.dataset.tagComboboxTrigger);
          return;
        }

        const tagOption = event.target.closest("[data-tag-option]");
        if (tagOption) {
          toggleTagSelection(tagOption.dataset.tagOption, tagOption.dataset.tagId);
          return;
        }

        const tagCreateButton = event.target.closest("[data-tag-create]");
        if (tagCreateButton) {
          createTagFromCombobox(tagCreateButton.dataset.tagCreate);
          return;
        }

        const tagRemoveButton = event.target.closest("[data-tag-remove]");
        if (tagRemoveButton) {
          removeTagSelection(tagRemoveButton.dataset.tagRemove, tagRemoveButton.dataset.tagId);
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
          publishStudyState();
        }
      });

      window.requestAnimationFrame(renderCreateSideSuggestions);
      window.setTimeout(renderCreateSideSuggestions, 250);
    }

    async function initApp() {
      if (window.AprendoI18n) {
        await window.AprendoI18n.init({ onChange: renderAll });
      }
      await loadStoredData();
      bindEvents();
      sortTags();
      await saveState();
      const appliedSharedStudy = applySharedStudyState(storedStudySnapshot, { force: true });
      if (!appliedSharedStudy) renderAll();
      bindExternalStorageSync();
    }

    initApp().catch((error) => {
      console.warn("Could not initialize app", error);
      renderAll();
      showToast(t("toast.appLoadFailed"));
    });
