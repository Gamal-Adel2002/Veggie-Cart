import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const fcmTokensTable = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  token: text("token").notNull(),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FcmToken = typeof fcmTokensTable.$inferSelect;
export type NewFcmToken = typeof fcmTokensTable.$inferInsert;
