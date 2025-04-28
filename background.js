chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-stock",
    title: "Stock Analysis",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-stock") {
    chrome.tabs.sendMessage(tab.id, {
      action: "analyzeStock",
      stock: info.selectionText
    });
  }
});
