console.log("Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
    console.log("Analogy-O installed");
  });

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.type === "TEXT_SELECTED") {
            console.log("Captured:", message.text);
        }
      sendResponse({
        success: true
      });
  
      return true;
    }
  );