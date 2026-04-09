import { pgTable, serial, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const storeSettingsTable = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  schedule: json("schedule").notNull().$type<Record<DayKey | string, { enabled: boolean; startTime: string; endTime: string }>>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettingsTable).omit({ id: true, updatedAt: true });
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettingsTable.$inferSelect;
