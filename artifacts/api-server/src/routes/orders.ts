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
import { randomBytes } from "crypto";

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

  // For guest orders (no authenticated user), generate a secure random token
  // so only someone with the token can later look up the order
  const guestToken = req.userId ? null : randomBytes(32).toString("hex");

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: req.userId || null,
      guestToken,
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
  // Include guestToken in response so the guest can track their order
  res.status(201).json({ ...full, guestToken });
});

// Authenticated users look up by order ID
// Guest users look up by order ID + guestToken query param
router.get("/:id", authenticate(false), async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const order = await getFullOrder(id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const isAdmin = req.userRole === "admin";
  const isOwner = order.userId !== null && order.userId === req.userId;

  // Guest order tracking: requires the guestToken that was returned at order creation
  const providedToken = req.query.token as string | undefined;
  const isValidGuestAccess =
    order.userId === null &&
    order.guestToken !== null &&
    order.guestToken !== "" &&
    providedToken !== undefined &&
    providedToken === order.guestToken;

  if (!isAdmin && !isOwner && !isValidGuestAccess) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Never expose the guestToken in the response body after initial creation
  const { guestToken: _hidden, ...safeOrder } = order;
  res.json(safeOrder);
});

export default router;
