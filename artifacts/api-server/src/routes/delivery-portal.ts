import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryPersonsTable, ordersTable, orderItemsTable, deliveryZonesTable } from "@workspace/db/schema";
import { eq, inArray, and, or } from "drizzle-orm";
import { authenticate, requireDelivery, type AuthRequest } from "../middlewares/authenticate";
import { comparePassword, generateToken } from "../lib/auth";
import { broadcastToAdmins, broadcastToUser, broadcastToDeliveryPerson } from "./notifications";

const router = Router();

// Active delivery statuses — shown on dashboard; completed preserved for history
const ACTIVE_STATUSES = ["accepted", "preparing", "with_delivery"] as const;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  res.cookie("delivery_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    secure: process.env.NODE_ENV === "production",
    path: "/api",
  });

  res.json({ token, person: safePerson });
});

// POST /delivery/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("delivery_token", { path: "/api" });
  res.json({ success: true });
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

// GET /delivery/orders — active orders assigned to this delivery person
// Statuses: accepted | preparing | with_delivery only
router.get("/orders", authenticate(), requireDelivery, async (req: AuthRequest, res) => {
  // Only active statuses — delivery person acts on these
  const activeFilters = ACTIVE_STATUSES.map(s => eq(ordersTable.status, s));

  const all = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.deliveryPersonId, req.userId!),
        or(...activeFilters)
      )
    );

  if (all.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = all.map(o => o.id);
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  // Fetch active zones for zone-name grouping
  const zones = await db
    .select()
    .from(deliveryZonesTable)
    .where(eq(deliveryZonesTable.active, true));

  const result = all.map(o => {
    const { guestToken: _gt, ...safe } = o;

    // Find which zone this order belongs to (by lat/lng proximity to zone center)
    let zoneName: string | null = null;
    let distanceFromZoneCentroid: number | null = null;
    if (o.latitude != null && o.longitude != null && zones.length > 0) {
      let closest: { name: string; dist: number } | null = null;
      for (const z of zones) {
        const dist = haversineKm(o.latitude, o.longitude, z.centerLat, z.centerLng);
        if (dist <= z.radiusKm) {
          if (!closest || dist < closest.dist) {
            closest = { name: z.name, dist };
          }
        }
      }
      if (closest) {
        zoneName = closest.name;
        distanceFromZoneCentroid = closest.dist;
      }
    }

    return { ...safe, items: itemsByOrder.get(o.id) || [], zoneName, distanceFromZoneCentroid };
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

  if (!ACTIVE_STATUSES.includes(order.status as typeof ACTIVE_STATUSES[number])) {
    res.status(400).json({ error: "Order is not in a completable state" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "completed" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Notify all relevant parties that order status changed
  setImmediate(() => {
    const payload = { orderId, status: "completed" };
    broadcastToAdmins("order_status_changed", payload);
    if (order.userId) {
      broadcastToUser(order.userId, "order_status_changed", payload, "customer");
    }
    if (order.deliveryPersonId) {
      broadcastToDeliveryPerson(order.deliveryPersonId, "order_status_changed", payload);
    }
  });

  const { guestToken: _gt, ...safe } = updated;
  res.json(safe);
});

export default router;
