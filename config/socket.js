const { Server } = require("socket.io");

let io = null;

function initializeSocket(server) {
  if (!io) {
    io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
      console.log(`🔌 New client connected: ${socket.id}`);

      // Join a chat room
      socket.on("joinChat", (data) => {
        try {
          // Parse the JSON string if `data` is a string
          const payload = typeof data === "string" ? JSON.parse(data) : data;
          const { chatId } = payload;

          // Validate input
          if (!chatId) {
            console.log("⚠️ Invalid data received for joining chat");
            return;
          }

          // Create a unique room ID
          const roomId = `chat:${chatId}`;
          socket.join(roomId);
          console.log(`📢 User joined chat room: ${roomId}`);
        } catch (error) {
          console.error("❌ Error joining chat:", error.message);
        }
      });

      // Listen for a message event
      socket.on("sendMessage", (data) => {
        try {
          const { chatId, senderId, message } = data;

          // Validate input
          if (!chatId || !senderId || !message) {
            console.log("⚠️ Invalid data received for sending message");
            return;
          }

          // Broadcast the message to the room
          const roomId = `chat:${chatId}`;
          io.to(roomId).emit("newMessage", { senderId, message });
          console.log(`📩 Message sent to room: ${roomId}`);
        } catch (error) {
          console.error("❌ Error sending message:", error.message);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }
  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initializeSocket, getIO };
