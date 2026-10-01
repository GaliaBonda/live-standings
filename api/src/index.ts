import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createRouter } from "./routes.ts";
import { seed } from "./seed.ts";
import { attachSockets } from "./socket.ts";

const port = Number(process.env.PORT ?? 3003);

async function main() {
  const contest = await seed();
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });
  attachSockets(io);

  app.use(
    cors({
      origin: [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^exp:\/\//,
      ],
      credentials: true,
    }),
  );
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ ok: true, contestId: contest?.id ?? null });
  });
  app.use("/api", createRouter(io));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err instanceof Error ? err.message : "Server error";
      res.status(400).json({ message });
    },
  );

  httpServer.listen(port, () => {
    console.log(`Live standings API on http://127.0.0.1:${port}`);
    if (contest) {
      console.log(`Seeded contest ${contest.name} (${contest.id})`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
