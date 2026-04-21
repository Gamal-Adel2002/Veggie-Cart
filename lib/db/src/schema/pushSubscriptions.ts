import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { deliveryPersonsTable } from "./delivery";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  deliveryPersonId: integer("delivery_person_id").references(() => deliveryPersonsTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  keys: text("keys").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
