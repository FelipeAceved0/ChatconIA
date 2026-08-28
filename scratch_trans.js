require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function translateMultiple(text, sourceLang, targetLangsArray) {
    if (targetLangsArray.length === 0) return {};
    
    const prompt = `Traduce el texto del idioma '${sourceLang}' a los siguientes idiomas: ${targetLangsArray.join(', ')}. 
Devuelve ÚNICAMENTE un objeto JSON donde las claves sean los idiomas y los valores el texto traducido. 
Ejemplo: {"en": "Hello", "ja": "こんにちは"}
Texto a traducir: "${text}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
        });
        console.log("Raw response:", response.text);
        let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error en batch translation:", error);
        return targetLangsArray.reduce((acc, lang) => ({ ...acc, [lang]: text }), {});
    }
}

translateMultiple("Hola, como estas?", "es", ["en", "pt"]).then(console.log);
