import { pgTable, serial, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryFeeTypeEnum = pgEnum("delivery_fee_type", ["fixed", "percentage"]);

export const deliverySettingsTable = pgTable("delivery_settings", {
  id: serial("id").primaryKey(),
  feeType: deliveryFeeTypeEnum("fee_type").notNull().default("fixed"),
  feeValue: real("fee_value").notNull().default(0),
  minimumFee: real("minimum_fee").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeliverySettingsSchema = createInsertSchema(deliverySettingsTable).omit({ id: true, updatedAt: true });
export type InsertDeliverySettings = z.infer<typeof insertDeliverySettingsSchema>;
export type DeliverySettings = typeof deliverySettingsTable.$inferSelect;
