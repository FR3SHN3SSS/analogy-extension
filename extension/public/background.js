console.log("Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
    console.log("Analogy-O installed");
  });

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.type === "EXPLAIN_REQUEST") {
          const explanation = getMockExplanation(
            message.text,
            message.domain
          );

          sendResponse({
            explanation,
          });
        }
  
        return true;
    }
  );



  function getMockExplanation(text,domain) {
    const textPreview = text.slice(0,80);
    const explanations = {
      UFC: `Imagine a fighter studying film before a championship bout. "${textPreview}..." is like analyzing your opponent's tendencies so you know exactly when to strike.`,
  
      Cooking: `Think of "${textPreview}..." like reducing a sauce. You remove unnecessary ingredients until only the most important flavors remain.`,
  
      Soccer: `Imagine a midfielder scanning the field. "${textPreview}..." is similar to identifying the best passing lane before making the perfect assist.`,
  
      Gaming: `Think of "${textPreview}..." like unlocking a skill tree. Early decisions create stronger opportunities later in the game.`,
  
      Movies: `Picture a movie's three-act structure. "${textPreview}..." is part of a larger story where every scene contributes to the final payoff.`,
    };

    return (
      explanations[domain] || `Here is an analogy for "${textPreview}..."`
    );
  }