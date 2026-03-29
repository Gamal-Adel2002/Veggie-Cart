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

  const { guestToken: _hidden, ...safeOrder } = order;
  return { ...safeOrder, items, deliveryPerson };
}

// Authenticated users get their own order list
router.get("/", authenticate(), async (req: AuthRequest, res) => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));

  const fullOrders = await Promise.all(orders.map((o) => getFullOrder(o.id)));
  res.json(fullOrders.filter(Boolean));
});

// Accepts orders from both guests (no token) and authenticated users
router.post("/", authenticate(false), async (req: AuthRequest, res) => {
  const { customerName, customerPhone, deliveryAddress, latitude, longitude, notes, items } =
    req.body;

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "customerName, customerPhone, and items are required" });
    return;
  }

  // Validate item fields and aggregate quantities by productId
  const aggregatedQtys = new Map<number, number>();
  for (const item of items) {
    const productId = parseInt(String(item.productId));
    const quantity = Number(item.quantity);

    if (!Number.isFinite(productId) || productId <= 0) {
      res.status(400).json({ error: "Invalid productId in items" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: `Quantity must be a positive number (got ${item.quantity})` });
      return;
    }

    aggregatedQtys.set(productId, (aggregatedQtys.get(productId) ?? 0) + quantity);
  }

  // Fetch all products and check stock (using aggregated quantities)
  const productCache = new Map<number, typeof productsTable.$inferSelect>();
  for (const [productId, totalQty] of aggregatedQtys.entries()) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);
    if (!product) {
      res.status(400).json({ error: `Product ${productId} not found` });
      return;
    }

    // Stock check against the aggregated total requested quantity
    if (product.quantity !== null && product.quantity !== undefined) {
      if (product.quantity < totalQty) {
        res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.quantity} ${product.unit}, requested: ${totalQty} ${product.unit}`,
        });
        return;
      }
    }

    productCache.set(productId, product);
  }

  // Build enriched items (all validation passed)
  let totalPrice = 0;
  const enrichedItems: Array<{
    productId: number;
    productName: string;
    productNameAr: string;
    quantity: number;
    unit: string;
    price: number;
    subtotal: number;
  }> = [];
  for (const item of items) {
    const productId = parseInt(String(item.productId));
    const quantity = Number(item.quantity);
    const product = productCache.get(productId)!;
    const subtotal = product.price * quantity;
    totalPrice += subtotal;
    enrichedItems.push({
      productId: product.id,
      productName: product.name,
      productNameAr: product.nameAr,
      quantity,
      unit: product.unit,
      price: product.price,
      subtotal,
    });
  }

  // Insert order + items + deduct stock atomically
  let orderId: number;
  await db.transaction(async (tx) => {
    const [order] = await tx
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

    orderId = order.id;

    for (const item of enrichedItems) {
      await tx.insert(orderItemsTable).values({ ...item, orderId: order.id });
    }

    // Deduct aggregated quantities from stock within the same transaction
    for (const [productId, totalQty] of aggregatedQtys.entries()) {
      const product = productCache.get(productId)!;
      if (product.quantity !== null && product.quantity !== undefined) {
        const newQty = Math.max(0, product.quantity - totalQty);
        await tx
          .update(productsTable)
          .set({ quantity: newQty, inStock: newQty > 0 })
          .where(eq(productsTable.id, productId));
      }
    }
  });

  const full = await getFullOrder(orderId!);
  res.status(201).json(full);
});

// View a specific order: requires auth (owner or admin)
router.get("/:id", authenticate(), async (req: AuthRequest, res) => {
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
  const isOwner = "userId" in order && order.userId !== null && order.userId === req.userId;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(order);
});

export default router;
