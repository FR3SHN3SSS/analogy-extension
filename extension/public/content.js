let explainButton = null;
let modalOverlay = null;
let loadingOverlay = null;
let resultOverlay = null;

// Test options for Modal
const ANALOGY_DOMAINS = ["UFC", "Cooking", "Soccer", "Gaming", "Movies"];
const LAST_DOMAIN_KEY = "analogyO_lastDomain";

//button creation
function createButton() {
  const btn = document.createElement("button");
  btn.textContent = "Explain";
  btn.id = "analogyO-explain-btn";

  btn.style.position = "fixed";
  btn.style.zIndex = "2147483647";
  btn.style.padding = "6px 12px";
  btn.style.background = "#1a1a1a";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.fontSize = "13px";
  btn.style.fontFamily = "sans-serif";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
  btn.style.display = "none";

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  btn.addEventListener("click", () => {
    const selectedText = window.getSelection().toString().trim();

    if (selectedText.length > 0) {
      console.log("dispatching analogyO:explain");
      document.dispatchEvent(new CustomEvent("analogyO:explain", {
        detail: { text: selectedText }
      }));
    }

    hideButton();
    window.getSelection().removeAllRanges();
  });

  document.body.appendChild(btn);
  return btn;
}

//Position and display settings
function showButton(rect) {
  if (!explainButton) {
    explainButton = createButton();
  }

  explainButton.style.top = `${rect.top - 36}px`;
  explainButton.style.left = `${rect.left}px`;
  explainButton.style.display = "block";
}

function hideButton() {
  if (explainButton) {
    explainButton.style.display = "none";
  }
}

//button display on text selection
document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
  
      if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showButton(rect);
      } else {
        hideButton();
      }
    }, 15);
  });

function createModal(selectedText) {
    // overlay behind modal
    const overlay = document.createElement("div");
    overlay.id = "analogyO-modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.4)";
    overlay.style.zIndex = "2147483647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontFamily = "sans-serif";
  
    // modal box
    const modal = document.createElement("div");
    modal.id = "analogyO-modal";
    modal.style.background = "#fff";
    modal.style.borderRadius = "10px";
    modal.style.padding = "20px";
    modal.style.width = "320px";
    modal.style.maxWidth = "90%";
    modal.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    modal.style.color = "#1a1a1a";
  
    // selected text preview
    const preview = document.createElement("div");
    preview.textContent = selectedText.length > 120
      ? selectedText.slice(0, 120) + "…"
      : selectedText;
    preview.style.fontSize = "13px";
    preview.style.color = "#555";
    preview.style.background = "#f4f4f4";
    preview.style.borderRadius = "6px";
    preview.style.padding = "8px";
    preview.style.marginBottom = "12px";
    preview.style.maxHeight = "80px";
    preview.style.overflowY = "auto";
  
    // title text
    const title = document.createElement("div");
    title.textContent = "Explain this using an analogy from:";
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";
    title.style.marginBottom = "10px";
  
    // domain button grid
    const domainContainer = document.createElement("div");
    domainContainer.style.display = "grid";
    domainContainer.style.gridTemplateColumns = "1fr 1fr";
    domainContainer.style.gap = "8px";
    domainContainer.style.marginBottom = "12px";
  
    // save and load last used domain to highlight it
    chrome.storage.local.get([LAST_DOMAIN_KEY], (result) => {
      const lastDomain = result[LAST_DOMAIN_KEY];
  
      ANALOGY_DOMAINS.forEach((domain) => {
        const domainBtn = document.createElement("button");
        domainBtn.textContent = domain;
        domainBtn.style.padding = "8px";
        domainBtn.style.border = domain === lastDomain
          ? "2px solid #1a1a1a"
          : "1px solid #ccc";
        domainBtn.style.borderRadius = "6px";
        domainBtn.style.background = "#fafafa";
        domainBtn.style.cursor = "pointer";
        domainBtn.style.fontSize = "13px";


        //hover effects
        domainBtn.addEventListener("mouseenter", () => {
          domainBtn.style.background = "#eee";
        });
        domainBtn.addEventListener("mouseleave", () => {
          domainBtn.style.background = "#fafafa";
        });
  
        domainBtn.addEventListener("click", () => {
          chrome.storage.local.set({ [LAST_DOMAIN_KEY]: domain });

          closeModal();

          showLoading();
  
          //updated background.js payload
          chrome.runtime.sendMessage(
          {
            type: "EXPLAIN_REQUEST",
            text: selectedText,
            domain: domain
          },

          (response) => {
            hideLoading();

            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              return;
            }

            if (response?.explanation) {
              showResult (
                selectedText,
                domain,
                response.explanation
              );
            }
          }
        );
      });
  
        domainContainer.appendChild(domainBtn);
      });
    });
  
    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.width = "100%";
    cancelBtn.style.padding = "8px";
    cancelBtn.style.border = "none";
    cancelBtn.style.borderRadius = "6px";
    cancelBtn.style.background = "#eee";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.style.fontSize = "13px";
    cancelBtn.addEventListener("click", closeModal);
  
    modal.appendChild(title);
    modal.appendChild(preview);
    modal.appendChild(domainContainer);
    modal.appendChild(cancelBtn);
    overlay.appendChild(modal);
  
    // click outside modal triggers closing
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  
    document.body.appendChild(overlay);
    return overlay;
  }
  
  function showModal(selectedText) {
    if (modalOverlay) {
      closeModal();
    }
    modalOverlay = createModal(selectedText);
  
    // esc key close
    document.addEventListener("keydown", handleEscape);
  }
  
  function closeModal() {
    if (modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
    }
    document.removeEventListener("keydown", handleEscape);
  }

  function showLoading() {
    hideLoading();

    const overlay = document.createElement("div");
    overlay.id = "analogyo-loading-overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.3)",
      zIndex: "2147483647",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });

    const box = document.createElement("div");

    Object.assign(box.style, {
      background: "#ffffff",
      padding: "18px 28px",
      borderRadius: "10px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      fontFamily: "sans-serif",
      fontWeight: "600",
    });

    box.textContent = "Generating analogy....";

    overlay.appendChild(box);

    document.body.appendChild(overlay);

    loadingOverlay = overlay;
  }

  function hideLoading() {
    if (!loadingOverlay) return;

    loadingOverlay.remove();
    loadingOverlay = null;
  }
  
  function handleEscape(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }

  function showResult(text, domain, explanation) {
    closeResult();
  
    resultOverlay = createResultPanel(
      text,
      domain,
      explanation
    );
  }

  function closeResult() {
    if (!resultOverlay) return;
  
    resultOverlay.remove();
    resultOverlay = null;
  
    document.removeEventListener(
      "keydown",
      handleResultEscape
    );
  }

  function handleResultEscape(event) {
    if (event.key === "Escape") {
      closeResult();
    }
  }

  function createResultPanel(
    selectedText,
    domain,
    explanation
  ) {
    const overlay = document.createElement("div");
  
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.45)",
      zIndex: "2147483647",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  
    const panel = document.createElement("div");
  
    Object.assign(panel.style, {
      background: "#fff",
      width: "400px",
      maxWidth: "90%",
      borderRadius: "12px",
      padding: "24px",
      fontFamily: "sans-serif",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    });
  
    const badge = document.createElement("div");
  
    badge.textContent = `${domain} Analogy`;
  
    Object.assign(badge.style, {
      display: "inline-block",
      background: "#111",
      color: "#fff",
      padding: "4px 10px",
      borderRadius: "6px",
      marginBottom: "16px",
      fontSize: "12px",
    });
  
    const preview = document.createElement("p");
  
    preview.textContent =
      selectedText.length > 100
        ? `${selectedText.slice(0, 100)}...`
        : selectedText;
  
    Object.assign(preview.style, {
      background: "#f5f5f5",
      padding: "10px",
      borderRadius: "8px",
      color: "#666",
      fontSize: "13px",
      lineHeight: "1.5",
    });
  
    const explanationElement =
      document.createElement("p");
  
    explanationElement.textContent = explanation;
  
    Object.assign(explanationElement.style, {
      marginTop: "20px",
      lineHeight: "1.7",
      fontSize: "15px",
    });
  
    const buttonContainer =
      document.createElement("div");
  
    Object.assign(buttonContainer.style, {
      display: "flex",
      gap: "10px",
      marginTop: "24px",
    });
  
    const retryButton =
      document.createElement("button");
  
    retryButton.textContent =
      "Try Another Domain";
  
    retryButton.style.flex = "1";
  
    retryButton.addEventListener("click", () => {
      closeResult();
      showModal(selectedText);
    });
  
    const closeButton =
      document.createElement("button");
  
    closeButton.textContent = "Close";
  
    closeButton.style.flex = "1";
  
    closeButton.addEventListener(
      "click",
      closeResult
    );
  
    buttonContainer.append(
      retryButton,
      closeButton
    );
  
    panel.append(
      badge,
      preview,
      explanationElement,
      buttonContainer
    );
  
    overlay.appendChild(panel);
  
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) {
        closeResult();
      }
    });
  
    document.addEventListener(
      "keydown",
      handleResultEscape
    );
  
    document.body.appendChild(overlay);
  
    return overlay;
  }
  

  document.addEventListener("analogyO:explain", (e) => {
  showModal(e.detail.text);
});