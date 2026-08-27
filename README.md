# 🌐 ChatconIA - Real-Time AI Translation Chat

Un sistema de mensajería instantánea revolucionario que rompe las barreras del idioma. Construido con tecnología web moderna, **ChatconIA** permite a usuarios de todo el mundo chatear en su idioma nativo mientras la Inteligencia Artificial (Google Gemini) traduce los mensajes en tiempo real. 

Además, cuenta con un **Asistente de IA (Bot)** integrado con el que puedes conversar directamente en cualquier idioma.

---

## ✨ Características Principales

- 🌍 **Traducción en Tiempo Real:** Envía un mensaje en Español y el receptor lo leerá automáticamente en Inglés, Japonés, Francés o Portugués (dependiendo de su configuración).
- 🤖 **Asistente IA Integrado:** Un bot inteligente conectado permanentemente que actúa como un usuario más. Puedes invitarlo a chatear y te responderá de forma amigable y útil.
- 💬 **Chat Global y Privado:** Participa en una sala de chat mundial (donde las traducciones se optimizan en lotes) o envía invitaciones para tener chats uno a uno privados.
- ⚡ **Alta Velocidad:** Integración optimizada con la API de Gemini (parámetros de temperatura deterministas y límites de tokens) para reducir drásticamente la latencia de traducción.
- 🎨 **Diseño Moderno (UI/UX):** Una interfaz limpia, clara y sin recargar, con notificaciones emergentes personalizadas (Modales) e insignias de estado en vivo.
- 🛡️ **Seguridad y Rendimiento:** Equipado con `helmet` y `compression` para cumplir con buenas prácticas en producción y proteger los datos en tránsito.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto utiliza el stack **PERN/MERN** (reemplazando la BD por sockets) para garantizar una experiencia en tiempo real sin recargas de página.

### Frontend
- **React.js (Vite):** Framework principal para construir la interfaz de usuario con alto rendimiento.
- **Vanilla CSS:** Diseño responsivo y moderno desde cero, sin depender de pesadas librerías externas.
- **Socket.IO-Client:** Para mantener una conexión WebSocket bidireccional y continua con el servidor.

### Backend
- **Node.js & Express:** Servidor robusto capaz de manejar las rutas y servir los archivos estáticos en producción.
- **Socket.IO:** Gestión de eventos en tiempo real (salas, desconexiones, mensajes directos).
- **Google Gen AI SDK (`@google/genai`):** Motor principal impulsado por el modelo *Gemini Flash* para procesar traducciones multilingües ultra rápidas y proveer personalidad al Bot.

---

## 🚀 Instalación y Uso Local

Sigue estos pasos para correr el proyecto en tu propia máquina:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/FelipeAceved0/ChatconIA.git
   cd ChatconIA
   ```

2. **Instalar dependencias del Backend y Frontend:**
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo llamado `.env` en la raíz del proyecto y añade tu clave secreta de Gemini:
   ```env
   GEMINI_API_KEY=tu_clave_secreta_aqui
   PORT=3000
   ```

4. **Levantar los Servidores (Modo Desarrollo):**
   Abre dos terminales.
   - Terminal 1 (Backend): `npm start`
   - Terminal 2 (Frontend): `cd client && npm run dev`

---

## ☁️ Despliegue en Producción (Render)

El proyecto está diseñado para desplegarse fácilmente como un **Web Service en Render**:
- **Build Command:** `npm install && cd client && npm install && npm run build`
- **Start Command:** `node server.js`
- No olvides agregar tu `GEMINI_API_KEY` en la sección de *Environment Variables* del dashboard de Render.

---

> Desarrollado con dedicación por **Felipe Acevedo**. 
