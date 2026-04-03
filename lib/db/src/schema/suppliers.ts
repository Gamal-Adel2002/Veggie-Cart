import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierOrdersTable = pgTable("supplier_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  notes: text("notes"),
  totalPrice: real("total_price").notNull().default(0),
  orderedAt: timestamp("ordered_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierOrderItemsTable = pgTable("supplier_order_items", {
  id: serial("id").primaryKey(),
  supplierOrderId: integer("supplier_order_id").notNull().references(() => supplierOrdersTable.id),
  productName: text("product_name").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  subtotal: real("subtotal").notNull(),
});

export type Supplier = typeof suppliersTable.$inferSelect;
export type SupplierOrder = typeof supplierOrdersTable.$inferSelect;
export type SupplierOrderItem = typeof supplierOrderItemsTable.$inferSelect;
