const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

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


app.post("/explain", (req,res) => {
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

  //Explanation(still returning mock data)
  try {
    const explanation = getMockExplanation(text,domain);
    res.status(200).json({
      success: true,
      explantaion: explanation,
      domain: domain,
    });
  
  } catch (error) {
    console.error("[Analogy-O] /explain route error:", error);
    res.status(500).json({
      error: "An internal error occurred. try again",
    });
  }
});

//Moved from background.js since generation layer lives in server.js now
function getMockExplanation(text,domain) {
  const textPreview = text.slice(0,80).trim();
  const explanations = {
    UFC: `Imagine a fighter studying film before a championship bout. "${textPreview}..." is like analyzing your opponent's tendencies so you know exactly when to strike.`,

    Cooking: `Think of "${textPreview}..." like reducing a sauce. You remove unnecessary ingredients until only the most important flavors remain.`,

    Soccer: `Imagine a midfielder scanning the field. "${textPreview}..." is similar to identifying the best passing lane before making the perfect assist.`,

    Gaming: `Think of "${textPreview}..." like unlocking a skill tree. Early decisions create stronger opportunities later in the game.`,

    Movies: `Picture a movie's three-act structure. "${textPreview}..." is part of a larger story where every scene contributes to the final payoff.`,
  };

  return (
    explanations[domain] || `Here is an analogy for "${textPreview}..." using the "${domain}" framework`
  );
}


app.listen(PORT, () => {
  console.log(`\n✅ AnalogyO backend is running`);
  console.log(`   http://localhost:${PORT}/health  ← verify server is alive`);
  console.log(`   POST http://localhost:${PORT}/explain  ← extension calls this\n`);
});








