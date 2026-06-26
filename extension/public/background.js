console.log("Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
    console.log("Analogy-O installed");
  });

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.type === "EXPLAIN_REQUEST") {

        fetch("http://localhost:3000/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message.text,
            domain: message.domain,
          }),
        })
          
          .then((response) => {
            return response.json();
          })
          
          .then((data) => {
            if (data.explanation) {
              const newEntry = {
                id: Date.now(),           
                text: message.text,
                domain: message.domain,
                explanation: data.explanation,
                timestamp: new Date().toLocaleString(),
              };
              saveToHistory(newEntry);

              sendResponse({ explanation: data.explanation });
            } else {
              
              sendResponse({ error: data.error || "No explanation returned" });
            }
          })
          .catch((error) => {
            console.error("[AnalogyO] fetch() to backend failed:", error);
            sendResponse({
              error: "Could not reach backend. Is the server running on port 3000?",
            });
          });
  

        return true;
      }
    
      
      //Retrieve history
      if (message.type === "GET_HISTORY") {
        chrome.storage.local.get(["analogyHistory"], (result) => {
          sendResponse({ history: result.analogyHistory || [] });
        });
        return true; 
      }
    
     
      //Delete history entry and show updated list
      if (message.type === "DELETE_HISTORY_ITEM") {
        deleteFromHistory(message.id, (updatedHistory) => {
          sendResponse({ history: updatedHistory });
        });
        return true; 
      }
    
      return true;
});




function saveToHistory(entry) {
  chrome.storage.local.get(["analogyHistory"], (result) => {
    const history = result.analogyHistory || [];
    history.unshift(entry);
    const capped = history.slice(0,20);
    chrome.storage.local.get({ analogyHistory: capped });
  });
}



