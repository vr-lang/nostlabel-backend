import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

let redisClient = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on("error", (err) => {
    console.warn("Redis client error, caching is disabled:", err.message);
    isRedisConnected = false;
  });

  redisClient.on("connect", () => {
    console.log("Connecting to Redis...");
  });

  redisClient.on("ready", () => {
    console.log("Redis client is ready and connected.");
    isRedisConnected = true;
  });

  // Connect asynchronously in background to avoid blocking server boot
  redisClient.connect().catch((err) => {
    console.warn("Failed to connect to Redis, caching disabled:", err.message);
    isRedisConnected = false;
  });
} else {
  console.log("REDIS_URL not provided. Redis caching is disabled.");
}

// Resilient wrapper helpers
const cacheSet = async (key, value, duration = 3600) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: duration,
    });
    return true;
  } catch (error) {
    console.error("Redis Cache SET error:", error.message);
    return false;
  }
};

const cacheGet = async (key) => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis Cache GET error:", error.message);
    return null;
  }
};

const cacheDel = async (key) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Redis Cache DEL error:", error.message);
    return false;
  }
};

export { redisClient, isRedisConnected, cacheSet, cacheGet, cacheDel };
