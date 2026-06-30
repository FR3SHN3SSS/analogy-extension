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
  const prompt = `
    You are an expert at explaining complex concepts using simple analogies.
    
    Explain the following text using a ${domain} analogy.
    
    Text to explain: "${text}"
    
    Rules:
    - Use a ${domain} analogy specifically
    - Keep the explanation to 2-3 sentences
    - Be concrete and vivid
    - Return plain text only, no bullet points or markdown
    - Do not start with "In ${domain}..." — be creative with the opening
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








