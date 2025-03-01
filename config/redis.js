const Redis = require("ioredis");

let redisInstance;

function getRedisInstance() {
  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL);

    redisInstance.on("connect", () => {
      console.log("🔗 Connected to Redis!");
    });

    redisInstance.on("error", (err) => {
      console.error("❌ Redis connection error:", err);
    });
  }
  return redisInstance;
}

module.exports = getRedisInstance();
