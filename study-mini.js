(() => {
  const STORAGE_KEY = "aprendo-espanol-cards-v1";
  const STUDY_SYNC_KEY = "aprendo-palabras-study-state-v1";
  const MAX_LEARNING = 30;
  const MAX_REINFORCEMENT = 100;
  const STUDY_SYNC_SOURCE = `mini-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

  const MODE_LABEL_KEYS = {
    dictionary: "mode.dictionary",
    learning: "mode.learning",
    reinforcement: "mode.reinforcement",
    known: "mode.known"
  };

  const t = (key, params = {}) => (
    window.AprendoI18n ? window.AprendoI18n.t(key, params) : key
  );

  const $ = (selector) => document.querySelector(selector);
  const els = {
    card: $("#miniCard"),
    controls: $("#miniControls"),
    closeButton: $("#closeButton"),
    openAppButton: $("#openAppButton")
  };

  const params = new URLSearchParams(window.location.search);
  let sessionMode = STUDY_SESSION_CARD_MODES[params.get("session")] ? params.get("session") : "learning";
  let sideMode = ["front", "back", "random"].includes(params.get("side")) ? params.get("side") : "random";
  let state = { cards: [], tags: [] };
  let study = null;
  let history = [];
  let studyDeck = createEmptyStudyDeck(sessionMode);
  let syncingStudyState = false;
  let lastStudySyncUpdatedAt = 0;

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

  function normalizeStoredState(value) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (!parsed || typeof parsed !== "object") return { cards: [], tags: [] };
      return {
        cards: Array.isArray(parsed.cards) ? parsed.cards : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    } catch (error) {
      return { cards: [], tags: [] };
    }
  }

  function normalizeStudySnapshot(value) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (!parsed || typeof parsed !== "object") return null;
      const normalizedSessionMode = STUDY_SESSION_CARD_MODES[parsed.sessionMode] ? parsed.sessionMode : "learning";

      return {
        active: Boolean(parsed.active),
        source: String(parsed.source || ""),
        updatedAt: Number(parsed.updatedAt) || 0,
        sessionMode: normalizedSessionMode,
        sideMode: ["front", "back", "random"].includes(parsed.sideMode) ? parsed.sideMode : "random",
        cardId: String(parsed.cardId || ""),
        side: ["front", "back"].includes(parsed.side) ? parsed.side : "front",
        flipped: Boolean(parsed.flipped),
        answer: String(parsed.answer || ""),
        history: normalizeIdList(parsed.history),
        deck: normalizeStudyDeckSnapshot(parsed.deck, normalizedSessionMode)
      };
    } catch (error) {
      return null;
    }
  }

  function canUseExtensionStorage() {
    return typeof chrome !== "undefined" && chrome.storage?.local;
  }

  function chromeStorageGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (items) => resolve(items || {}));
    });
  }

  function chromeStorageSet(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }

  async function readAllStorage() {
    if (!canUseExtensionStorage()) {
      return {
        storedState: normalizeStoredState(localStorage.getItem(STORAGE_KEY)),
        storedStudy: normalizeStudySnapshot(localStorage.getItem(STUDY_SYNC_KEY))
      };
    }

    const items = await chromeStorageGet([STORAGE_KEY, STUDY_SYNC_KEY]);
    return {
      storedState: normalizeStoredState(items[STORAGE_KEY]),
      storedStudy: normalizeStudySnapshot(items[STUDY_SYNC_KEY])
    };
  }

  function saveCards() {
    if (!canUseExtensionStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return Promise.resolve();
    }

    return chromeStorageSet({ [STORAGE_KEY]: state });
  }

  function saveStudySnapshot(snapshot) {
    if (!canUseExtensionStorage()) {
      localStorage.setItem(STUDY_SYNC_KEY, JSON.stringify(snapshot));
      return Promise.resolve();
    }

    return chromeStorageSet({ [STUDY_SYNC_KEY]: snapshot });
  }

  function getStudyCardMode(currentSessionMode = sessionMode) {
    return STUDY_SESSION_CARD_MODES[currentSessionMode] || STUDY_SESSION_CARD_MODES.learning;
  }

  function getSessionLabel() {
    return t(STUDY_SESSION_LABEL_KEYS[sessionMode] || STUDY_SESSION_LABEL_KEYS.learning);
  }

  function getInitialSide() {
    if (sideMode === "front") return "front";
    if (sideMode === "back") return "back";
    return Math.random() < 0.5 ? "front" : "back";
  }

  function createEmptyStudyDeck(deckSessionMode = null) {
    return {
      sessionMode: deckSessionMode,
      queueIds: [],
      lastCycleIds: []
    };
  }

  function resetStudyDeck(deckSessionMode = null) {
    studyDeck = createEmptyStudyDeck(deckSessionMode);
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
    const normalizedSessionMode = deckSessionMode === fallbackSessionMode
      ? deckSessionMode
      : fallbackSessionMode || deckSessionMode;

    return {
      sessionMode: normalizedSessionMode,
      queueIds: uniqueIds(normalizeIdList(deck.queueIds)),
      lastCycleIds: uniqueIds(normalizeIdList(deck.lastCycleIds))
    };
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

  function primeStudyDeckAfterCurrent(currentId, deckSessionMode) {
    const poolIds = getPool(deckSessionMode).map((card) => card.id);

    if (!poolIds.includes(currentId)) {
      resetStudyDeck(deckSessionMode);
      return;
    }

    const remainingIds = shuffleIds(poolIds.filter((id) => id !== currentId));
    studyDeck = {
      sessionMode: deckSessionMode,
      queueIds: remainingIds,
      lastCycleIds: [currentId].concat(remainingIds)
    };
  }

  function getCurrentCard() {
    return study ? state.cards.find((card) => card.id === study.cardId) || null : null;
  }

  function getPool(currentSessionMode = sessionMode) {
    const cardMode = getStudyCardMode(currentSessionMode);
    return state.cards.filter((card) => card.mode === cardMode);
  }

  function createStudySnapshot() {
    return {
      active: Boolean(study),
      source: STUDY_SYNC_SOURCE,
      updatedAt: Date.now(),
      sessionMode,
      sideMode,
      cardId: study?.cardId || "",
      side: study?.side || "front",
      flipped: Boolean(study?.flipped),
      answer: study?.answer || "",
      history: history.slice(),
      deck: normalizeStudyDeckSnapshot(studyDeck, sessionMode)
    };
  }

  function publishStudyState() {
    if (syncingStudyState) return;
    const snapshot = createStudySnapshot();
    lastStudySyncUpdatedAt = snapshot.updatedAt;
    saveStudySnapshot(snapshot);
  }

  function applySharedStudyState(value, options = {}) {
    const snapshot = normalizeStudySnapshot(value);
    if (!snapshot) return false;
    if (!options.force && snapshot.source === STUDY_SYNC_SOURCE) return false;
    if (!options.force && snapshot.updatedAt <= lastStudySyncUpdatedAt) return false;

    lastStudySyncUpdatedAt = snapshot.updatedAt;
    syncingStudyState = true;
    sessionMode = snapshot.sessionMode;
    sideMode = snapshot.sideMode;

    if (!snapshot.active) {
      study = null;
      history = [];
      resetStudyDeck(snapshot.sessionMode);
      render();
      syncingStudyState = false;
      return true;
    }

    const card = state.cards.find((item) => item.id === snapshot.cardId && item.mode === getStudyCardMode(snapshot.sessionMode));
    if (!card) {
      study = null;
      history = [];
      resetStudyDeck(snapshot.sessionMode);
      render();
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
    history = snapshot.history.slice();
    studyDeck = snapshot.deck;
    if (!studyDeck.queueIds.length && !studyDeck.lastCycleIds.length) {
      primeStudyDeckAfterCurrent(card.id, snapshot.sessionMode);
    }
    render();
    syncingStudyState = false;
    return true;
  }

  function setStudyCard(card, rememberCurrent = true) {
    if (rememberCurrent && study?.cardId && study.cardId !== card.id) {
      history.push(study.cardId);
    }

    study = {
      sessionMode,
      cardId: card.id,
      side: getInitialSide(),
      flipped: false,
      answer: ""
    };
    render();
    publishStudyState();
  }

  function pickCard(excludeId = null, rememberCurrent = true) {
    const pool = getPool();
    if (!pool.length) {
      study = null;
      history = [];
      resetStudyDeck(sessionMode);
      render();
      publishStudyState();
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
    const next = cardsById.get(cardId);

    if (!next) {
      pickCard(excludeId, rememberCurrent);
      return;
    }

    setStudyCard(next, rememberCurrent);
  }

  function canMoveToMode(mode) {
    if (mode === "learning") {
      return state.cards.filter((card) => card.mode === "learning" && card.id !== study?.cardId).length < MAX_LEARNING;
    }

    if (mode === "reinforcement") {
      return state.cards.filter((card) => card.mode === "reinforcement" && card.id !== study?.cardId).length < MAX_REINFORCEMENT;
    }

    return true;
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
      <button class="mini ${tone}" data-action="${escapeHtml(action)}" type="button">
        ${leftIcon}<span>${escapeHtml(cleanLabel)}</span>${rightIcon}
      </button>
    `;
  }

  function modeControls() {
    if (sessionMode === "reinforcement") {
      return `
        ${studyModeButton("dictionary", t("app.study.toDictionary"), "left", "blue")}
        ${studyModeButton("learning", t("app.study.toLearning"), "left")}
        ${studyModeButton("known", t("app.study.toKnown"), "right", "good")}
      `;
    }

    return `
      ${studyModeButton("dictionary", t("app.study.toDictionary"), "left", "blue")}
      ${studyModeButton("reinforcement", t("app.study.toReinforcement"), "right", "good")}
    `;
  }

  function renderEmpty() {
    els.card.innerHTML = `
      <h2 class="empty-title">${escapeHtml(t("mini.emptyTitle"))}</h2>
      <p class="empty-text">${escapeHtml(t("mini.emptyText"))}</p>
    `;
    els.controls.innerHTML = `
      <div class="icon-row">
        <button class="primary" data-action="refresh" type="button">${escapeHtml(t("mini.refresh"))}</button>
      </div>
    `;
  }

  function render() {
    const pool = getPool();
    if (!pool.length || !study) {
      renderEmpty();
      return;
    }

    let card = getCurrentCard();
    if (!card || card.mode !== getStudyCardMode()) {
      card = pool[0];
      study.cardId = card.id;
    }

    const showingSide = study.flipped ? (study.side === "front" ? "back" : "front") : study.side;
    const label = showingSide === "front" ? t("app.study.sideFront") : t("app.study.sideBack");
    const text = showingSide === "front" ? card.front : card.back;
    const notesHtml = showingSide === "back" && card.notes
      ? `<div class="study-notes">${multiline(card.notes)}</div>`
      : "";

    els.card.innerHTML = `
      <p class="side-label">${escapeHtml(label)}</p>
      <p class="card-word">${multiline(text)}</p>
      ${notesHtml}
    `;

    els.controls.innerHTML = `
      <label class="answer-label" for="miniStudyAnswer">${escapeHtml(t("app.study.answerLabel"))}</label>
      <textarea id="miniStudyAnswer" class="answer-box" placeholder="${escapeHtml(t("app.study.answerPlaceholder"))}">${escapeHtml(study.answer)}</textarea>
      <div class="icon-row">
        <button class="ghost icon-button" data-action="previous" type="button" aria-label="${escapeHtml(t("app.study.previous"))}" title="${escapeHtml(t("app.study.previous"))}"><span class="ui-icon ui-icon-arrow-left" aria-hidden="true"></span></button>
        <button class="primary icon-button study-flip-icon" data-action="flip" type="button" aria-label="${escapeHtml(t("app.study.flip"))}" title="${escapeHtml(t("app.study.flip"))}"><span class="ui-icon ui-icon-flip" aria-hidden="true"></span></button>
        <button class="ghost icon-button" data-action="next" type="button" aria-label="${escapeHtml(t("app.study.next"))}" title="${escapeHtml(t("app.study.next"))}"><span class="ui-icon ui-icon-arrow-right" aria-hidden="true"></span></button>
      </div>
      <div class="mode-row">
        ${modeControls()}
      </div>
    `;
  }

  async function handleAction(action) {
    if (action === "refresh") {
      const stored = await readAllStorage();
      state = stored.storedState;
      if (!applySharedStudyState(stored.storedStudy, { force: true })) pickCard(null, false);
      return;
    }

    const card = getCurrentCard();
    if (!card) return;

    if (action === "flip") {
      study.flipped = !study.flipped;
      render();
      publishStudyState();
      return;
    }

    if (action === "next") {
      pickCard(card.id);
      return;
    }

    if (action === "previous") {
      while (history.length) {
        const previousId = history.pop();
        const previous = state.cards.find((item) => item.id === previousId && item.mode === getStudyCardMode());
        if (previous) {
          setStudyCard(previous, false);
          return;
        }
      }
      return;
    }

    if (["dictionary", "learning", "reinforcement", "known"].includes(action)) {
      if (!canMoveToMode(action)) return;
      card.mode = action;
      card.updatedAt = new Date().toISOString();
      await saveCards();
      pickCard(card.id, false);
    }
  }

  function openMainApp() {
    const url = typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("app.html")
      : "app.html";

    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }

    window.open(url, "_blank");
  }

  function bindStorageSync() {
    if (canUseExtensionStorage() && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;

        if (changes[STORAGE_KEY]) {
          state = normalizeStoredState(changes[STORAGE_KEY].newValue);
          render();
        }

        if (changes[STUDY_SYNC_KEY]) {
          applySharedStudyState(changes[STUDY_SYNC_KEY].newValue);
        }
      });
      return;
    }

    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        state = normalizeStoredState(event.newValue);
        render();
      }

      if (event.key === STUDY_SYNC_KEY) {
        applySharedStudyState(event.newValue);
      }
    });
  }

  async function init() {
    if (window.AprendoI18n) {
      await window.AprendoI18n.init({ onChange: render });
    }

    const stored = await readAllStorage();
    state = stored.storedState;

    if (!applySharedStudyState(stored.storedStudy, { force: true })) {
      const requestedCardId = params.get("card") || "";
      const requestedCard = state.cards.find((card) => card.id === requestedCardId && card.mode === getStudyCardMode());
      if (requestedCard) {
        primeStudyDeckAfterCurrent(requestedCard.id, sessionMode);
        setStudyCard(requestedCard, false);
      }
      else pickCard(null, false);
    }

    els.closeButton.addEventListener("click", () => window.close());
    els.openAppButton.addEventListener("click", openMainApp);
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (button) handleAction(button.dataset.action);
    });
    document.addEventListener("input", (event) => {
      if (event.target.id === "miniStudyAnswer" && study) {
        study.answer = event.target.value;
        publishStudyState();
      }
    });

    bindStorageSync();
  }

  init().catch(() => renderEmpty());
})();
