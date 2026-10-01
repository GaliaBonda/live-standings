import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { users } from "./db/schema.ts";

const secret =
  process.env.JWT_SECRET ?? "live-standings-dev-secret-change-me";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "host" | "player";
};

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }
  const publicUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser["role"],
  };
  const token = jwt.sign(publicUser, secret, { expiresIn: "7d" });
  return { token, user: publicUser };
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, secret) as AuthUser;
}
