require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testConfig() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: 'Hola',
            config: {
                temperature: 0.5,
                maxOutputTokens: 300
            }
        });
        console.log(`Success with config. Response: ${response.text}`);
    } catch (e) {
        console.error(`Error with config:`, e.message);
    }
}
testConfig();
