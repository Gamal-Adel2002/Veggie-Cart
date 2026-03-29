import { pgTable, serial, text, real, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const unitEnum = pgEnum("product_unit", ["kg", "piece", "bundle"]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  price: real("price").notNull(),
  unit: unitEnum("unit").notNull().default("kg"),
  image: text("image"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  featured: boolean("featured").notNull().default(false),
  inStock: boolean("in_stock").notNull().default(true),
  quantity: real("quantity"),
  quantityAlert: real("quantity_alert"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
