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

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@freshveggies.app";

// Runtime VAPID state — populated either from env or auto-generated
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
let vapidReady = false;

function initVapid() {
  const privKey = process.env.VAPID_PRIVATE_KEY || "";
  if (VAPID_PUBLIC_KEY && privKey) {
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privKey);
      vapidReady = true;
      logger.info("VAPID keys loaded from environment — Web Push enabled.");
    } catch (err) {
      logger.error({ err }, "Failed to set VAPID details — check key format.");
    }
  } else {
    // Auto-generate a VAPID key pair for this session
    logger.warn("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — generating a temporary pair.");
    try {
      const keys = webpush.generateVAPIDKeys();
      VAPID_PUBLIC_KEY = keys.publicKey;
      webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
      vapidReady = true;
      logger.warn(
        `Generated temporary VAPID keys (session-only). ` +
        `To make push persistent, set VAPID_PUBLIC_KEY="${keys.publicKey}" ` +
        `and VAPID_PRIVATE_KEY (secret) in your Replit Secrets.`
      );
    } catch (err) {
      logger.error({ err }, "Failed to auto-generate VAPID keys — Web Push disabled.");
    }
  }
}

initVapid();

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
  payload: object
) {
  if (!vapidReady) {
    logger.warn("Skipping push send — VAPID not ready.");
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

export async function sendPushToAdmins(payload: {
  title: string; titleAr: string;
  body: string; bodyAr: string;
  url?: string;
}) {
  // Join push_subscriptions with users to enforce admin role — prevents data leakage to customers
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

export async function sendPushToDeliveryPerson(deliveryPersonId: number, payload: {
  title: string; titleAr: string;
  body: string; bodyAr: string;
  url?: string;
}) {
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
// Authentication via httpOnly cookies (token or delivery_token) sent automatically
// by EventSource with withCredentials: true. No bearer token in query string.
router.get("/stream", authenticate(false), (req: AuthRequest, res) => {
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

// POST /notifications/subscribe — save a push subscription (admin and delivery only)
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

  // Upsert by endpoint: supports multi-device (each device/browser has its own row)
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

// DELETE /notifications/unsubscribe — clear all subscriptions for the current user
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
