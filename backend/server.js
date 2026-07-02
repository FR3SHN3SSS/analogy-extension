const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");
const PROMPT_VERSION = "v3";
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const explanationCache = new Map();
const pendingRequests = new Map();

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});

app.use(cors());
app.use(express.json());


//Route Handlers
app.get("/health", (req,res) => {
  res.json({
    status: "Ok",
    message: "analogyO backend is running",
    timestamp: new Date().toISOString(),
  });
});


app.post("/explain", async (req,res) => {
  console.log("[AnalogyO] Request received:", req.body);
  const {text, domain} = req.body;

  //missing domain or text
  if (!text || !domain) {
    return res.status(400).json({
      error: "Missing Text or Domain",
    });
  }
  
  //if text is too long
  if (text.length > 2000) {
    return res.status(400).json({
      error: "Text exceeds maximum length of 2000 characters",
    });
  }

  //Explanation(from gemini api)
  try {
    const explanation = await getGeminiExplanation(text,domain);
    res.status(200).json({
      success: true,
      explanation: explanation,
      domain: domain,
    });
  
  } catch (error) {
    if (error.message === "Invalid domain") {           
      return res.status(400).json({                      
        error: "Domain contains invalid characters. Use letters, numbers, spaces, - or &.",  // ← new
      });                                                 
    }                                                     

    console.error("[Analogy-O] /explain route error:", error);
    res.status(500).json({
      error: "An internal error occurred. try again",
    });
  }
});


function buildPrompt(text, domain) {
  return `
  You are AnalogyO — a master at making complex ideas instantly click through sharp, creative analogies.

  CONCEPT TO EXPLAIN:
  "${text}"

  YOUR TASK:
  First, internally identify the most recognizable objects, terminology,
  goals, and strategies from the domain of "${domain}" — do not write this
  part out, just use it to inform the analogy below.

  Then explain the concept above using ONLY a ${domain} analogy, and connect
  that analogy back to the original concept so the reader sees exactly how
  they map onto each other.

  STRICT RULES:
  1. Write 3-5 sentences depending on how much the concept needs —
     simple concepts get 3 sentences, complex ones can use up to 5.
     Never pad with filler — every sentence must add insight.
  2. Do NOT name the original concept while building the analogy itself.
     The FINAL sentence only is allowed to name it, in order to explicitly
     tie the analogy back to the source text. Every sentence before that
     must stay entirely inside the ${domain} world.
  3. The first sentence sets up the analogy scene
  4. The second (and third, if used) sentence delivers the insight —
     still entirely within the ${domain} world, no naming yet
  5. The final sentence is the bridge: explicitly connect the analogy's
     mechanic back to what the original text is describing. This is the
     only sentence allowed to name the concept, and it should feel like
     the reveal, not a repeat of the analogy.
  6. No markdown, no bullets, no headers — plain text only
  7. Never open with "Imagine", "Think of", "Picture" or "Consider"
  8. Be specific — use real details from the ${domain} world
  9. Until the final sentence, the reader should understand the concept
     without it being named
  10. Do not reveal your internal reasoning about domain vocabulary —
      output only the analogy itself.

  GOOD EXAMPLE (Gaming domain, explaining recursion):
  "A save file that automatically loads another save file, which loads another, is every speedrunner's nightmare — an infinite loop with no escape. Without a checkpoint that says 'stop here, you've won,' the game just keeps calling itself forever, burning memory until it crashes. That's recursion without a base case: a function calling itself endlessly with nothing telling it when to stop."

  BAD EXAMPLE (too generic, names the concept too early, no distinct bridge):
  "Recursion is like a game level that keeps repeating. It's similar to when something in gaming happens over and over, which is recursion."

  Now write the analogy for the concept above using the ${domain} domain:
  `;
}

//Explanation from Google Gemini
async function getGeminiExplanation(text, domain) {
  const cleanDomain = sanitizeDomain(domain);
  if (!cleanDomain) {
    throw new Error("Invalid domain");
  }

  const cacheKey = buildCacheKey(text, cleanDomain);

  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[AnalogyO] Cache hit:", cacheKey);
    return cached;
  }

  if (pendingRequests.has(cacheKey)) {
    console.log("[AnalogyO] Joining request:", cacheKey);
    return pendingRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const prompt = buildPrompt(text, cleanDomain);
      const result = await model.generateContent(prompt);
      const explanation = result.response.text().trim();

      console.log("[AnalogyO] Gemini response:", explanation);
      setCache(cacheKey, explanation);
      return explanation;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

//make sure domain input is proper
function sanitizeDomain(rawDomain) {
  if (typeof rawDomain !== "string") return "";
  return rawDomain
    .trim()
    .replace(/[^a-zA-Z0-9 \-&]/g, "")
    .slice(0, 50); 
}

function buildCacheKey(text, domain) {
  const normalized = `${text.trim().toLowerCase()}::${domain.trim().toLowerCase()}::${PROMPT_VERSION}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}


function getFromCache(key) {
  const entry = explanationCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    explanationCache.delete(key);
    return null;
  }

  // Refresh recency: delete + re-set moves it to the "most recent" end of the Map
  explanationCache.delete(key);
  explanationCache.set(key, entry);
  return entry.value;
}

function setCache(key, value) {
  if (explanationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = explanationCache.keys().next().value; // Map preserves insertion order
    explanationCache.delete(oldestKey);
  }
  explanationCache.set(key, { value, timestamp: Date.now() });
}



app.listen(PORT, () => {
  console.log(`\n✅ AnalogyO backend is running`);
  console.log(`   http://localhost:${PORT}/health  ← verify server is alive`);
  console.log(`   POST http://localhost:${PORT}/explain  ← extension calls this\n`);
});








