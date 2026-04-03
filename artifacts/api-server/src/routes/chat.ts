import { Router } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable, chatReactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and, isNull, asc } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import {
  broadcastToAdmins,
  broadcastToUser,
  broadcastToAll,
  isUserViewingThread,
  isAnyAdminViewingThread,
  sendPushToCustomer,
  sendPushToAdmins,
} from "./notifications";

const router = Router();

type RawMsg = typeof chatMessagesTable.$inferSelect;
type Enriched = RawMsg & { reactions: { emoji: string; count: number; userIds: number[] }[] };

async function enrichMessages(messages: RawMsg[]): Promise<Enriched[]> {
  if (messages.length === 0) return [];
  const msgIds = new Set(messages.map((m) => m.id));
  const allReactions = await db.select().from(chatReactionsTable);
  const filtered = allReactions.filter((r) => msgIds.has(r.messageId));

  const byMsg = new Map<number, { emoji: string; userId: number }[]>();
  for (const r of filtered) {
    if (!byMsg.has(r.messageId)) byMsg.set(r.messageId, []);
    byMsg.get(r.messageId)!.push({ emoji: r.emoji, userId: r.userId });
  }

  return messages.map((m) => {
    const raw = byMsg.get(m.id) || [];
    const emojiMap = new Map<string, number[]>();
    for (const r of raw) {
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
      emojiMap.get(r.emoji)!.push(r.userId);
    }
    const reactions = Array.from(emojiMap.entries()).map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      userIds,
    }));
    return { ...m, reactions };
  });
}

/** Attach empty reactions array to private messages (no reactions on private channel) */
function asEnriched(msgs: RawMsg[]): Enriched[] {
  return msgs.map((m) => ({ ...m, reactions: [] }));
}

// ── Public Chat ───────────────────────────────────────────────────────────────

router.get("/public", authenticate(false), async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);
  const offset = Math.max(parseInt(String(req.query.offset || "0")) || 0, 0);
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.channel, "public"))
    .orderBy(asc(chatMessagesTable.createdAt))
    .limit(limit)
    .offset(offset);
  const enriched = await enrichMessages(messages);
  res.json(enriched);
});

router.post("/public", authenticate(), async (req: AuthRequest, res) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const { content, mediaUrl, mediaType } = req.body;
  if (!content && !mediaUrl) { res.status(400).json({ error: "content or mediaUrl is required" }); return; }

  const [msg] = await db.insert(chatMessagesTable).values({
    channel: "public",
    senderId: req.userId!,
    senderRole: "admin",
    recipientId: null,
    content: content ? String(content) : null,
    mediaUrl: mediaUrl ? String(mediaUrl) : null,
    mediaType: mediaType ? String(mediaType) : null,
  }).returning();

  const [enriched] = await enrichMessages([msg]);
  broadcastToAll("public_chat_message", enriched);
  res.status(201).json(enriched);
});

router.post("/public/:id/react", authenticate(), async (req: AuthRequest, res) => {
  // Only admins and customers can react; delivery role is excluded
  if (req.userRole === "delivery") { res.status(403).json({ error: "Forbidden" }); return; }

  const msgId = parseInt(String(req.params.id));
  if (isNaN(msgId) || msgId <= 0) { res.status(400).json({ error: "Invalid message ID" }); return; }
  const { emoji } = req.body;
  if (!emoji || typeof emoji !== "string") { res.status(400).json({ error: "emoji is required" }); return; }

  const [msg] = await db.select().from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.id, msgId), eq(chatMessagesTable.channel, "public")))
    .limit(1);
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  const [existing] = await db.select().from(chatReactionsTable)
    .where(and(eq(chatReactionsTable.messageId, msgId), eq(chatReactionsTable.userId, req.userId!)))
    .limit(1);

  if (existing) {
    if (existing.emoji === emoji) {
      await db.delete(chatReactionsTable).where(eq(chatReactionsTable.id, existing.id));
    } else {
      await db.update(chatReactionsTable).set({ emoji }).where(eq(chatReactionsTable.id, existing.id));
    }
  } else {
    await db.insert(chatReactionsTable).values({ messageId: msgId, userId: req.userId!, emoji });
  }

  const [enriched] = await enrichMessages([msg]);
  broadcastToAll("public_chat_reaction", { messageId: msgId, message: enriched });
  res.json(enriched);
});

// ── Private Chat ──────────────────────────────────────────────────────────────
// Only admins and customers (role === "admin" | "customer") may access private routes.
// Delivery persons are explicitly blocked.

function requireChatRole(req: AuthRequest, res: { status: (n: number) => { json: (o: object) => void } }): boolean {
  if (req.userRole !== "admin" && req.userRole !== "customer") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/private", authenticate(), async (req: AuthRequest, res) => {
  if (!requireChatRole(req, res)) return;

  if (req.userRole === "admin") {
    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.channel, "private"))
      .orderBy(desc(chatMessagesTable.createdAt));

    const customerMap = new Map<number, { lastMessage: RawMsg; unreadCount: number }>();
    for (const msg of messages) {
      const customerId = msg.senderRole === "customer" ? msg.senderId : msg.recipientId;
      if (!customerId) continue;
      if (!customerMap.has(customerId)) {
        const unread = messages.filter(
          (m) => m.senderRole === "customer" && m.senderId === customerId && m.readAt === null
        ).length;
        customerMap.set(customerId, { lastMessage: msg, unreadCount: unread });
      }
    }

    const result = [];
    for (const [cId, conv] of customerMap) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, cId)).limit(1);
      if (user) {
        result.push({
          customerId: cId,
          customerName: user.name,
          customerPhone: user.phone,
          customerImage: user.profileImage,
          lastMessage: { ...conv.lastMessage, reactions: [] },
          unreadCount: conv.unreadCount,
        });
      }
    }
    res.json(result);
  } else {
    // Customer: only sees their own thread summary
    const myId = req.userId!;
    const allMessages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.channel, "private"))
      .orderBy(desc(chatMessagesTable.createdAt));
    const myMessages = allMessages.filter((m) => m.senderId === myId || m.recipientId === myId);
    const unreadCount = myMessages.filter(
      (m) => m.senderRole === "admin" && m.recipientId === myId && m.readAt === null
    ).length;
    const lastMessage = myMessages.length > 0 ? { ...myMessages[0], reactions: [] } : null;
    res.json({ customerId: myId, unreadCount, lastMessage });
  }
});

router.get("/private/:customerId", authenticate(), async (req: AuthRequest, res) => {
  if (!requireChatRole(req, res)) return;

  const customerId = parseInt(String(req.params.customerId));
  if (isNaN(customerId) || customerId <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }

  // Admin can see any thread; customer can only see their own
  if (req.userRole !== "admin" && req.userId !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }

  const allMessages = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.channel, "private"))
    .orderBy(asc(chatMessagesTable.createdAt));

  const thread = allMessages.filter(
    (m) => m.senderId === customerId || m.recipientId === customerId
  );
  res.json(asEnriched(thread));
});

router.post("/private/:customerId", authenticate(), async (req: AuthRequest, res) => {
  if (!requireChatRole(req, res)) return;

  const customerId = parseInt(String(req.params.customerId));
  if (isNaN(customerId) || customerId <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }
  if (req.userRole !== "admin" && req.userId !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { content, mediaUrl, mediaType } = req.body;
  if (!content && !mediaUrl) { res.status(400).json({ error: "content or mediaUrl is required" }); return; }

  const isAdmin = req.userRole === "admin";
  const [msg] = await db.insert(chatMessagesTable).values({
    channel: "private",
    senderId: req.userId!,
    senderRole: isAdmin ? "admin" : "customer",
    recipientId: isAdmin ? customerId : null,
    content: content ? String(content) : null,
    mediaUrl: mediaUrl ? String(mediaUrl) : null,
    mediaType: mediaType ? String(mediaType) : null,
  }).returning();

  const enrichedMsg = { ...msg, reactions: [] };

  broadcastToAdmins("private_chat_message", enrichedMsg);
  broadcastToUser(customerId, "private_chat_message", enrichedMsg);

  // Push notification: only if recipient is NOT actively viewing this thread
  if (isAdmin) {
    // Notify customer only if they are not currently viewing this thread
    if (!isUserViewingThread(customerId, customerId)) {
      sendPushToCustomer(customerId, {
        title: "New Message",
        titleAr: "رسالة جديدة",
        body: content ? String(content).slice(0, 80) : "New attachment",
        bodyAr: content ? String(content).slice(0, 80) : "مرفق جديد",
        url: "/messages",
      }).catch(() => {});
    }
  } else {
    // Notify admins only if no admin is currently viewing this customer's thread
    if (!isAnyAdminViewingThread(customerId)) {
      sendPushToAdmins({
        title: "New Customer Message",
        titleAr: "رسالة عميل جديدة",
        body: content ? String(content).slice(0, 80) : "New attachment",
        bodyAr: content ? String(content).slice(0, 80) : "مرفق جديد",
        url: "/admin/private-chats",
      }).catch(() => {});
    }
  }

  res.status(201).json(enrichedMsg);
});

router.put("/private/:customerId/read", authenticate(), async (req: AuthRequest, res) => {
  if (!requireChatRole(req, res)) return;

  const customerId = parseInt(String(req.params.customerId));
  if (isNaN(customerId) || customerId <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }
  if (req.userRole !== "admin" && req.userId !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const unread = await db.select().from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.channel, "private"), isNull(chatMessagesTable.readAt)));

  if (req.userRole === "admin") {
    const toMark = unread.filter((m) => m.senderRole === "customer" && m.senderId === customerId);
    for (const m of toMark) {
      await db.update(chatMessagesTable).set({ readAt: now }).where(eq(chatMessagesTable.id, m.id));
    }
    broadcastToUser(customerId, "chat_read_receipt", { readBy: "admin", customerId, readAt: now });
  } else {
    const toMark = unread.filter((m) => m.senderRole === "admin" && m.recipientId === req.userId);
    for (const m of toMark) {
      await db.update(chatMessagesTable).set({ readAt: now }).where(eq(chatMessagesTable.id, m.id));
    }
    broadcastToAdmins("chat_read_receipt", { readBy: "customer", customerId: req.userId, readAt: now });
  }

  res.json({ success: true, readAt: now });
});

router.post("/private/:customerId/typing", authenticate(), async (req: AuthRequest, res) => {
  if (!requireChatRole(req, res)) return;

  const customerId = parseInt(String(req.params.customerId));
  if (isNaN(customerId) || customerId <= 0) { res.status(400).json({ error: "Invalid customer ID" }); return; }
  if (req.userRole !== "admin" && req.userId !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }

  const ev = { customerId, typingRole: req.userRole, typingUserId: req.userId };
  if (req.userRole === "admin") {
    broadcastToUser(customerId, "chat_typing", ev);
  } else {
    broadcastToAdmins("chat_typing", ev);
  }
  res.json({ success: true });
});

export default router;
