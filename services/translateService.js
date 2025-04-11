// services/translateService.js
const { Translate } = require("@google-cloud/translate").v2;

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

module.exports = { translateText };
