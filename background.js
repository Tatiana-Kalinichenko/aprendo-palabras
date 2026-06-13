const CREATE_CARD_MENU_ID = "aprendo-palabras-create-card";
const PENDING_SELECTION_KEY = "aprendo-palabras-pending-selection";

function createSelectionContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CREATE_CARD_MENU_ID,
      title: "Створити картку — Aprendo Palabras",
      contexts: ["selection"]
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
