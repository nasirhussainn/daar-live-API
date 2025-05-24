const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY; // Ensure API Key is correctly loaded
const genAI = new GoogleGenerativeAI(API_KEY);

async function translateText(text, targetLang) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use the correct model

    const prompt = `Translate the following text to ${targetLang === "ar" ? "Arabic" : "English"}:\n\n"${text}"`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });
    const translatedText = result.response.text();

    return translatedText.trim();
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
}

async function deepTranslate(object, targetLang) {
  if (typeof object === "string") {
    return await translateText(object, targetLang);
  } else if (Array.isArray(object)) {
    return await Promise.all(
      object.map(async (item) => deepTranslate(item, targetLang)),
    );
  } else if (typeof object === "object" && object !== null) {
    const translatedObject = {};
    for (const [key, value] of Object.entries(object)) {
      translatedObject[key] = await deepTranslate(value, targetLang);
    }
    return translatedObject;
  }
  return object; // Return unchanged if it's a number, boolean, etc.
}

async function translateResponse(response) {
  return {
    en: response, // Original response
    ar: await deepTranslate(response, "ar"), // Translated response
  };
}

async function sendResponse(res, status, response) {
  try {
    const translatedResponse = await translateResponse(response);
    return res.status(status).json(translatedResponse);
  } catch (error) {
    console.error("Translation Error:", error);
    return res.status(500).json({
      en: { message: "Translation failed" },
      ar: { message: "فشل الترجمة" },
    });
  }
}

module.exports = { translateResponse, sendResponse };
