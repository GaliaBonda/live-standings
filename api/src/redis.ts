import { Redis } from "ioredis";

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6380";

export const redis = new Redis(url, { maxRetriesPerRequest: 3 });

export function standingsKey(contestId: string) {
  return `standings:${contestId}`;
}
