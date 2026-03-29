import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  deliveryPersonsTable,
} from "@workspace/db/schema";
import { eq, sql, desc, lte, isNotNull, and } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import type { OrderStatus } from "@workspace/db/schema";
import { buildWhatsAppMessage, sendWhatsAppMessage, sendSmsMessage } from "../lib/whatsapp";
import { hashPassword } from "../lib/auth";

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

  res.json({
    order: full,
    whatsappSent: waResult.success,
    smsSent,
    whatsappMessage: whatsappMsg,
  });
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

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone already registered" });
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
    const conflict = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (conflict.length > 0 && conflict[0].id !== id) {
      res.status(409).json({ error: "Phone already in use by another account" });
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

export default router;
