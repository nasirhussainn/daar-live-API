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
          console.log(`HI`)
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