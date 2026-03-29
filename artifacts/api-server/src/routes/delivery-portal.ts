import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryPersonsTable, ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authenticate, requireDelivery, type AuthRequest } from "../middlewares/authenticate";
import { hashPassword, comparePassword, generateToken } from "../lib/auth";

const router = Router();

// POST /delivery/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const [person] = await db
    .select()
    .from(deliveryPersonsTable)
    .where(eq(deliveryPersonsTable.username, username));

  if (!person || !person.password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, person.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!person.active) {
    res.status(403).json({ error: "Account is inactive" });
    return;
  }

  const token = generateToken({ userId: person.id, role: "delivery" });
  const { password: _pw, ...safePerson } = person;

  res.json({ token, person: safePerson });
});

// GET /delivery/me — return current delivery person info
router.get("/me", authenticate(), requireDelivery, async (req: AuthRequest, res) => {
  const [person] = await db
    .select()
    .from(deliveryPersonsTable)
    .where(eq(deliveryPersonsTable.id, req.userId!));

  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { password: _pw, ...safePerson } = person;
  res.json(safePerson);
});

// GET /delivery/orders — orders assigned to this delivery person that are 'with_delivery'
router.get("/orders", authenticate(), requireDelivery, async (req: AuthRequest, res) => {
  const assigned = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.deliveryPersonId, req.userId!));

  if (assigned.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = assigned.map(o => o.id);
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  const result = assigned.map(o => {
    const { guestToken: _gt, ...safe } = o;
    return { ...safe, items: itemsByOrder.get(o.id) || [] };
  });

  res.json(result);
});

// PUT /delivery/orders/:id/complete — mark order as completed
router.put("/orders/:id/complete", authenticate(), requireDelivery, async (req: AuthRequest, res) => {
  const orderId = parseInt(String(req.params.id));

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.deliveryPersonId !== req.userId) {
    res.status(403).json({ error: "This order is not assigned to you" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "completed" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  const { guestToken: _gt, ...safe } = updated;
  res.json(safe);
});

export default router;
