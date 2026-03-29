import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryPersonsTable = pgTable("delivery_persons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliveryPersonSchema = createInsertSchema(deliveryPersonsTable).omit({ id: true, createdAt: true });
export type InsertDeliveryPerson = z.infer<typeof insertDeliveryPersonSchema>;
export type DeliveryPerson = typeof deliveryPersonsTable.$inferSelect;
