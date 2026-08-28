const io = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connected");
    socket.emit("join_chat", { username: "TestUser", language: "es" });
    
    // Simulate sending a message to the bot
    setTimeout(() => {
        socket.emit("send_message", {
            msgId: "test-msg-1",
            user: "TestUser",
            language: "es",
            text: "Hola bot",
            target: "AI_BOT",
            fromId: socket.id
        });
        console.log("Message sent to bot");
    }, 1000);
});

socket.on("receive_message", (data) => {
    console.log("Received:", data);
    if (data.fromId === "AI_BOT") {
        process.exit(0);
    }
});
