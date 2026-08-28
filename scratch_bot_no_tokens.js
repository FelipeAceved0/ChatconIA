require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateBotResponse(userText, userLanguage) {
    const prompt = `Eres un asistente de IA muy amigable llamado 'Asistente IA'. 
    Un usuario te acaba de decir: "${userText}". 
    Responde de forma natural, breve y útil. 
    ¡IMPORTANTE! Debes responder en este idioma: ${userLanguage}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error en el Bot:", error);
        return "Lo siento, mi cerebro de IA está fallando en este momento. 🤖";
    }
}

generateBotResponse("que puedes hacer?", "es").then(console.log).catch(console.error);
