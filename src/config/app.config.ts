import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    url: process.env.REDIS_URL,
  },
  cache: {
    redirectTtlSeconds: parseInt(process.env.CACHE_REDIRECT_TTL ?? "3600", 10), // 1h default
  },
  rateLimit: {
    redirectPerMinute: parseInt(process.env.RATE_LIMIT_REDIRECT ?? "120", 10),
    createLinkPerMinute: parseInt(
      process.env.RATE_LIMIT_CREATE_LINK ?? "30",
      10,
    ),
  },
}));
