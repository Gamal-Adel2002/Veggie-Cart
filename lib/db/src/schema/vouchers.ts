import { pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const vouchersTable = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  customerPhone: text("customer_phone"),
  amount: real("amount").notNull(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  usedInOrderId: integer("used_in_order_id"),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoucherSchema = createInsertSchema(vouchersTable).omit({ id: true, createdAt: true });
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchersTable.$inferSelect;
