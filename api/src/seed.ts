import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contests, entries, scoreEvents, users } from "./db/schema.ts";
import { redis, standingsKey } from "./redis.ts";

export const DEMO_PASSWORD = "demo1234";

export async function ensureSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contest_id uuid NOT NULL REFERENCES contests(id),
      user_id uuid NOT NULL REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS score_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contest_id uuid NOT NULL REFERENCES contests(id),
      user_id uuid NOT NULL REFERENCES users(id),
      delta integer NOT NULL,
      reason text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function seed() {
  await ensureSchema();
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    const [contest] = await db.select().from(contests);
    if (contest) await rebuildRedis(contest.id);
    return contest;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [host, kai, remi, sol] = await db
    .insert(users)
    .values([
      {
        email: "nia@demo.local",
        name: "Nia Okonkwo",
        passwordHash,
        role: "host",
      },
      {
        email: "kai@demo.local",
        name: "Kai Mendes",
        passwordHash,
        role: "player",
      },
      {
        email: "remi@demo.local",
        name: "Remi Walsh",
        passwordHash,
        role: "player",
      },
      {
        email: "sol@demo.local",
        name: "Sol Park",
        passwordHash,
        role: "player",
      },
    ])
    .returning();

  const [contest] = await db
    .insert(contests)
    .values({ name: "Trivia Night", status: "live" })
    .returning();

  await db.insert(entries).values([
    { contestId: contest.id, userId: kai.id },
    { contestId: contest.id, userId: remi.id },
    { contestId: contest.id, userId: sol.id },
  ]);

  await db.insert(scoreEvents).values([
    {
      contestId: contest.id,
      userId: kai.id,
      delta: 20,
      reason: "Round 1: capitals",
    },
    {
      contestId: contest.id,
      userId: remi.id,
      delta: 15,
      reason: "Round 1: capitals",
    },
    {
      contestId: contest.id,
      userId: sol.id,
      delta: 10,
      reason: "Round 1: capitals",
    },
  ]);

  await rebuildRedis(contest.id);
  return contest;
}

export async function rebuildRedis(contestId: string) {
  const key = standingsKey(contestId);
  await redis.del(key);
  const events = await db
    .select()
    .from(scoreEvents)
    .where(eq(scoreEvents.contestId, contestId));
  const totals = new Map<string, number>();
  for (const event of events) {
    totals.set(event.userId, (totals.get(event.userId) ?? 0) + event.delta);
  }
  const enrolled = await db
    .select()
    .from(entries)
    .where(eq(entries.contestId, contestId));
  if (totals.size === 0) {
    for (const row of enrolled) totals.set(row.userId, 0);
  }
  if (totals.size > 0) {
    await redis.zadd(
      key,
      ...[...totals.entries()].flatMap(([userId, score]) => [score, userId]),
    );
  }
}
