require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        const models = await ai.models.list();
        let i = 0;
        for await (const model of models) {
            console.log(model.name, model.displayName);
            i++;
        }
        console.log(`Total models: ${i}`);
    } catch (e) {
        console.error("Error listing models:", e);
    }
}
listModels();
