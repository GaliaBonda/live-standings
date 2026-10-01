import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
});

export const contests = pgTable("contests", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  contestId: uuid("contest_id")
    .notNull()
    .references(() => contests.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
});

export const scoreEvents = pgTable("score_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  contestId: uuid("contest_id")
    .notNull()
    .references(() => contests.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
