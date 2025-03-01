const redis = require("./redis"); // Ensure singleton instance

const redisSubscriber = redis.duplicate(); // Create a separate Redis instance for subscribing

module.exports = (io) => {
  io.on("connection", (socket) => {

    socket.on("joinRoom", async (data) => {
      try {
        const { propertyId } = typeof data === "string" ? JSON.parse(data) : data;
        if (!propertyId) {
          console.log("⚠️ Invalid propertyId received");
          return;
        }

        if (!socket.subscribedChannels) {
          socket.subscribedChannels = new Set();
        }

        if (!socket.subscribedChannels.has(propertyId)) {
          await redisSubscriber.subscribe(`chat:${propertyId}`);
          socket.subscribedChannels.add(propertyId);
          console.log(`✅ Subscribed to Redis channel: chat:${propertyId}`);
        }
      } catch (error) {
        console.error("❌ Error in joinRoom:", error.message);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  // Redis listener for messages
  redisSubscriber.on("message", (channel, message) => {
    try {
      const propertyId = channel.replace("chat:", "");
      const parsedMessage = JSON.parse(message);
      io.to(propertyId).emit("newMessage", parsedMessage);
      console.log(`📩 New message sent to room ${propertyId} as ${parsedMessage}`);
    } catch (error) {
      console.error("❌ Error processing Redis message:", error.message);
    }
  });
};
