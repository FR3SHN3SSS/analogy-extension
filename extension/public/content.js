let explainButton = null;

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
      chrome.runtime.sendMessage({
        type: "TEXT_SELECTED",
        text: selectedText
      });

      document.dispatchEvent(new CustomEvent("analogyO:explain", {
        detail: { text: selectedText }
      }));
    }

    hideButton();
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

document.addEventListener("analogyO:explain", (e) => {
  console.log("[Analogy-O] Explain triggered for:", e.detail.text);
});