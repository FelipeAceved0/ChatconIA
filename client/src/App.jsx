import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import './App.css'
import { UI_TEXT } from './translations';

// Conectar al backend dinámicamente (localhost en desarrollo, '/' en producción)
const socket = io(import.meta.env.PROD ? '/' : 'http://localhost:3000');

function App() {
  const [isConnected, setIsConnected] = useState(false);

  // Variables de estado para guardar los datos del usuario
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('es'); // Idioma por defecto: Español
  const [hasJoined, setHasJoined] = useState(false); // ¿Ya entró al chat?
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]); // Lista de usuarios conectados
  const [activeTab, setActiveTab] = useState('global'); // Pestaña activa
  const [chatHistories, setChatHistories] = useState({ global: [] }); // Objeto para guardar el historial
  const [invites, setInvites] = useState([]); // Lista de invitaciones
  const [unreadCounts, setUnreadCounts] = useState({}); // guardará cuántos mensajes sin leer tiene cada usuario y el global.
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' }); // NUEVO: Estado para el modal

  const t = UI_TEXT[language]; //variable que cargara los textos en el idioma elegido

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // cuando nos llega una invitacion
    socket.on('chat_invite', (data) => {
      setInvites((prev) => [...prev, data]);
    });
    // Cuando alguien acepta nuestra invitación
    socket.on('chat_accepted', (data) => {
      setModalConfig({ isOpen: true, title: t.notification || 'Notificación', message: `${data.username} aceptó tu invitación.` });
      // Le creamos un historial vacío para que aparezca la pestaña
      setChatHistories((prev) => ({ ...prev, [data.from]: [] }));
      setActiveTab(data.from); // Saltamos a su pestaña
    });
    // Cuando alguien la rechaza
    socket.on('chat_declined', (data) => {
      setModalConfig({ isOpen: true, title: t.notification || 'Notificación', message: `${data.username} rechazó tu invitación al chat privado.` });
    });
    // Escuchar la actualización de usuarios activos
    socket.on('active_users', (users) => {
      setActiveUsers(users);
    });


    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('active_users');
      socket.off('chat_invite');
      socket.off('chat_accepted');
      socket.off('chat_declined');
    };
  }, []);


  // SEGUNDO useEffect: Especial para mensajes y notificaciones
  useEffect(() => {
    const handleReceiveMessage = (data) => {
      const chatKey = data.target === 'global' ? 'global' : (data.fromId === socket.id ? data.target : data.fromId);

      setChatHistories((prev) => {
        const history = prev[chatKey] || [];
        return { ...prev, [chatKey]: [...history, data] };
      });

      // Si nos llega un mensaje de OTRO usuario y NO estamos viéndolo ahora mismo:
      if (chatKey !== activeTab && data.fromId !== socket.id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1 // Sumamos 1 a su contador
        }));
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    // NUEVO: Escuchar cuando la traducción esté lista
    const handleTranslationReady = (info) => {
      setChatHistories((prev) => {
        const history = prev[info.chatTarget] || [];
        const updatedHistory = history.map(msg => 
          msg.msgId === info.msgId ? { ...msg, translatedText: info.translatedText } : msg
        );
        return { ...prev, [info.chatTarget]: updatedHistory };
      });
    };
    socket.on('translation_ready', handleTranslationReady);

    // Limpiamos al cambiar de pestaña
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('translation_ready', handleTranslationReady);
    };
  }, [activeTab]); // <- ESTO ES CLAVE: Le dice a React que actualice el escuchador si cambiamos de pestaña


  // Función que se ejecuta al darle clic en "Entrar al Chat"
  const handleJoin = (e) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    if (username.trim() !== '') {
      setHasJoined(true); // Cambiamos el estado a verdadero para mostrar la pantalla de chat

      // Le avisamos al servidor quiénes somos
      socket.emit('join_chat', { username, language });
    }
  };

  const handleLogout = () => {
    window.location.reload();
  };

  // Función para enviar un mensaje
  const handleSendMessage = (e) => {
    e.preventDefault(); // Evitamos que la página se recargue
    if (currentMessage.trim() !== '') {
      // Creamos un objeto con los datos del mensaje
      const messageData = {
        msgId: Date.now() + Math.random().toString(), // NUEVO: ID único para identificar el mensaje
        user: username,
        language: language,
        text: currentMessage,
        time: new Date().toLocaleTimeString(),
        target: activeTab,
        fromId: socket.id,
      };


      // Emitimos el evento 'send_message' al servidor
      socket.emit('send_message', messageData);

      // Limpiamos el input
      setCurrentMessage('');
    }
  };


  // PANTALLA 1: Si no se ha unido (!hasJoined), muestra el Login
  if (!hasJoined) {
    return (
      <div className="login-container">
        <h1>{t.welcome}</h1>
        <p>
          {t.serverStatus}:{' '}
          <span className={`connection-badge ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? t.connected : t.disconnected}
          </span>
        </p>

        <form onSubmit={handleJoin} className="login-form">
          <input
            type="text"
            placeholder={t.namePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)} /* Actualiza la variable al escribir */
            required
          />
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="ja">Japonés</option>
            <option value="fr">Francés</option>
            <option value="pt">Portugués</option>
          </select>
          <button type="submit">{t.enterChat}</button>
        </form>
      </div>
    );
  }
  // Esto obtiene el nombre del usuario activo para mostrarlo arriba
  const activeUserObj = activeUsers.find(u => u.id === activeTab);
  const chatTitle = activeTab === 'global' ? 'Global' : (activeUserObj ? activeUserObj.username : 'Usuario Desconectado');

  // PANTALLA 2: Si ya se unió (hasJoined es true), muestra la interfaz del Chat
  return (
    <div className="main-layout">
      {/* NUEVA BARRA LATERAL */}
      <aside className="sidebar">
        {invites.length > 0 && (
          <div className="invites-container">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              {t.invites}
            </h4>
            {invites.map((inv, index) => (
              <div key={index} className="invite-box">
                <p>{inv.username} {t.wantsToChat}</p>
                <button onClick={() => {
                  socket.emit('accept_chat', { to: inv.from });
                  setChatHistories((prev) => ({ ...prev, [inv.from]: [] })); // Creamos su chat
                  setInvites(invites.filter((_, i) => i !== index)); // Borramos la notificación
                  setActiveTab(inv.from); // Vamos a su chat
                }}>{t.accept}</button>

                <button onClick={() => {
                  socket.emit('decline_chat', { to: inv.from });
                  setInvites(invites.filter((_, i) => i !== index));
                }}>{t.decline}</button>
              </div>
            ))}
          </div>
        )}
        <div
          className={`user-item ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('global');
            setUnreadCounts((prev) => ({ ...prev, global: 0 }));
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span style={{ verticalAlign: 'middle' }}>{t.globalChat}</span>
          {unreadCounts['global'] > 0 && (
            <span className="notification-badge">{unreadCounts['global']}</span>
          )}
        </div>
        <h3>{t.onlineUsers} ({activeUsers.length})</h3>
        <ul>
          {activeUsers.map((user) => (
            <li key={user.id} className={`user-item ${activeTab === user.id ? 'active' : ''}`} onClick={() => {
              if (user.id !== socket.id) {
                if (chatHistories[user.id]) {
                  setActiveTab(user.id);
                  // NUEVO: Borramos la notificación al entrar a su chat
                  setUnreadCounts((prev) => ({ ...prev, [user.id]: 0 }));
                } else {
                  socket.emit('request_chat', { to: user.id, username: username });
                  setModalConfig({ isOpen: true, title: t.notification || 'Notificación', message: `${t.inviteSent} ${user.username}. ${t.waitingResponse}` });
                }
              }
            }}>
              <span className="status-dot"></span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username} {user.id === 'AI_BOT' && <span className="bot-badge">BOT</span>} ({user.language.toUpperCase()})
                {user.id === socket.id && ` (${t.you})`}
              </span>

              {/* NUEVO: Si tiene notificaciones, las mostramos */}
              {unreadCounts[user.id] > 0 && (
                <span className="notification-badge">{unreadCounts[user.id]}</span>
              )}
            </li>
          ))}
        </ul>

          {/* Botón de Desconexión */}
          <div className="logout-container-sidebar">
            <button onClick={handleLogout} className="logout-btn">
              {t.logout || 'Desconectar'}
            </button>
          </div>
      </aside>
      <div className="chat-container">
        <header>
          {/* Usamos activeTab para saber dónde estamos */}
          <h2>{t.chatWith} {chatTitle} {chatTitle.includes('Asistente IA') && <span className="bot-badge">BOT</span>}</h2>
          <div className="header-info">
            <span className="header-info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>{username}</span>
            </span>
            <span className="header-info-divider">|</span>
            <span className="header-info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>{language.toUpperCase()}</span>
            </span>
          </div>
          {/* Botón para volver al Global */}
          {activeTab !== 'global' && (
            <button onClick={() => {
              setActiveTab('global');
              setUnreadCounts((prev) => ({ ...prev, global: 0 }));
            }}>
              {t.backToGlobal}
            </button>

          )}
        </header>

        <div className="messages-area">
          {activeTab === 'global' && <p className="system-msg">{t.globalWelcomeMsg}</p>}

          {/* Imprimimos la lista de mensajes del chat ACTIVO */}
          {(chatHistories[activeTab] || []).map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.fromId === socket.id ? 'sent' : 'received'}`}
            >
              <strong>
                {msg.user} {msg.fromId === 'AI_BOT' && <span className="bot-badge">BOT</span>}
              </strong>
              <span>{msg.text}</span>
              <span className="msg-time"> {msg.time}</span>
              
              {/* Mostrar traducción si existe, sino mostrar animación si está cargando */}
              {msg.translatedText ? (
                <div style={{ marginTop: '5px', color: '#e0e0e0', fontSize: '0.95em' }}>
                  <div style={{ borderTop: '1px dashed #ffffff44', margin: '5px 0' }}></div>
                  <em>{msg.translatedText}</em>
                </div>
              ) : (msg.language !== language && msg.fromId !== 'AI_BOT') ? (
                <div style={{ marginTop: '5px', color: '#e0e0e0', fontSize: '0.95em' }}>
                  <div style={{ borderTop: '1px dashed #ffffff44', margin: '5px 0' }}></div>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>


        {/* Formulario */}
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            placeholder={t.typeMessage}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            required
          />
          <button type="submit">{t.send}</button>
        </form>

      </div>

      {/* CUSTOM MODAL */}
      {modalConfig.isOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>{modalConfig.title}</h3>
            <p>{modalConfig.message}</p>
            <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
              {t.close || 'Cerrar'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
