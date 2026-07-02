const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    console.error("[Analogy-O] /explain route error:", error);
    res.status(500).json({
      error: "An internal error occurred. try again",
    });
  }
});

//Explanation from Google Gemini
async function getGeminiExplanation(text,domain) {
  const domainContexts = {
    UFC: "UFC fighting — octagon, fighters, training camps, weight cuts, fight strategy, submissions, knockouts, cornermen",
    Cooking: "cooking and the kitchen — ingredients, techniques, heat, timing, flavor, preparation, recipes",
    Soccer: "soccer — players, positions, tactics, the pitch, passing, scoring, defending, the manager",
    Gaming: "video games — mechanics, levels, resources, strategy, characters, upgrades, winning conditions",
    Movies: "filmmaking and cinema — directors, scenes, characters, plot, tension, storytelling, the audience",
  };

  const prompt = `
  You are AnalogyO — a master at making complex ideas instantly click through sharp, creative analogies.

  CONCEPT TO EXPLAIN:
  "${text}"

  YOUR TASK:
  Explain this concept using ONLY a ${domain} analogy.
  Domain context to draw from: ${domainContexts[domain] || domain}

  STRICT RULES:
  1. Write 2-4 sentences depending on how much the concept needs — 
     simple concepts get 2 sentences, complex ones can use up to 4.
     Never pad with filler — every sentence must add insight.
  2. Never mention the original concept by name — only the analogy
  3. The first sentence sets up the analogy scene
  4. The second sentence delivers the insight
  5. No markdown, no bullets, no headers — plain text only
  6. Never open with "Imagine", "Think of", "Picture" or "Consider"
  7. Be specific — use real details from the ${domain} world
  8. The reader should understand the concept without it being named

  GOOD EXAMPLE (Gaming domain, explaining recursion):
  "A save file that automatically loads another save file, which loads another, is every speedrunner's nightmare — an infinite loop with no escape. That's exactly how a function calling itself without a stopping condition traps your program forever."

  BAD EXAMPLE (too generic, names the concept):
  "Recursion is like a game level that keeps repeating. It's similar to when something in gaming happens over and over."

  Now write the analogy for the concept above using the ${domain} domain:
  `;

  const result = await model.generateContent(prompt);
  const explanation = result.response.text().trim();

  console.log("[AnalogyO] Gemini response:", explanation);
  return explanation;
}



app.listen(PORT, () => {
  console.log(`\n✅ AnalogyO backend is running`);
  console.log(`   http://localhost:${PORT}/health  ← verify server is alive`);
  console.log(`   POST http://localhost:${PORT}/explain  ← extension calls this\n`);
});








