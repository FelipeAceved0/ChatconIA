//librerias
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");

const app = express();

// MIDDLEWARES DE SEGURIDAD Y RENDIMIENTO
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());

// creacion del server
const server = http.createServer(app);

// inicializacion de socket.io
const io = new Server(server, {
    cors: {
        origin: "*",//En produccion definir el dominio de la app
        methods: ["GET", "POST"]
    }
});

let activeUsers = {
    'AI_BOT': {
        id: 'AI_BOT',
        username: 'Asistente IA',
        language: 'es' 
    }
};

// funcion traductora
async function translateMessage(text, sourceLang, targetLang) {
    // Si hablan el mismo idioma, no gastamos tiempo en traducir
    if (sourceLang === targetLang) {
        return text;
    }
    const prompt = `Traduce el siguiente texto de ${sourceLang} a ${targetLang}. Devuelve SOLO el texto traducido, sin notas, ni comillas extra:\n\n${text}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 500
            }
        });
        return response.text.trim(); // .trim() quita espacios al principio y al final
    } catch (error) {
        console.error("Error en la IA al traducir:", error);
        return text; // Si la IA falla (ej. sin internet), pasamos el mensaje original
    }
}

// NUEVO: Función para traducir a múltiples idiomas en una sola petición (Optimización de Rate Limit)
async function translateMultiple(text, sourceLang, targetLangsArray) {
    if (targetLangsArray.length === 0) return {};
    
    const prompt = `Traduce el texto del idioma '${sourceLang}' a los siguientes idiomas: ${targetLangsArray.join(', ')}. 
Devuelve ÚNICAMENTE un objeto JSON donde las claves sean los idiomas y los valores el texto traducido. 
Ejemplo: {"en": "Hello", "ja": "こんにちは"}
Texto a traducir: "${text}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 800
            }
        });
        // Limpiamos el texto por si la IA devuelve etiquetas markdown como ```json
        let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error en batch translation:", error);
        // Si falla, devolvemos el texto original para todos
        return targetLangsArray.reduce((acc, lang) => ({ ...acc, [lang]: text }), {});
    }
}

// Función para generar las respuestas del Bot
async function generateBotResponse(userText, userLanguage) {
    // Le damos una "personalidad" y le decimos en qué idioma responder
    const prompt = `Eres un asistente de IA muy amigable llamado 'Asistente IA'. 
    Un usuario te acaba de decir: "${userText}". 
    Responde de forma natural, breve y útil. 
    ¡IMPORTANTE! Debes responder en este idioma: ${userLanguage}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                temperature: 0.5,
                maxOutputTokens: 300
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error en el Bot:", error);
        
        // Detectar error de límite de peticiones (429 Too Many Requests o Quota Exceeded)
        const errMsg = error.message || "";
        if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("exceeded")) {
            return "¡Uy! He recibido demasiados mensajes de golpe y mi sistema está saturado (Límite de API). Por favor, espera unos segundos y vuelve a hablarme. 🤖⏳";
        }
        
        return "Lo siento, mi cerebro de IA está fallando en este momento. 🤖";
    }
}


// Escuchar conexiones de clientes
io.on('connection', (socket) => {
    console.log(`Un usuario se ha conectado: ${socket.id}`);

    // Escuchar cuando un usuario ingresa sus datos en el Login
    socket.on('join_chat', (userData) => {
        // Guardamos al usuario relacionándolo con su ID de socket
        activeUsers[socket.id] = {
            id: socket.id,
            username: userData.username,
            language: userData.language
        };

        // Le enviamos la lista de TODOS los usuarios actualizados a TODOS los conectados
        io.emit('active_users', Object.values(activeUsers));
    });

    // Escuchar el evento que manda el frontend
    socket.on('send_message', async (data) => {
        if (data.target === 'global') {
            // 1. Enviar el mensaje original a TODOS inmediatamente
            io.emit('receive_message', data);

            // 2. Averiguar qué idiomas únicos necesitamos traducir (excluyendo el del remitente)
            const uniqueLanguages = [...new Set(Object.values(activeUsers).map(u => u.language))];
            const langsToTranslate = uniqueLanguages.filter(lang => lang !== data.language);

            // 3. Traducir todo en UNA SOLA petición a la IA
            if (langsToTranslate.length > 0) {
                translateMultiple(data.text, data.language, langsToTranslate).then(translations => {
                    // Repartimos las traducciones a quien corresponda
                    Object.values(activeUsers).forEach(user => {
                        if (user.language !== data.language && user.id !== socket.id) {
                            io.to(user.id).emit('translation_ready', {
                                msgId: data.msgId,
                                chatTarget: 'global',
                                translatedText: translations[user.language]
                            });
                        }
                    });
                });
            }

        } else if (data.target === 'AI_BOT') {
            // --- LÓGICA DEL BOT DE IA ---

            // 1. Te mostramos tu propio mensaje inmediatamente en tu pantalla
            socket.emit('receive_message', data);

            // 2. Le pedimos al Bot que piense una respuesta en segundo plano
            generateBotResponse(data.text, data.language).then(botText => {

                // 3. Armamos el mensaje del Bot como si fuera un humano
                const botResponseData = {
                    msgId: Date.now() + Math.random().toString(), // ID único
                    user: activeUsers['AI_BOT'].username,
                    language: data.language, // FIX: El bot "habla" tu idioma, así no sale la animación de traducción
                    text: botText, // Lo que pensó la IA
                    time: new Date().toLocaleTimeString(),
                    target: socket.id, // Te lo envía de vuelta a ti
                    fromId: 'AI_BOT' // Identificador del Bot
                };

                // 4. Te disparamos la respuesta para que la veas
                socket.emit('receive_message', botResponseData);
            });

        } else {


            // --- LÓGICA DE CHAT PRIVADO ---
            const recipientUser = activeUsers[data.target];
            if (recipientUser) {
                // 1. Enviar mensaje original a AMBOS inmediatamente
                io.to(data.target).emit('receive_message', data);
                socket.emit('receive_message', data);

                // 2. Traducir asíncronamente para el receptor
                if (recipientUser.language !== data.language) {
                    translateMessage(data.text, data.language, recipientUser.language).then(translatedText => {
                        // Cuando termine, le mandamos la actualización al receptor
                        io.to(data.target).emit('translation_ready', {
                            msgId: data.msgId,
                            chatTarget: socket.id, // Para el receptor, el chat es con el remitente
                            translatedText: translatedText
                        });
                    });
                }
            }
        }
    });

    //  Un usuario solicita hablar con alguien
    socket.on('request_chat', (data) => {
        console.log(`${data.username} quiere hablar con el ID ${data.to}`);

        if (data.to === 'AI_BOT') {
            // Si invitan al Bot, él acepta instantáneamente y te avisa
            socket.emit('chat_accepted', {
                from: 'AI_BOT',
                username: activeUsers['AI_BOT'].username
            });
        } else {
            // Si es un humano normal, le enviamos la invitación por la red
            io.to(data.to).emit('chat_invite', {
                from: socket.id,
                username: data.username
            });
        }
    });


    //El usuario receptor ACEPTA la invitación
    socket.on('accept_chat', (data) => {
        // data.to = ID del que envió la solicitud originalmente
        io.to(data.to).emit('chat_accepted', {
            from: socket.id,
            username: activeUsers[socket.id].username
        });
    });

    //El usuario receptor RECHAZA la invitación
    socket.on('decline_chat', (data) => {
        io.to(data.to).emit('chat_declined', {
            from: socket.id,
            username: activeUsers[socket.id].username
        });
    });



    // Cuando alguien se desconecta, hay que sacarlo de la lista
    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        if (activeUsers[socket.id]) {
            delete activeUsers[socket.id]; // Lo borramos
            io.emit('active_users', Object.values(activeUsers)); // Avisamos que alguien se fue
        }
    });
});

// CONFIGURACIÓN PARA PRODUCCIÓN (SERVIR REACT DESDE NODE.JS)
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

//definicion del puerto
const PORT = process.env.PORT || 3000;

//encendido del servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
