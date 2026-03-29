import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, usersTable } from "@workspace/db/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import webpush from "web-push";
import type { Response } from "express";
import pino from "pino";

const logger = pino({ level: "info" });
const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@freshveggies.app";

const vapidReady = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (vapidReady) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  logger.warn("VAPID keys not fully configured — Web Push notifications will be disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
}

// SSE client registry
interface SseClient {
  id: string;
  userId: number;
  role: string;
  res: Response;
}

const sseClients = new Map<string, SseClient>();

export function broadcastToAdmins(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    if (client.role === "admin") {
      try { client.res.write(payload); } catch {}
    }
  }
}

export function broadcastToDeliveryPerson(deliveryPersonId: number, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    if (client.role === "delivery" && client.userId === deliveryPersonId) {
      try { client.res.write(payload); } catch {}
    }
  }
}

async function sendPushToSubs(
  subs: Array<{ id: number; endpoint: string; keys: string }>,
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidReady) {
    logger.warn("Skipping push send — VAPID keys not configured.");
    return;
  }
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: JSON.parse(sub.keys) as { auth: string; p256dh: string },
        };
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
          logger.info(`Removed expired push subscription id=${sub.id}`);
        } else {
          logger.warn({ err }, `Push send failed for subscription id=${sub.id}`);
        }
      }
    })
  );
}

export async function sendPushToAdmins(payload: { title: string; body: string; url?: string }) {
  // Join push_subscriptions with users to ensure only admin-role users receive admin push
  const adminSubs = await db
    .select({
      id: pushSubscriptionsTable.id,
      endpoint: pushSubscriptionsTable.endpoint,
      keys: pushSubscriptionsTable.keys,
    })
    .from(pushSubscriptionsTable)
    .innerJoin(usersTable, eq(pushSubscriptionsTable.userId, usersTable.id))
    .where(
      and(
        isNotNull(pushSubscriptionsTable.userId),
        isNull(pushSubscriptionsTable.deliveryPersonId),
        eq(usersTable.role, "admin")
      )
    );

  await sendPushToSubs(adminSubs, payload);
}

export async function sendPushToDeliveryPerson(deliveryPersonId: number, payload: { title: string; body: string; url?: string }) {
  const subs = await db
    .select({
      id: pushSubscriptionsTable.id,
      endpoint: pushSubscriptionsTable.endpoint,
      keys: pushSubscriptionsTable.keys,
    })
    .from(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.deliveryPersonId, deliveryPersonId),
        isNull(pushSubscriptionsTable.userId)
      )
    );

  await sendPushToSubs(subs, payload);
}

// GET /notifications/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// GET /notifications/stream — SSE endpoint
// EventSource doesn't support Authorization header, so we also accept ?auth=<token>
router.get("/stream", (req: AuthRequest, res, next) => {
  const queryToken = req.query.auth as string | undefined;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  next();
}, authenticate(false), (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const clientId = `${req.userId}-${req.userRole}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`:connected\n\n`);

  const client: SseClient = {
    id: clientId,
    userId: req.userId,
    role: req.userRole || "customer",
    res,
  };
  sseClients.set(clientId, client);

  const heartbeat = setInterval(() => {
    try { res.write(`:heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// POST /notifications/subscribe — save a push subscription
// Only admin and delivery roles can subscribe (enforced by checking role)
router.post("/subscribe", authenticate(false), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = req.userRole;
  if (role !== "admin" && role !== "delivery") {
    res.status(403).json({ error: "Only admin and delivery users can subscribe to push notifications" });
    return;
  }

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
    res.status(400).json({ error: "endpoint and keys (auth, p256dh) are required" });
    return;
  }

  const isDelivery = role === "delivery";

  // Upsert by endpoint: delete the old row for this specific endpoint (if any), then insert
  // This supports multi-device: each device/browser gets its own subscription row
  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));

  await db.insert(pushSubscriptionsTable).values({
    userId: isDelivery ? null : req.userId,
    deliveryPersonId: isDelivery ? req.userId : null,
    endpoint,
    keys: JSON.stringify(keys),
  });

  res.json({ success: true });
});

// DELETE /notifications/unsubscribe — remove all subscriptions for the current user
router.delete("/unsubscribe", authenticate(false), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const isDelivery = req.userRole === "delivery";
  await db
    .delete(pushSubscriptionsTable)
    .where(
      isDelivery
        ? and(eq(pushSubscriptionsTable.deliveryPersonId, req.userId), isNull(pushSubscriptionsTable.userId))
        : and(eq(pushSubscriptionsTable.userId, req.userId), isNull(pushSubscriptionsTable.deliveryPersonId))
    );

  res.json({ success: true });
});

export default router;
