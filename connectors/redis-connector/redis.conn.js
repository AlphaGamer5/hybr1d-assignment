import Redis from "ioredis";

let client;

export async function connectRedis() {
  const clientOpts = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  };

  if (client) return client;

  client = new Redis(clientOpts);

  client.on("error", (err) => {
    logger.error("Redis Client Error", err);
  });

  return client;
}
