import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  deliveryPersonsTable,
  deliveryZonesTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import { broadcastToAdmins, sendPushToAdmins } from "./notifications";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  // Zone validation: fetch active zones; if zones exist, lat/lng are required and must be within a zone
  const activeZones = await db
    .select()
    .from(deliveryZonesTable)
    .where(eq(deliveryZonesTable.active, true));

  if (activeZones.length > 0) {
    if (latitude == null || longitude == null) {
      res.status(422).json({
        error: "LOCATION_REQUIRED",
        message: "A delivery location is required. Please pin your address on the map before placing an order.",
      });
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    const inZone = activeZones.some(
      (z) => haversineKm(lat, lng, z.centerLat, z.centerLng) <= z.radiusKm
    );
    if (!inZone) {
      res.status(422).json({
        error: "OUTSIDE_DELIVERY_ZONE",
        message: "Delivery is not available at your selected location. Please choose an address within our delivery area.",
      });
      return;
    }
  }

  // Pre-validate inputs and aggregate quantities by productId (no DB needed here)
  const aggregatedQtys = new Map<number, number>();
  const rawItems: Array<{ productId: number; quantity: number }> = [];

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
    rawItems.push({ productId, quantity });
  }

  // Perform everything inside a single serializable transaction with row locking
  let orderId: number;
  let stockError: string | null = null;

  try {
    await db.transaction(async (tx) => {
      const productCache = new Map<number, typeof productsTable.$inferSelect>();

      // Lock each product row, validate stock with current values (FOR UPDATE prevents concurrent oversell)
      for (const [productId, totalQty] of aggregatedQtys.entries()) {
        const [product] = await tx
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, productId))
          .for("update"); // Row-level lock acquired here

        if (!product) {
          stockError = `Product ${productId} not found`;
          tx.rollback();
          return;
        }

        // Check aggregate quantity against current (locked) stock
        if (product.quantity !== null && product.quantity !== undefined) {
          if (product.quantity < totalQty) {
            stockError = `Insufficient stock for "${product.name}". Available: ${product.quantity} ${product.unit}, requested: ${totalQty} ${product.unit}`;
            tx.rollback();
            return;
          }
        }

        productCache.set(productId, product);
      }

      // Build enriched order items
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

      for (const { productId, quantity } of rawItems) {
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

      // Insert order
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

      // Insert order items
      for (const item of enrichedItems) {
        await tx.insert(orderItemsTable).values({ ...item, orderId: order.id });
      }

      // Atomically deduct stock using SQL expression (avoids stale cache issues)
      for (const [productId, totalQty] of aggregatedQtys.entries()) {
        const product = productCache.get(productId)!;
        if (product.quantity !== null && product.quantity !== undefined) {
          // Atomic update: SET quantity = quantity - N, in_stock = (quantity - N) > 0
          await tx
            .update(productsTable)
            .set({
              quantity: sql<number>`${productsTable.quantity} - ${totalQty}`,
              inStock: sql<boolean>`(${productsTable.quantity} - ${totalQty}) > 0`,
            })
            .where(eq(productsTable.id, productId));
        }
      }
    });
  } catch (err: unknown) {
    // Transaction was rolled back - check if it's a stock error or a real DB error
    if (stockError) {
      res.status(400).json({ error: stockError });
      return;
    }
    // Re-throw unexpected errors
    throw err;
  }

  if (stockError) {
    res.status(400).json({ error: stockError });
    return;
  }

  const full = await getFullOrder(orderId!);

  // Notify admin(s) about new order (SSE + push) — fire and forget
  setImmediate(async () => {
    try {
      broadcastToAdmins("new_order", {
        orderId: orderId!,
        customerName: full?.customerName || customerName,
        totalPrice: full?.totalPrice || 0,
        url: `/admin/orders?orderId=${orderId}`,
      });
      await sendPushToAdmins({
        title: "FreshVeg — New Order",
        titleAr: "فريش فيج — طلب جديد",
        body: `${full?.customerName || customerName} · EGP ${(full?.totalPrice || 0).toFixed(2)}`,
        bodyAr: `${full?.customerName || customerName} · ${(full?.totalPrice || 0).toFixed(2)} ج.م`,
        url: `/admin/orders?orderId=${orderId}`,
      });
    } catch {}
  });

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
