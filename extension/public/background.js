console.log("Background service worker loaded");

const LAST_DOMAIN_KEY = "lastDomain";   
const DOMAIN_STATS_KEY = "domainStats";
const MAX_STORED_DOMAINS = 20;

chrome.runtime.onInstalled.addListener(() => {
    console.log("Analogy-O installed");

    chrome.storage.local.get([LAST_DOMAIN_KEY, DOMAIN_STATS_KEY], (result) => {
      if (result[LAST_DOMAIN_KEY] && !result[DOMAIN_STATS_KEY]) {
        const key = normalizeDomainKey(result[LAST_DOMAIN_KEY]);
        chrome.storage.local.set({
          [DOMAIN_STATS_KEY]: {
            [key]: { display: result[LAST_DOMAIN_KEY], count: 1, lastUsed: Date.now() },
          },
        });
      }
    });
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
              upsertDomainStats(message.domain)

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

function normalizeDomainKey(domain) {
  return domain.trim().toLowerCase();
}

function upsertDomainStats(domain) {
  const key = normalizeDomainKey(domain);
  if (!key) return;

  chrome.storage.local.get([DOMAIN_STATS_KEY], (result) => {
    const stats = result[DOMAIN_STATS_KEY] || {};

    stats[key] = {
      display: domain.trim(),
      count: (stats[key]?.count || 0) + 1,
      lastUsed: Date.now(),
    };

    const keys = Object.keys(stats);
    if (keys.length > MAX_STORED_DOMAINS) {
      const lru = keys.sort((a, b) => stats[a].lastUsed - stats[b].lastUsed)[0];
      delete stats[lru];
    }

    chrome.storage.local.set({ [DOMAIN_STATS_KEY]: stats });
  });
}


function saveToHistory(entry) {
  chrome.storage.local.get(["analogyHistory"], (result) => {
    const history = result.analogyHistory || [];
    history.unshift(entry);
    const capped = history.slice(0,20);
    chrome.storage.local.set({ analogyHistory: capped });
  });
}


function deleteFromHistory(id, callback) {
  chrome.storage.local.get(["analogyHistory"], (result) => {
    const history = result.analogyHistory || [];
    const filtered = history.filter((item) => item.id !== id);
    chrome.storage.local.set({ analogyHistory: filtered }, () => {
      callback(filtered);
    });
  });
}



