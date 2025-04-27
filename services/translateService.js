// services/translateService.js
const { Translate } = require("@google-cloud/translate").v2;
const countryShortForms = require("../config/countryShortForms.json");
const translate = new Translate({
  key: process.env.GOOGLE_CLOUD_TRANSLATION,
});

// Parse languages from env or fallback to defaults
const defaultLanguages = ['en', 'ar'];
const envLangs = process.env.TRANSLATION_TARGET_LANGUAGES;
const targetLanguages = envLangs ? envLangs.split(',') : defaultLanguages;

async function translateText(text, langs = targetLanguages) {
  const translations = {};

  for (const lang of langs) {
    try {
      const [translation] = await translate.translate(text, { to: lang });
      translations[lang] = translation;
    } catch (err) {
      console.error(`Translation failed for '${lang}':`, err.message);
      translations[lang] = text;
    }
  }

  return translations;
}

// First check direct match, then try translation
async function translateToEnglish(userInput) {
  try {
    const input = userInput.trim().toUpperCase();

    // Direct match check first
    if (countryShortForms[input]) {
      return countryShortForms[input];
    }

    // If not found, then translate
    const [translation] = await translate.translate(userInput, { to: "en" });
    const translatedInput = translation.trim().toUpperCase();

    // Again check if translated text is a short form
    if (countryShortForms[translatedInput]) {
      return countryShortForms[translatedInput];
    }

    return translation; // Otherwise, use the translated result directly
  } catch (err) {
    console.error(`Translation to English failed:`, err.message);
    return userInput; // fallback
  }
}

// Simple general-purpose English translation
async function simpleTranslateToEnglish(userInput) {
  try {
    const [translation] = await translate.translate(userInput, { to: "en" });
    return translation;
  } catch (err) {
    console.error(`Simple translation failed:`, err.message);
    return userInput; // fallback to original
  }
}

module.exports = { translateText, translateToEnglish, simpleTranslateToEnglish };
