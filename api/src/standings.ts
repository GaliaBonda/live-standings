import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { entries, users } from "./db/schema.ts";
import { rankStandings, type RankedEntry } from "./ranking.ts";
import { redis, standingsKey } from "./redis.ts";

export async function readStandings(contestId: string): Promise<RankedEntry[]> {
  const raw = await redis.zrevrange(standingsKey(contestId), 0, -1, "WITHSCORES");
  const scores = new Map<string, number>();
  for (let i = 0; i < raw.length; i += 2) {
    scores.set(raw[i], Number(raw[i + 1]));
  }
  const roster = await db
    .select({
      userId: users.id,
      name: users.name,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .where(eq(entries.contestId, contestId));
  return rankStandings(
    roster.map((row) => ({
      userId: row.userId,
      name: row.name,
      score: scores.get(row.userId) ?? 0,
    })),
  );
}
