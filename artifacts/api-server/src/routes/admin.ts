import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  deliveryPersonsTable,
  deliveryZonesTable,
  categoriesTable,
  suppliersTable,
  supplierOrdersTable,
  supplierOrderItemsTable,
} from "@workspace/db/schema";
import { eq, sql, desc, lte, isNotNull, and, inArray } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import type { OrderStatus } from "@workspace/db/schema";
import { buildWhatsAppMessage, sendWhatsAppMessage, sendSmsMessage } from "../lib/whatsapp";
import { hashPassword } from "../lib/auth";
import { isValidEgyptianPhone, INVALID_PHONE_MSG } from "../lib/validation";
import { broadcastToAdmins, broadcastToDeliveryPerson, broadcastToUser, sendPushToDeliveryPerson } from "./notifications";
import pino from "pino";

const logger = pino({ level: "info" });

const router = Router();

const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting: ["accepted", "rejected"],
  accepted: ["preparing"],
  rejected: [],
  preparing: ["with_delivery"],
  with_delivery: ["completed"],
  completed: [],
};

async function getFullOrder(id: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));

  let deliveryPerson = null;
  if (order.deliveryPersonId) {
    const [dp] = await db
      .select()
      .from(deliveryPersonsTable)
      .where(eq(deliveryPersonsTable.id, order.deliveryPersonId));
    deliveryPerson = dp || null;
  }

  return { ...order, items, deliveryPerson };
}

router.get("/stats", authenticate(), requireAdmin, async (_req, res) => {
  const [{ totalOrders }] = await db
    .select({ totalOrders: sql<number>`COUNT(*)::int` })
    .from(ordersTable);
  const [{ pendingOrders }] = await db
    .select({ pendingOrders: sql<number>`COUNT(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "waiting"));
  const [{ completedOrders }] = await db
    .select({ completedOrders: sql<number>`COUNT(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "completed"));
  const [{ totalProducts }] = await db
    .select({ totalProducts: sql<number>`COUNT(*)::int` })
    .from(productsTable);
  const [{ totalCustomers }] = await db
    .select({ totalCustomers: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.role, "customer"));
  const [{ revenue }] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(total_price), 0)::float` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "completed"));

  res.json({
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    completedOrders: completedOrders || 0,
    totalProducts: totalProducts || 0,
    totalCustomers: totalCustomers || 0,
    revenue: revenue || 0,
  });
});

router.get("/orders", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { status } = req.query;
  let orders;
  if (status) {
    const validStatuses: OrderStatus[] = ["waiting", "accepted", "rejected", "preparing", "with_delivery", "completed"];
    const statusValue = String(status) as OrderStatus;
    if (!validStatuses.includes(statusValue)) {
      res.status(400).json({ error: `Invalid status '${status}'` });
      return;
    }
    orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.status, statusValue))
      .orderBy(desc(ordersTable.createdAt));
  } else {
    orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  }
  const fullOrders = await Promise.all(orders.map((o) => getFullOrder(o.id)));
  res.json(fullOrders.filter(Boolean));
});

router.put("/orders/:id/status", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { status } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    res.status(400).json({
      error: `Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(", ") || "none"}`,
    });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();
  const full = await getFullOrder(updated.id);

  // Real-time notifications for status change
  setImmediate(() => {
    const payload = { orderId: id, status };
    broadcastToAdmins("order_status_changed", payload);
    if (order.userId) {
      broadcastToUser(order.userId, "order_status_changed", payload, "customer");
    }
    if (order.deliveryPersonId) {
      broadcastToDeliveryPerson(order.deliveryPersonId, "order_status_changed", payload);
    }
  });

  res.json(full);
});

router.post("/orders/:id/assign", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { deliveryPersonId } = req.body;

  if (!deliveryPersonId) {
    res.status(400).json({ error: "deliveryPersonId is required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [deliveryPerson] = await db
    .select()
    .from(deliveryPersonsTable)
    .where(eq(deliveryPersonsTable.id, Number(deliveryPersonId)))
    .limit(1);
  if (!deliveryPerson) {
    res.status(400).json({ error: "Delivery person not found" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, id));

  await db
    .update(ordersTable)
    .set({ deliveryPersonId: Number(deliveryPersonId), updatedAt: new Date() })
    .where(eq(ordersTable.id, id));

  const whatsappMsg = buildWhatsAppMessage({
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    latitude: order.latitude,
    longitude: order.longitude,
    items: items.map((i) => ({ name: i.productName, quantity: i.quantity, unit: i.unit })),
    totalPrice: order.totalPrice,
    deliveryPersonPhone: deliveryPerson.phone,
  });

  const waResult = await sendWhatsAppMessage(deliveryPerson.phone, whatsappMsg);

  let smsSent = false;
  if (!waResult.success) {
    const smsResult = await sendSmsMessage(deliveryPerson.phone, whatsappMsg);
    smsSent = smsResult.success;
  }

  const full = await getFullOrder(id);

  // Notify delivery person (SSE + push) — fire and forget
  setImmediate(async () => {
    try {
      broadcastToDeliveryPerson(Number(deliveryPersonId), "order_assigned", {
        orderId: id,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        totalPrice: order.totalPrice,
        url: `/delivery/dashboard`,
      });
      await sendPushToDeliveryPerson(Number(deliveryPersonId), {
        title: "FreshVeg — New Delivery",
        titleAr: "فريش فيج — توصيل جديد",
        body: `Order #${id} · ${order.deliveryAddress || order.customerName}`,
        bodyAr: `طلب #${id} · ${order.deliveryAddress || order.customerName}`,
        url: `/delivery/dashboard`,
      });
    } catch (err) {
      logger.warn({ err }, "Notification dispatch failed for order assignment");
    }
  });

  res.json({
    order: full,
    whatsappSent: waResult.success,
    smsSent,
    whatsappMessage: whatsappMsg,
  });
});

// ── Ordered products aggregation ──────────────────────────────────────────────

router.get("/ordered-products", authenticate(), requireAdmin, async (_req, res) => {
  const activeStatuses: OrderStatus[] = ["waiting", "accepted", "preparing"];

  const rows = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      categoryNameAr: categoriesTable.nameAr,
      categoryIcon: categoriesTable.icon,
      productName: orderItemsTable.productName,
      productNameAr: orderItemsTable.productNameAr,
      unit: orderItemsTable.unit,
      totalQuantity: sql<number>`SUM(${orderItemsTable.quantity})::float`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(inArray(ordersTable.status, activeStatuses))
    .groupBy(
      categoriesTable.id,
      categoriesTable.name,
      categoriesTable.nameAr,
      categoriesTable.icon,
      orderItemsTable.productName,
      orderItemsTable.productNameAr,
      orderItemsTable.unit
    );

  // Group into category buckets
  const categoryMap = new Map<number, {
    categoryName: string;
    categoryNameAr: string;
    categoryIcon: string;
    products: { productName: string; productNameAr: string; unit: string; totalQuantity: number }[];
  }>();

  for (const row of rows) {
    const catId = row.categoryId ?? 0;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryName: row.categoryName ?? "Uncategorised",
        categoryNameAr: row.categoryNameAr ?? "غير مصنف",
        categoryIcon: row.categoryIcon ?? "📦",
        products: [],
      });
    }
    categoryMap.get(catId)!.products.push({
      productName: row.productName,
      productNameAr: row.productNameAr,
      unit: row.unit,
      totalQuantity: row.totalQuantity,
    });
  }

  // Sort products within each category by totalQuantity descending, then sort categories by name
  const result = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      products: cat.products.sort((a, b) => b.totalQuantity - a.totalQuantity),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  res.json(result);
});

// ── Low-stock alerts ─────────────────────────────────────────────────────────

router.get("/low-stock", authenticate(), requireAdmin, async (_req, res) => {
  const lowStock = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      nameAr: productsTable.nameAr,
      quantity: productsTable.quantity,
      quantityAlert: productsTable.quantityAlert,
      unit: productsTable.unit,
      inStock: productsTable.inStock,
    })
    .from(productsTable)
    .where(
      and(
        isNotNull(productsTable.quantity),
        isNotNull(productsTable.quantityAlert),
        lte(productsTable.quantity, productsTable.quantityAlert)
      )
    );
  res.json(lowStock);
});

// ── Admin user management ────────────────────────────────────────────────────

router.get("/admins", authenticate(), requireAdmin, async (_req, res) => {
  const admins = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .orderBy(desc(usersTable.createdAt));

  const safe = admins.map(({ password: _, ...rest }) => rest);
  res.json(safe);
});

router.post("/admins", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    res.status(400).json({ error: "name, phone, and password are required" });
    return;
  }

  if (!isValidEgyptianPhone(String(phone))) {
    res.status(400).json({ error: INVALID_PHONE_MSG });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone number already exists" });
    return;
  }

  const hashed = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ name, phone, password: hashed, role: "admin" })
    .returning();

  const { password: _, ...safe } = user;
  res.status(201).json(safe);
});

router.put("/admins/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid admin ID" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!existing || existing.role !== "admin") {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const { name, phone, password } = req.body;
  const updates: Record<string, unknown> = {};

  if (name) updates.name = name;
  if (phone && phone !== existing.phone) {
    if (!isValidEgyptianPhone(String(phone))) {
      res.status(400).json({ error: INVALID_PHONE_MSG });
      return;
    }
    const conflict = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (conflict.length > 0 && conflict[0].id !== id) {
      res.status(409).json({ error: "Phone number already exists" });
      return;
    }
    updates.phone = phone;
  }
  if (password) {
    updates.password = await hashPassword(password);
  }

  if (Object.keys(updates).length === 0) {
    const { password: _, ...safe } = existing;
    res.json(safe);
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  const { password: _, ...safe } = updated;
  res.json(safe);
});

// ── Customer management ───────────────────────────────────────────────────────

router.get("/customers", authenticate(), requireAdmin, async (_req, res) => {
  const customers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      address: usersTable.address,
      latitude: usersTable.latitude,
      longitude: usersTable.longitude,
      profileImage: usersTable.profileImage,
      createdAt: usersTable.createdAt,
      orderCount: sql<number>`COUNT(${ordersTable.id})::int`,
    })
    .from(usersTable)
    .leftJoin(ordersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(usersTable.role, "customer"))
    .groupBy(usersTable.id)
    .orderBy(desc(usersTable.createdAt));

  res.json(customers);
});

router.put("/customers/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing || existing.role !== "customer") { res.status(404).json({ error: "Customer not found" }); return; }

  const { name, phone, address, latitude, longitude } = req.body;
  const updates: Record<string, unknown> = {};

  if (name != null) {
    if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name must be a non-empty string" }); return; }
    updates.name = name.trim();
  }
  if (phone != null) {
    if (typeof phone !== "string" || !phone.trim()) { res.status(400).json({ error: "phone must be a non-empty string" }); return; }
    if (!isValidEgyptianPhone(phone.trim())) { res.status(400).json({ error: INVALID_PHONE_MSG }); return; }
    const conflict = await db.select().from(usersTable).where(eq(usersTable.phone, phone.trim())).limit(1);
    if (conflict.length > 0 && conflict[0].id !== id) { res.status(409).json({ error: "Phone number already exists" }); return; }
    updates.phone = phone.trim();
  }
  if (address != null) updates.address = String(address);
  if (latitude != null) {
    const lat = Number(latitude);
    if (!Number.isFinite(lat)) { res.status(400).json({ error: "Invalid latitude" }); return; }
    updates.latitude = lat;
  }
  if (longitude != null) {
    const lng = Number(longitude);
    if (!Number.isFinite(lng)) { res.status(400).json({ error: "Invalid longitude" }); return; }
    updates.longitude = lng;
  }

  if (Object.keys(updates).length === 0) {
    const { password: _, ...safe } = existing;
    res.json(safe);
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  const { password: _, ...safe } = updated;
  res.json(safe);
});

router.put("/customers/:id/reset-password", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing || existing.role !== "customer") { res.status(404).json({ error: "Customer not found" }); return; }

  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "newPassword must be at least 6 characters" });
    return;
  }

  const hashed = await hashPassword(newPassword);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, id));
  res.json({ success: true });
});

router.delete("/customers/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing || existing.role !== "customer") { res.status(404).json({ error: "Customer not found" }); return; }

  await db.update(ordersTable).set({ userId: null }).where(eq(ordersTable.userId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).end();
});

// ── Delivery Zones CRUD ───────────────────────────────────────────────────────

router.get("/delivery-zones", authenticate(), requireAdmin, async (_req, res) => {
  const zones = await db.select().from(deliveryZonesTable).orderBy(deliveryZonesTable.id);
  res.json(zones);
});

function validateZoneFields(body: Record<string, unknown>): { error: string } | null {
  const { name, centerLat, centerLng, radiusKm } = body;
  if (!name || typeof name !== "string" || !name.trim()) return { error: "name must be a non-empty string" };
  const lat = Number(centerLat);
  const lng = Number(centerLng);
  const radius = Number(radiusKm);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "centerLat must be a valid latitude (-90 to 90)" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "centerLng must be a valid longitude (-180 to 180)" };
  if (!Number.isFinite(radius) || radius <= 0) return { error: "radiusKm must be a positive number" };
  return null;
}

router.post("/delivery-zones", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const bodyErr = validateZoneFields(req.body);
  if (bodyErr) { res.status(400).json(bodyErr); return; }

  const { name, centerLat, centerLng, radiusKm } = req.body;
  const active = req.body.active === false || req.body.active === "false" ? false : true;

  const [zone] = await db
    .insert(deliveryZonesTable)
    .values({
      name: String(name).trim(),
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      radiusKm: Number(radiusKm),
      active,
    })
    .returning();
  res.status(201).json(zone);
});

router.put("/delivery-zones/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid zone ID" }); return; }

  const [existing] = await db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Zone not found" }); return; }

  const { name, centerLat, centerLng, radiusKm, active } = req.body;
  const updates: Partial<typeof deliveryZonesTable.$inferInsert> = {};

  if (name != null) {
    if (typeof name !== "string" || !String(name).trim()) { res.status(400).json({ error: "name must be a non-empty string" }); return; }
    updates.name = String(name).trim();
  }
  if (centerLat != null) {
    const val = Number(centerLat);
    if (!Number.isFinite(val) || val < -90 || val > 90) { res.status(400).json({ error: "centerLat must be a valid latitude (-90 to 90)" }); return; }
    updates.centerLat = val;
  }
  if (centerLng != null) {
    const val = Number(centerLng);
    if (!Number.isFinite(val) || val < -180 || val > 180) { res.status(400).json({ error: "centerLng must be a valid longitude (-180 to 180)" }); return; }
    updates.centerLng = val;
  }
  if (radiusKm != null) {
    const val = Number(radiusKm);
    if (!Number.isFinite(val) || val <= 0) { res.status(400).json({ error: "radiusKm must be a positive number" }); return; }
    updates.radiusKm = val;
  }
  if (active != null) updates.active = active === true || active === "true";

  const [zone] = await db.update(deliveryZonesTable).set(updates).where(eq(deliveryZonesTable.id, id)).returning();
  res.json(zone);
});

router.delete("/delivery-zones/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid zone ID" }); return; }
  await db.delete(deliveryZonesTable).where(eq(deliveryZonesTable.id, id));
  res.status(204).end();
});

// ── Suppliers CRUD ────────────────────────────────────────────────────────────

router.get("/suppliers", authenticate(), requireAdmin, async (_req, res) => {
  const suppliers = await db.select().from(suppliersTable).orderBy(desc(suppliersTable.createdAt));
  res.json(suppliers);
});

router.post("/suppliers", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, phone, address } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [supplier] = await db
    .insert(suppliersTable)
    .values({ name: name.trim(), phone: phone ? String(phone).trim() : null, address: address ? String(address).trim() : null })
    .returning();
  res.status(201).json(supplier);
});

router.put("/suppliers/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid supplier ID" }); return; }
  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }

  const { name, phone, address } = req.body;
  const updates: Partial<typeof suppliersTable.$inferInsert> = {};
  if (name != null) {
    if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name must be a non-empty string" }); return; }
    updates.name = name.trim();
  }
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) updates.address = address ? String(address).trim() : null;

  if (Object.keys(updates).length === 0) {
    res.json(existing);
    return;
  }

  const [supplier] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
  res.json(supplier);
});

router.delete("/suppliers/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid supplier ID" }); return; }
  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }
  await db.transaction(async (tx) => {
    const orders = await tx.select({ id: supplierOrdersTable.id }).from(supplierOrdersTable).where(eq(supplierOrdersTable.supplierId, id));
    for (const o of orders) {
      await tx.delete(supplierOrderItemsTable).where(eq(supplierOrderItemsTable.supplierOrderId, o.id));
    }
    await tx.delete(supplierOrdersTable).where(eq(supplierOrdersTable.supplierId, id));
    await tx.delete(suppliersTable).where(eq(suppliersTable.id, id));
  });
  res.status(204).end();
});

// ── Supplier Orders CRUD ──────────────────────────────────────────────────────

async function getFullSupplierOrder(id: number) {
  const [order] = await db.select().from(supplierOrdersTable).where(eq(supplierOrdersTable.id, id)).limit(1);
  if (!order) return null;
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, order.supplierId)).limit(1);
  const items = await db.select().from(supplierOrderItemsTable).where(eq(supplierOrderItemsTable.supplierOrderId, id));
  return { ...order, supplier: supplier || null, items };
}

router.get("/supplier-orders", authenticate(), requireAdmin, async (_req, res) => {
  const orders = await db.select().from(supplierOrdersTable).orderBy(desc(supplierOrdersTable.orderedAt));
  const full = await Promise.all(orders.map((o) => getFullSupplierOrder(o.id)));
  res.json(full.filter(Boolean));
});

router.post("/supplier-orders", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { supplierId, orderedAt, notes, items } = req.body;
  if (!supplierId || !orderedAt || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "supplierId, orderedAt, and items array are required" });
    return;
  }
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, Number(supplierId))).limit(1);
  if (!supplier) { res.status(400).json({ error: "Supplier not found" }); return; }

  const enrichedItems: { productName: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
  let totalPrice = 0;
  for (const item of items) {
    const productName = String(item.productName || "").trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!productName) { res.status(400).json({ error: "Each item must have a productName" }); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { res.status(400).json({ error: `Invalid quantity for item "${productName}"` }); return; }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) { res.status(400).json({ error: `Invalid unitPrice for item "${productName}"` }); return; }
    const subtotal = quantity * unitPrice;
    totalPrice += subtotal;
    enrichedItems.push({ productName, quantity, unitPrice, subtotal });
  }

  const full = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(supplierOrdersTable)
      .values({ supplierId: Number(supplierId), notes: notes ? String(notes) : null, totalPrice, orderedAt: new Date(orderedAt) })
      .returning();
    for (const item of enrichedItems) {
      await tx.insert(supplierOrderItemsTable).values({ ...item, supplierOrderId: order.id });
    }
    const [supplier] = await tx.select().from(suppliersTable).where(eq(suppliersTable.id, order.supplierId)).limit(1);
    const items = await tx.select().from(supplierOrderItemsTable).where(eq(supplierOrderItemsTable.supplierOrderId, order.id));
    return { ...order, supplier: supplier || null, items };
  });
  res.status(201).json(full);
});

router.get("/supplier-orders/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid supplier order ID" }); return; }
  const full = await getFullSupplierOrder(id);
  if (!full) { res.status(404).json({ error: "Supplier order not found" }); return; }
  res.json(full);
});

router.delete("/supplier-orders/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid supplier order ID" }); return; }
  const [existing] = await db.select().from(supplierOrdersTable).where(eq(supplierOrdersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Supplier order not found" }); return; }
  await db.transaction(async (tx) => {
    await tx.delete(supplierOrderItemsTable).where(eq(supplierOrderItemsTable.supplierOrderId, id));
    await tx.delete(supplierOrdersTable).where(eq(supplierOrdersTable.id, id));
  });
  res.status(204).end();
});

export default router;
