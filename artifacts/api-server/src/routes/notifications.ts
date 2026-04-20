import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, usersTable, fcmTokensTable } from "@workspace/db/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { authenticate, sseQueryToken, type AuthRequest } from "../middlewares/authenticate";
import webpush from "web-push";
import type { Response } from "express";
import pino from "pino";
import admin from "firebase-admin";

const logger = pino({ level: "info" });
const router = Router();

// ─── Firebase Admin (FCM) ────────────────────────────────────────────────────
let fcmApp: admin.app.App | null = null;

function initFirebaseAdmin() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    logger.warn("FIREBASE_SERVICE_ACCOUNT_KEY not set — FCM disabled (mobile push will not work).");
    return;
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    fcmApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    logger.info("Firebase Admin initialized — FCM enabled.");
  } catch (err) {
    logger.error({ err }, "Failed to initialize Firebase Admin — check FIREBASE_SERVICE_ACCOUNT_KEY format.");
  }
}

initFirebaseAdmin();

/** Send an FCM notification to a single device token */
async function sendFcm(token: string, payload: { title: string; body: string }) {
  if (!fcmApp) return;
  try {
    await admin.messaging(fcmApp).send({
      token,
      notification: { title: payload.title, body: payload.body },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
  } catch (err) {
    logger.warn({ err, token: token.slice(0, 20) }, "FCM send failed");
  }
}

/** Send FCM to multiple tokens (fire-and-forget) */
async function sendFcmMulti(tokens: string[], payload: { title: string; body: string }) {
  if (!fcmApp || tokens.length === 0) return;
  await Promise.allSettled(tokens.map((t) => sendFcm(t, payload)));
}

// ─── FCM token DB helpers ─────────────────────────────────────────────────────

/** Upsert (insert or update) an FCM token for a user+device. */
async function dbSaveFcmToken(userId: number, role: string, token: string, deviceId?: string) {
  const existing = await db.select({ id: fcmTokensTable.id })
    .from(fcmTokensTable)
    .where(deviceId
      ? and(eq(fcmTokensTable.userId, userId), eq(fcmTokensTable.deviceId, deviceId))
      : and(eq(fcmTokensTable.userId, userId), eq(fcmTokensTable.role, role)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(fcmTokensTable)
      .set({ token, role, updatedAt: new Date() })
      .where(eq(fcmTokensTable.id, existing[0].id));
  } else {
    await db.insert(fcmTokensTable).values({ userId, role, token, deviceId: deviceId ?? null });
  }
}

/** Delete all FCM tokens for a user (used on logout). */
async function dbDeleteFcmToken(userId: number) {
  await db.delete(fcmTokensTable).where(eq(fcmTokensTable.userId, userId));
}

/** Fetch all FCM tokens for a given role. */
async function dbGetFcmTokensByRole(role: string): Promise<string[]> {
  const rows = await db.select({ token: fcmTokensTable.token })
    .from(fcmTokensTable).where(eq(fcmTokensTable.role, role));
  return rows.map((r) => r.token);
}

/** Fetch FCM tokens for a specific user. */
async function dbGetFcmTokensByUser(userId: number): Promise<string[]> {
  const rows = await db.select({ token: fcmTokensTable.token })
    .from(fcmTokensTable).where(eq(fcmTokensTable.userId, userId));
  return rows.map((r) => r.token);
}

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

// Per-thread activity tracking: key = `${userId}:${customerId}` (admin or customer)
// Value = set of SSE clientIds currently "watching" that thread
const threadActiveClients = new Map<string, Set<string>>();

function threadKey(userId: number, customerId: number): string {
  return `${userId}:${customerId}`;
}

export function setThreadActive(userId: number, customerId: number, clientId: string) {
  const key = threadKey(userId, customerId);
  if (!threadActiveClients.has(key)) threadActiveClients.set(key, new Set());
  threadActiveClients.get(key)!.add(clientId);
}

export function clearThreadActive(userId: number, customerId: number, clientId: string) {
  const key = threadKey(userId, customerId);
  const clients = threadActiveClients.get(key);
  if (clients) {
    clients.delete(clientId);
    if (clients.size === 0) threadActiveClients.delete(key);
  }
}

/** Returns true if any connected client for userId is actively viewing the thread for customerId */
export function isUserViewingThread(userId: number, customerId: number): boolean {
  const key = threadKey(userId, customerId);
  const clients = threadActiveClients.get(key);
  if (!clients || clients.size === 0) return false;
  // Only count if the SSE client is still connected
  for (const clientId of clients) {
    if (sseClients.has(clientId)) return true;
  }
  return false;
}

/** Returns true if any admin is actively viewing the private thread for customerId */
export function isAnyAdminViewingThread(customerId: number): boolean {
  for (const [key, clients] of threadActiveClients) {
    if (!key.endsWith(`:${customerId}`)) continue;
    // Check every client ID in the watching set — not just first admin found for the user
    for (const clientId of clients) {
      const client = sseClients.get(clientId);
      if (client && client.role === "admin") return true;
    }
  }
  return false;
}

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

/**
 * Broadcast to a specific user by userId AND optionally restrict to a specific role.
 * This prevents delivery-role SSE clients (which share userId namespace with other users)
 * from receiving messages intended for customers.
 */
export function broadcastToUser(userId: number, event: string, data: unknown, role?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    if (client.userId !== userId) continue;
    if (role && client.role !== role) continue;
    try { client.res.write(payload); } catch {}
  }
}

export function broadcastToAll(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    try { client.res.write(payload); } catch {}
  }
}

/** Broadcast to customers and anonymous visitors (public data events) */
export function broadcastToCustomers(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    if (client.role === "customer" || client.role === "anonymous") {
      try { client.res.write(payload); } catch {}
    }
  }
}

export function isUserConnected(userId: number): boolean {
  for (const client of sseClients.values()) {
    if (client.userId === userId) return true;
  }
  return false;
}

export function isAnyAdminConnected(): boolean {
  for (const client of sseClients.values()) {
    if (client.role === "admin") return true;
  }
  return false;
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
  // Web push via VAPID
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

  // Mobile push via FCM (DB-backed token store)
  const adminFcmTokens = await dbGetFcmTokensByRole("admin");
  await sendFcmMulti(adminFcmTokens, { title: payload.title, body: payload.body });
}

export async function sendPushToDeliveryPerson(deliveryPersonId: number, payload: {
  title: string; titleAr: string;
  body: string; bodyAr: string;
  url?: string;
}) {
  // Web push
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

  // Mobile FCM (DB-backed)
  const deliveryTokens = await dbGetFcmTokensByUser(deliveryPersonId);
  await sendFcmMulti(deliveryTokens, { title: payload.title, body: payload.body });
}

export async function sendPushToCustomer(userId: number, payload: {
  title: string; titleAr: string;
  body: string; bodyAr: string;
  url?: string;
}) {
  // Web push
  const subs = await db
    .select({
      id: pushSubscriptionsTable.id,
      endpoint: pushSubscriptionsTable.endpoint,
      keys: pushSubscriptionsTable.keys,
    })
    .from(pushSubscriptionsTable)
    .innerJoin(usersTable, eq(pushSubscriptionsTable.userId, usersTable.id))
    .where(
      and(
        eq(pushSubscriptionsTable.userId, userId),
        isNull(pushSubscriptionsTable.deliveryPersonId),
        eq(usersTable.role, "customer")
      )
    );
  await sendPushToSubs(subs, payload);

  // Mobile FCM (DB-backed)
  const customerTokens = await dbGetFcmTokensByUser(userId);
  await sendFcmMulti(customerTokens, { title: payload.title, body: payload.body });
}

// POST /notifications/fcm-token — register a mobile FCM device token (DB-backed)
router.post("/fcm-token", authenticate(false), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { token, deviceId } = req.body as { token?: string; deviceId?: string };
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  try {
    await dbSaveFcmToken(req.userId, req.userRole ?? "customer", token, deviceId);
    logger.info({ userId: req.userId, role: req.userRole }, "FCM token registered in DB");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to save FCM token to DB");
    res.status(500).json({ error: "Failed to save token" });
  }
});

// DELETE /notifications/fcm-token — remove FCM device token on logout (DB-backed)
router.delete("/fcm-token", authenticate(false), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await dbDeleteFcmToken(req.userId);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete FCM token from DB");
    res.status(500).json({ error: "Failed to delete token" });
  }
});

// GET /notifications/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// GET /notifications/stream — SSE endpoint
// Authentication via httpOnly cookies (token or delivery_token) sent automatically
// by EventSource with withCredentials: true. No bearer token in query string.
// Optional ?watchThread=<customerId> signals active-thread presence for push suppression.
// Anonymous connections (no cookie) receive public broadcasts only (product_updated, store_status_changed).
// sseQueryToken is scoped here only — it promotes ?token= to Authorization header
// for EventSource clients that cannot set headers. Not applied globally.
router.get("/stream", sseQueryToken, authenticate(false), (req: AuthRequest, res) => {
  // Allow anonymous connections — they only receive public broadcasts
  const userId = req.userId ?? 0;
  const role = req.userRole ?? "anonymous";

  const clientId = `${userId}-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const watchThreadId = parseInt(String(req.query.watchThread || "")) || null;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`:connected\n\n`);

  const client: SseClient = {
    id: clientId,
    userId,
    role,
    res,
  };
  sseClients.set(clientId, client);

  // Register thread-active presence if client is watching a specific thread (auth-only)
  if (watchThreadId && req.userId) {
    setThreadActive(req.userId, watchThreadId, clientId);
  }

  const heartbeat = setInterval(() => {
    try { res.write(`:heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
    // Clean up thread-active presence (auth-only)
    if (watchThreadId && req.userId) {
      clearThreadActive(req.userId, watchThreadId, clientId);
    }
  });
});

// POST /notifications/subscribe — save a push subscription (admin and delivery only)
router.post("/subscribe", authenticate(false), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = req.userRole;

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
