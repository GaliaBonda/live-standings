import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const url =
  process.env.DATABASE_URL ??
  "postgres://standings:standings@127.0.0.1:5434/standings";

export const pool = new pg.Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
