import type { Server } from "socket.io";
import { verifyToken, type AuthUser } from "./auth.ts";
import { readStandings } from "./standings.ts";

export function contestRoom(contestId: string) {
  return `contest:${contestId}`;
}

export function attachSockets(io: Server) {
  io.use((socket, next) => {
    try {
      const token = String(socket.handshake.auth.token ?? "");
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser;
    socket.on("join", async (contestId: string) => {
      await socket.join(contestRoom(contestId));
      socket.emit("standings", {
        contestId,
        viewer: user,
        ranks: await readStandings(contestId),
      });
    });
  });
}

export async function broadcastStandings(io: Server, contestId: string) {
  io.to(contestRoom(contestId)).emit("standings", {
    contestId,
    ranks: await readStandings(contestId),
  });
}
