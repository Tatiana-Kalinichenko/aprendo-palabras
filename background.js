const CREATE_CARD_MENU_ID = "aprendo-palabras-create-card";
const PENDING_SELECTION_KEY = "aprendo-palabras-pending-selection";
const UI_LANGUAGE_KEY = "aprendo-palabras-ui-lang";
const DEFAULT_LANGUAGE = "uk";

const UI_TEXT = {
  uk: {
    actionTitle: "Відкрити Aprendo Español",
    createCardMenu: "Створити картку — Aprendo Palabras"
  },
  en: {
    actionTitle: "Open Aprendo Español",
    createCardMenu: "Create card — Aprendo Palabras"
  }
};

function normalizeLanguage(lang) {
  return Object.prototype.hasOwnProperty.call(UI_TEXT, lang) ? lang : DEFAULT_LANGUAGE;
}

function getStoredLanguage(callback) {
  if (!chrome.storage?.local) {
    callback(DEFAULT_LANGUAGE);
    return;
  }

  chrome.storage.local.get([UI_LANGUAGE_KEY], (items) => {
    callback(normalizeLanguage(items?.[UI_LANGUAGE_KEY]));
  });
}

function updateActionTitle(lang) {
  if (chrome.action?.setTitle) {
    chrome.action.setTitle({ title: UI_TEXT[lang].actionTitle });
  }
}

function createSelectionContextMenu() {
  getStoredLanguage((lang) => {
    updateActionTitle(lang);

    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CREATE_CARD_MENU_ID,
        title: UI_TEXT[lang].createCardMenu,
        contexts: ["selection"]
      });
    });
  });
}

function openContextCardWindow() {
  const url = chrome.runtime.getURL("context-card.html");
  chrome.windows.create({
    url,
    type: "popup",
    width: 480,
    height: 720,
    focused: true
  });
}

chrome.runtime.onInstalled.addListener(createSelectionContextMenu);
chrome.runtime.onStartup.addListener(createSelectionContextMenu);

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === "local" && changes[UI_LANGUAGE_KEY]) {
    createSelectionContextMenu();
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== CREATE_CARD_MENU_ID) return;

  const selectionText = String(info.selectionText || "").trim();

  if (!chrome.storage?.session) {
    const url = `${chrome.runtime.getURL("context-card.html")}?text=${encodeURIComponent(selectionText)}`;
    chrome.windows.create({ url, type: "popup", width: 480, height: 720, focused: true });
    return;
  }

  chrome.storage.session.set({
    [PENDING_SELECTION_KEY]: {
      text: selectionText,
      createdAt: Date.now()
    }
  }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      const url = `${chrome.runtime.getURL("context-card.html")}?text=${encodeURIComponent(selectionText)}`;
      chrome.windows.create({ url, type: "popup", width: 480, height: 720, focused: true });
      return;
    }

    openContextCardWindow();
  });
});
