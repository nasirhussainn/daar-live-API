// routes/translate.js
const express = require("express");
const router = express.Router();
const { Translate } = require("@google-cloud/translate").v2;

// Initialize with your API key
const translate = new Translate({
  key: process.env.GOOGLE_CLOUD_TRANSLATION, // or use a hardcoded key (not recommended)
});

router.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    // Define the target languages
    const targetLanguages = ['en', 'ar'];

    // Create a map to store translations
    const translations = {};

    // Translate text to each language and store in the map
    for (const lang of targetLanguages) {
      const [translation] = await translate.translate(text, { to: lang });
      translations[lang] = translation;
    }

    res.json(translations);  // Returning translations as a map (object)
  } catch (err) {
    console.error("Translation Error:", err.message);
    res.status(500).json({ error: "Translation failed", details: err.message });
  }
});

module.exports = router;
