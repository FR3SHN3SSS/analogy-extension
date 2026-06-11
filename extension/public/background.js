chrome.runtime.onInstalled.addListener(() => {
    console.log("Analogy-O installed");
  });

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      console.log("Message received:", message);
  
      sendResponse({
        success: true
      });
  
      return true;
    }
  );