import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter login — Upstash Redis (HTTP/REST, serverless-safe).
 * Sliding window: 5 attempt per 15 menit per IP.
 */
export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "lexa:login",
  analytics: true,
});
