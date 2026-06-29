const SHADOW_STYLES = `
  :host { all: initial; font-family: 'Inter', system-ui, sans-serif; }
  
  /* Shared Overlay Style */
  .analogy-overlay {
    position: fixed; inset: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.6); display: flex;
    align-items: center; justify-content: center; z-index: 2147483647;
    animation: fadeIn 0.2s ease-out;
  }

  /* Card Base */
  .card {
    background: white; border-radius: 12px; padding: 24px;
    width: 360px; max-width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Typography */
  h3 { margin: 0 0 12px 0; font-size: 18px; color: #111827; }
  .preview-box { 
    background: #f3f4f6; padding: 10px; border-radius: 8px; 
    font-size: 13px; color: #4b5563; margin-bottom: 16px; font-style: italic;
  }

  /* Buttons */
  .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
  .btn {
    padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;
    background: white; cursor: pointer; transition: all 0.2s; font-size: 14px;
  }
  .btn:hover { background: #f9fafb; border-color: #6366f1; color: #6366f1; }
  .btn-primary { background: #6366f1; color: white; border: none; font-weight: 600; }
  .btn-primary:hover { background: #4f46e5; color: white; transform: translateY(-1px); }

  /* Floating Trigger */
  .floating-trigger {
    position: absolute; z-index: 2147483647; background: #1a1a1a;
    color: white; border: none; padding: 6px 14px; border-radius: 20px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: popIn 0.15s ease-out;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;



let shadowRoot = null;
let activeSelection = "";
const ANALOGY_DOMAINS = ["UFC", "Cooking", "Soccer", "Gaming", "Movies"];
const LAST_DOMAIN_KEY = "analogyO_lastDomain";

function getShadowRoot() {
  if (shadowRoot) return shadowRoot;
  
  const host = document.createElement("div");
  host.id = "analogy-o-root";
  document.body.appendChild(host);
  
  shadowRoot = host.attachShadow({ mode: "open" });
  const sheet = document.createElement("style");
  sheet.textContent = SHADOW_STYLES;
  shadowRoot.appendChild(sheet);
  
  return shadowRoot;
}


function cleanupUI() {
  const root = getShadowRoot();
  
  const existingOverlay = root.querySelector(".analogy-overlay");
  if (existingOverlay) existingOverlay.remove();
  
  const existingTrigger = root.querySelector(".floating-trigger");
  if (existingTrigger) existingTrigger.remove();
}




//Floating explain button
function showFloatingButton(rect, text) {
  cleanupUI();
  const root = getShadowRoot();
  const existing = root.querySelector(".floating-trigger");
  if (existing) existing.remove();

  const btn = document.createElement("button");
  btn.className = "floating-trigger";
  btn.textContent = "Explain";

  btn.onmousedown = (e) => e.stopPropagation();
  btn.onmouseup = (e) => e.stopPropagation();

  btn.style.left = `${rect.left + window.scrollX}px`;
  btn.style.top = `${rect.top + window.scrollY - 40}px`;

  btn.onclick = (e) => {
    e.stopPropagation();
    activeSelection = text;
    showDomainModal(text);
  };

  root.appendChild(btn);
}

//Domain selection modal
function showDomainModal(text) {
  cleanupUI();
  const root = getShadowRoot();
  const overlay = document.createElement("div");
  overlay.className = "analogy-overlay";

  chrome.storage.local.get([LAST_DOMAIN_KEY], (res) => {
    const lastDomain = res[LAST_DOMAIN_KEY];
    
    overlay.innerHTML = `
      <div class="card">
        <h3>Explain this using...</h3>
        <div class="preview-box">"${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"</div>
        <div class="btn-grid">
          ${ANALOGY_DOMAINS.map(d => `
            <button class="btn domain-btn ${d === lastDomain ? 'btn-primary' : ''}" data-domain="${d}">
              ${d}
            </button>
          `).join('')}
        </div>
        <button id="cancel-btn" class="btn" style="width:100%">Cancel</button>
      </div>
    `;


    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }};


    overlay.querySelectorAll(".domain-btn").forEach(btn => {
      btn.onclick = (e) => {
        const domain = btn.dataset.domain;
        chrome.storage.local.set({ [LAST_DOMAIN_KEY]: domain });
        overlay.remove();
        handleExplanationRequest(text, domain);
      };
    });

    overlay.querySelector("#cancel-btn").onclick = () => overlay.remove();
    
    root.appendChild(overlay);
  });
}

//Loading state modal
function showLoading() {
  cleanupUI();
  const root = getShadowRoot();
  const overlay = document.createElement("div");
  overlay.className = "analogy-overlay";
  overlay.id = "analogy-loading";
  overlay.innerHTML = `<div class="card" style="text-align:center;">Generating analogy...</div>`;
  root.appendChild(overlay);
}

//Error Modal
function showError(message) {
  cleanupUI();
  const root = getShadowRoot();
  const overlay = document.createElement("div");
  overlay.className = "analogy-overlay";

  overlay.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:32px; margin-bottom:12px;">⚠️</div>
      <h3 style="color:#dc2626;">Something went wrong</h3>
      <p style="color:#6b7280; font-size:14px; margin-bottom:20px;">${message}</p>
      <button id="error-close" class="btn btn-primary" style="width:100%">Close</button>
    </div>
  `;

  overlay.querySelector("#error-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => {if (e.target === overlay) overlay.remove(); };
  root.appendChild(overlay);
}

//Result modal
function showResult(text, domain, explanation) {
  cleanupUI();
  const root = getShadowRoot();
  const overlay = document.createElement("div");
  overlay.className = "analogy-overlay";

  overlay.innerHTML = `
    <div class="card" style="width: 450px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; font-weight:bold; color:#6366f1;">${domain.toUpperCase()} ANALOGY</span>
        <button id="close-x" style="background:none; border:none; cursor:pointer; font-size:20px;">&times;</button>
      </div>
      <div class="preview-box">"${text.slice(0, 80)}..."</div>
      <div style="line-height:1.6; color:#1f2937; margin-bottom:20px;">${explanation}</div>
      <div class="btn-grid">
        <button id="copy-btn" class="btn btn-primary">Copy Analogy</button>
        <button id="retry-btn" class="btn">Try Another</button>
      </div>
    </div>
  `;

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  overlay.querySelector("#copy-btn").onclick = (e) => {
    navigator.clipboard.writeText(explanation);
    e.target.textContent = "Copied! ✓";
    setTimeout(() => e.target.textContent = "Copy Analogy", 2000);
  };

  overlay.querySelector("#retry-btn").onclick = () => {
    overlay.remove();
    showDomainModal(text);
  };

  overlay.querySelector("#close-x").onclick = () => overlay.remove();
  root.appendChild(overlay);
}



//Logic

function handleExplanationRequest(text, domain) {
  showLoading();
  chrome.runtime.sendMessage({ type: "EXPLAIN_REQUEST", text, domain }, (resp) => {
    const root = getShadowRoot();
    root.querySelector("#analogy-loading")?.remove();
    if (resp?.explanation) {
      showResult(text, domain, resp.explanation);
    } else {
      showError(resp?.error || "Something went wrong, Please try again");
    }
  });
}

document.addEventListener("mouseup", (e) => {
  if (e.target.id === "analogy-o-root") {
    return;
  }
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    const root = getShadowRoot();
    const isModalOpen = root.querySelector(".analogy-overlay");

    if (isModalOpen) return;

    if (text.length > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      showFloatingButton(rect, text);
    } else {
      cleanupUI();
    }
  }, 20);
});

// Esc key close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cleanupUI();
});