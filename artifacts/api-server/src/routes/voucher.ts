import { Router } from "express";
import { db } from "@workspace/db";
import { vouchersTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

// ── Admin CRUD ────────────────────────────────────────────────────────────────

router.get("/admin/vouchers", authenticate(), requireAdmin, async (_req, res) => {
  const vouchers = await db.select().from(vouchersTable).orderBy(desc(vouchersTable.createdAt));

  const withUserDetails = await Promise.all(
    vouchers.map(async (v) => {
      let user = null;
      if (v.userId) {
        const [u] = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, v.userId)).limit(1);
        user = u || null;
      }
      return { ...v, user };
    })
  );

  res.json(withUserDetails);
});

router.post("/admin/vouchers", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { customerPhone, userId, amount, validDays } = req.body;

  if (!customerPhone && !userId) {
    res.status(400).json({ error: "customerPhone or userId is required" });
    return;
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    res.status(400).json({ error: "amount must be a positive number" });
    return;
  }
  const days = Number(validDays);
  if (!Number.isFinite(days) || days <= 0) {
    res.status(400).json({ error: "validDays must be a positive number" });
    return;
  }

  let resolvedUserId: number | null = null;
  let resolvedPhone: string | null = null;

  if (userId != null) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
    if (!u) { res.status(404).json({ error: "User not found" }); return; }
    resolvedUserId = u.id;
    resolvedPhone = u.phone;
  } else if (customerPhone) {
    resolvedPhone = String(customerPhone).trim();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.phone, resolvedPhone)).limit(1);
    if (u) resolvedUserId = u.id;
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + days);

  const [voucher] = await db
    .insert(vouchersTable)
    .values({
      userId: resolvedUserId,
      customerPhone: resolvedPhone,
      amount: amt,
      validUntil,
    })
    .returning();

  res.status(201).json(voucher);
});

// ── Customer-facing ───────────────────────────────────────────────────────────

router.get("/vouchers/my", authenticate(), async (req: AuthRequest, res) => {
  if (!req.userId) { res.json([]); return; }

  const vouchers = await db
    .select()
    .from(vouchersTable)
    .where(eq(vouchersTable.userId, req.userId!))
    .orderBy(desc(vouchersTable.createdAt));

  const now = new Date();
  const available = vouchers.filter(
    (v) => !v.used && v.validUntil > now
  );

  res.json(available);
});

router.post("/vouchers/preview", authenticate(), async (req: AuthRequest, res) => {
  const { voucherId } = req.body;
  if (!voucherId) { res.status(400).json({ error: "voucherId is required" }); return; }
  if (!req.userId) { res.json({ valid: false, message: "Not authenticated" }); return; }

  const [voucher] = await db.select().from(vouchersTable).where(eq(vouchersTable.id, Number(voucherId))).limit(1);
  if (!voucher) { res.json({ valid: false, message: "Voucher not found" }); return; }

  if (voucher.userId !== req.userId) {
    res.json({ valid: false, message: "This voucher is not assigned to you" });
    return;
  }
  if (voucher.used) {
    res.json({ valid: false, message: "This voucher has already been used" });
    return;
  }
  if (voucher.validUntil && new Date() > voucher.validUntil) {
    res.json({ valid: false, message: "This voucher has expired" });
    return;
  }

  res.json({
    valid: true,
    id: voucher.id,
    amount: voucher.amount,
    validUntil: voucher.validUntil,
  });
});

export default router;
