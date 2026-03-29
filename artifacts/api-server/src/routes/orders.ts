import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  deliveryPersonsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

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

router.get("/", authenticate(), async (req: AuthRequest, res) => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));

  const fullOrders = await Promise.all(orders.map((o) => getFullOrder(o.id)));
  res.json(fullOrders.filter(Boolean));
});

router.post("/", authenticate(false), async (req: AuthRequest, res) => {
  const { customerName, customerPhone, deliveryAddress, latitude, longitude, notes, items } =
    req.body;

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "customerName, customerPhone, and items are required" });
    return;
  }

  let totalPrice = 0;
  const enrichedItems = [];
  for (const item of items) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, item.productId))
      .limit(1);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const subtotal = product.price * Number(item.quantity);
    totalPrice += subtotal;
    enrichedItems.push({
      productId: product.id,
      productName: product.name,
      productNameAr: product.nameAr,
      quantity: Number(item.quantity),
      unit: product.unit,
      price: product.price,
      subtotal,
    });
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: req.userId || null,
      customerName,
      customerPhone,
      deliveryAddress: deliveryAddress || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      notes: notes || null,
      status: "waiting",
      totalPrice,
    })
    .returning();

  for (const item of enrichedItems) {
    await db.insert(orderItemsTable).values({ ...item, orderId: order.id });
  }

  const full = await getFullOrder(order.id);
  res.status(201).json(full);
});

router.get("/:id", authenticate(false), async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const order = await getFullOrder(id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const isAdmin = req.userRole === "admin";
  const isOwner = order.userId !== null && order.userId === req.userId;
  const isGuestOrder = order.userId === null;
  if (!isAdmin && !isOwner && !isGuestOrder) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(order);
});

export default router;
