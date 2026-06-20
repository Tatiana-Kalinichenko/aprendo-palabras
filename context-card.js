const STORAGE_KEY = "aprendo-espanol-cards-v1";
const PENDING_SELECTION_KEY = "aprendo-palabras-pending-selection";
const MAX_RECOMMENDED_SIDE_LENGTH = 500;

let state = { cards: [], tags: [] };
let selectedTagIds = new Set();
let createdTagIds = new Set();
let lastFocusedSide = null;

const $ = (selector) => document.querySelector(selector);

const t = (key, params = {}) => (
  window.AprendoI18n ? window.AprendoI18n.t(key, params) : key
);

const els = {
  form: $("#cardForm"),
  closeBtn: $("#closeBtn"),
  front: $("#cardFront"),
  back: $("#cardBack"),
  frontSuggestions: $("#cardFrontSuggestions"),
  backSuggestions: $("#cardBackSuggestions"),
  notes: $("#cardNotes"),
  swapSides: $("#swapSides"),
  tagDropdownButton: $("#tagDropdownButton"),
  tagDropdownLabel: $("#tagDropdownLabel"),
  tagDropdown: $("#tagDropdown"),
  tagSearch: $("#tagSearch"),
  tagOptions: $("#tagOptions"),
  createTagButton: $("#createTagButton"),
  selectedTags: $("#selectedTags"),
  lengthWarning: $("#lengthWarning"),
  formMessage: $("#formMessage"),
  createCardBtn: $("#createCardBtn")
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

function chromeSessionGet(key) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.session) {
      resolve(null);
      return;
    }

    chrome.storage.session.get(key, (items) => {
      resolve(items ? items[key] : null);
    });
  });
}

function chromeSessionRemove(key) {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    chrome.storage.session.remove(key);
  }
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

async function loadState() {
  if (!canUseExtensionStorage()) {
    state = normalizeStoredState(readLocalStorageValue(STORAGE_KEY));
    return;
  }

  const stored = await chromeStorageGet([STORAGE_KEY]);
  state = normalizeStoredState(stored[STORAGE_KEY]);
}

function saveState() {
  const payload = {
    cards: state.cards,
    tags: state.tags
  };

  if (canUseExtensionStorage()) {
    return chromeStorageSet({ [STORAGE_KEY]: payload });
  }

  writeLocalStorageValue(STORAGE_KEY, JSON.stringify(payload));
  return Promise.resolve();
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
    els.frontSuggestions,
    getSideSuggestionMatches("front", els.front.value)
  );
  renderSideSuggestionList(
    els.backSuggestions,
    getSideSuggestionMatches("back", els.back.value)
  );
}

function sortTags() {
  state.tags.sort((a, b) => a.name.localeCompare(b.name, "uk", { sensitivity: "base" }));
}

function getTagById(id) {
  return state.tags.find((tag) => tag.id === id);
}

function getSelectedTags() {
  return Array.from(selectedTagIds)
    .map(getTagById)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "uk", { sensitivity: "base" }));
}

function tagIsUsed(tagId) {
  return state.cards.some((card) => (card.tagIds || []).includes(tagId));
}

function ensureTag(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const existing = state.tags.find((tag) => normalize(tag.name) === normalize(trimmed));
  if (existing) return existing;

  const tag = { id: uid("tag"), name: trimmed };
  state.tags.push(tag);
  createdTagIds.add(tag.id);
  sortTags();
  return tag;
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function getPreferredSide(text) {
  const cyrillicCount = countMatches(text, /[А-Яа-яЄєІіЇїҐґ]/g);
  const latinCount = countMatches(text, /[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/g);
  return latinCount > cyrillicCount ? "back" : "front";
}

function setInitialSelectionText(text) {
  const selectedText = String(text || "").trim();
  if (!selectedText) return;

  if (getPreferredSide(selectedText) === "back") {
    els.back.value = selectedText;
    lastFocusedSide = els.front;
    els.front.focus();
  } else {
    els.front.value = selectedText;
    lastFocusedSide = els.back;
    els.back.focus();
  }

  updateLengthWarning();
  renderCreateSideSuggestions();
}

async function readPendingSelectionText() {
  const pendingSelection = await chromeSessionGet(PENDING_SELECTION_KEY);
  chromeSessionRemove(PENDING_SELECTION_KEY);

  if (pendingSelection && typeof pendingSelection.text === "string") {
    return pendingSelection.text;
  }

  return new URLSearchParams(window.location.search).get("text") || "";
}

function setMessage(message, type = "") {
  els.formMessage.textContent = message;
  els.formMessage.classList.toggle("is-error", type === "error");
  els.formMessage.classList.toggle("is-success", type === "success");
}

function updateLengthWarning() {
  const tooLong = [els.front.value, els.back.value]
    .some((value) => String(value || "").trim().length > MAX_RECOMMENDED_SIDE_LENGTH);

  if (!tooLong) {
    els.lengthWarning.hidden = true;
    els.lengthWarning.textContent = "";
    return;
  }

  els.lengthWarning.hidden = false;
  els.lengthWarning.textContent = t("context.longText");
}

function closeTagDropdown() {
  els.tagDropdown.hidden = true;
  els.tagDropdownButton.setAttribute("aria-expanded", "false");
}

function openTagDropdown() {
  els.tagDropdown.hidden = false;
  els.tagDropdownButton.setAttribute("aria-expanded", "true");
  els.tagSearch.focus();
  renderTagDropdown();
}

function toggleTagDropdown() {
  if (els.tagDropdown.hidden) openTagDropdown();
  else closeTagDropdown();
}

function renderSelectedTags() {
  const tags = getSelectedTags();

  els.selectedTags.innerHTML = tags.map((tag) => `
      <span class="selected-tag">
        <span>${escapeHtml(tag.name)}</span>
      <button type="button" data-remove-tag="${escapeHtml(tag.id)}" aria-label="${escapeHtml(t("context.removeTag", { name: tag.name }))}">×</button>
    </span>
  `).join("");

  els.tagDropdownLabel.innerHTML = tags.length
    ? `<strong>${tags.length}</strong> ${escapeHtml(t("context.selectedTags", { count: tags.length })).replace(String(tags.length), "").trim()}`
    : t("context.tagPlaceholder");
}

function renderTagDropdown() {
  const query = normalize(els.tagSearch.value);
  const filteredTags = state.tags
    .filter((tag) => !query || normalize(tag.name).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "uk", { sensitivity: "base" }));

  if (!filteredTags.length) {
    els.tagOptions.innerHTML = `<div class="empty-tags">${escapeHtml(t("context.emptyTags"))}</div>`;
  } else {
    els.tagOptions.innerHTML = filteredTags.map((tag) => {
      const selected = selectedTagIds.has(tag.id);
      return `
        <button class="tag-option ${selected ? "is-selected" : ""}" type="button" data-tag-id="${escapeHtml(tag.id)}" role="option" aria-selected="${selected ? "true" : "false"}">
          <span class="checkmark">${selected ? "✓" : ""}</span>
          <span>${escapeHtml(tag.name)}</span>
        </button>
      `;
    }).join("");
  }

  const rawName = els.tagSearch.value.trim();
  const canCreate = rawName && !state.tags.some((tag) => normalize(tag.name) === normalize(rawName));
  els.createTagButton.hidden = !canCreate;
  els.createTagButton.textContent = canCreate ? t("context.createTag", { name: rawName }) : "";
}

function toggleTag(tagId) {
  if (selectedTagIds.has(tagId)) selectedTagIds.delete(tagId);
  else selectedTagIds.add(tagId);

  renderSelectedTags();
  renderTagDropdown();
}

function createTagFromSearch() {
  const tag = ensureTag(els.tagSearch.value);
  if (!tag) return;

  selectedTagIds.add(tag.id);
  els.tagSearch.value = "";
  renderSelectedTags();
  renderTagDropdown();
}

function getValidationMessage(front, back) {
  if (!front && !back) return t("context.validationBoth");
  if (!front) return t("context.validationFront");
  if (!back) return t("context.validationBack");
  return "";
}

function pruneUnusedCreatedTags() {
  const selectedIds = new Set(selectedTagIds);
  state.tags = state.tags.filter((tag) => (
    !createdTagIds.has(tag.id) || selectedIds.has(tag.id) || tagIsUsed(tag.id)
  ));
}

async function createCard(event) {
  event.preventDefault();

  const front = els.front.value.trim();
  const back = els.back.value.trim();
  const validationMessage = getValidationMessage(front, back);

  if (validationMessage) {
    setMessage(validationMessage, "error");
    return;
  }

  pruneUnusedCreatedTags();

  const now = new Date().toISOString();
  state.cards.push({
    id: uid("card"),
    front,
    back,
    notes: els.notes.value.trim(),
    tagIds: Array.from(new Set(selectedTagIds)).filter((id) => state.tags.some((tag) => tag.id === id)),
    mode: "dictionary",
    createdAt: now,
    updatedAt: now
  });

  try {
    sortTags();
    els.createCardBtn.disabled = true;
    await saveState();
    setMessage(t("context.created"), "success");
    window.setTimeout(() => window.close(), 900);
  } catch (error) {
    console.warn("Could not save context card", error);
    els.createCardBtn.disabled = false;
    setMessage(t("context.saveFailed"), "error");
  }
}

function swapSides() {
  const front = els.front.value;
  els.front.value = els.back.value;
  els.back.value = front;
  updateLengthWarning();
  renderCreateSideSuggestions();
}

function insertAtCursor(input, char) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${char}${input.value.slice(end)}`;
  input.focus();
  input.setSelectionRange(start + char.length, start + char.length);
  updateLengthWarning();
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function bindEvents() {
  if (els.closeBtn) {
    els.closeBtn.addEventListener("click", () => window.close());
  }
  els.form.addEventListener("submit", createCard);
  els.swapSides.addEventListener("click", swapSides);

  [els.front, els.back].forEach((input) => {
    input.addEventListener("focus", () => {
      lastFocusedSide = input;
    });
    input.addEventListener("input", () => {
      updateLengthWarning();
      renderCreateSideSuggestions();
      setMessage("");
    });
    input.addEventListener("change", renderCreateSideSuggestions);
  });

  els.notes.addEventListener("input", () => setMessage(""));
  els.tagDropdownButton.addEventListener("click", toggleTagDropdown);
  els.tagSearch.addEventListener("input", renderTagDropdown);
  els.createTagButton.addEventListener("click", createTagFromSearch);

  els.tagSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !els.createTagButton.hidden) {
      event.preventDefault();
      createTagFromSearch();
    }
  });

  els.tagOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-tag-id]");
    if (option) toggleTag(option.dataset.tagId);
  });

  els.selectedTags.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-tag]");
    if (!removeButton) return;

    selectedTagIds.delete(removeButton.dataset.removeTag);
    renderSelectedTags();
    renderTagDropdown();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".tag-combobox")) {
      closeTagDropdown();
    }

    const accentButton = event.target.closest("[data-char]");
    if (accentButton) {
      insertAtCursor(lastFocusedSide || els.back, accentButton.dataset.char);
    }
  });
}

async function init() {
  if (window.AprendoI18n) {
    await window.AprendoI18n.init({
      onChange: () => {
        renderSelectedTags();
        renderTagDropdown();
        updateLengthWarning();
      }
    });
  }
  await loadState();
  sortTags();
  renderSelectedTags();
  renderTagDropdown();
  bindEvents();
  setInitialSelectionText(await readPendingSelectionText());
  window.requestAnimationFrame(renderCreateSideSuggestions);
  window.setTimeout(renderCreateSideSuggestions, 250);
}

init().catch((error) => {
  console.warn("Could not initialize context card popup", error);
  setMessage(t("context.loadFailed"), "error");
});
