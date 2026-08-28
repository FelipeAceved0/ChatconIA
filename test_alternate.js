require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test(modelName) {
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: 'Hola',
        });
        console.log(`Success with ${modelName}`);
    } catch (e) {
        console.error(`Error with ${modelName}:`, e.message);
    }
}
test('gemini-3.7-flash');
test('gemini-3.5-flash');
