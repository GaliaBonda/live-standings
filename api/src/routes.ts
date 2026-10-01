import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { login, verifyToken, type AuthUser } from "./auth.ts";
import { db } from "./db/client.ts";
import { contests, scoreEvents } from "./db/schema.ts";
import { redis, standingsKey } from "./redis.ts";
import { broadcastStandings } from "./socket.ts";
import { readStandings } from "./standings.ts";
import type { Server } from "socket.io";

export function createRouter(io: Server) {
  const router = Router();

  router.post("/auth/login", async (req, res) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(6) })
      .parse(req.body);
    try {
      res.status(201).json(await login(body.email, body.password));
    } catch (err) {
      res.status(401).json({
        message: err instanceof Error ? err.message : "Login failed",
      });
    }
  });

  router.get("/auth/me", requireUser, (req, res) => {
    res.json(userOf(req));
  });

  router.get("/contests", requireUser, async (_req, res) => {
    res.json(await db.select().from(contests));
  });

  router.get("/contests/:id/standings", requireUser, async (req, res) => {
    res.json({ ranks: await readStandings(req.params.id) });
  });

  router.post("/contests/:id/scores", requireUser, async (req, res) => {
    if (userOf(req)?.role !== "host") {
      res.status(403).json({ message: "Only the host can award points" });
      return;
    }
    const body = z
      .object({
        userId: z.string().uuid(),
        delta: z.number().int().refine((n) => n !== 0),
        reason: z.string().min(1).max(120),
      })
      .parse(req.body);
    const contestId = req.params.id;
    const [contest] = await db
      .select()
      .from(contests)
      .where(eq(contests.id, contestId));
    if (!contest) {
      res.status(404).json({ message: "Contest not found" });
      return;
    }
    await db.insert(scoreEvents).values({
      contestId,
      userId: body.userId,
      delta: body.delta,
      reason: body.reason,
    });
    await redis.zincrby(standingsKey(contestId), body.delta, body.userId);
    const ranks = await readStandings(contestId);
    await broadcastStandings(io, contestId);
    res.status(201).json({ ranks });
  });

  return router;
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    (req as Request & { user?: AuthUser }).user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Sign in required" });
  }
}

function userOf(req: Request) {
  return (req as Request & { user?: AuthUser }).user;
}
