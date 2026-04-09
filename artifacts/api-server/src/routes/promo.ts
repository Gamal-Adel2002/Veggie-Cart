import { Router } from "express";
import { db } from "@workspace/db";
import { promoCodesTable } from "@workspace/db/schema";
import { eq, and, lte, isNull, isNotNull, desc } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import { isValidEgyptianPhone, INVALID_PHONE_MSG } from "../lib/validation";
import pino from "pino";

const logger = pino({ level: "info" });

const router = Router();

// ── Admin CRUD ────────────────────────────────────────────────────────────────

router.get("/admin/promo-codes", authenticate(), requireAdmin, async (_req, res) => {
  const promos = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt));
  res.json(promos);
});

function randomPromoCode(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.post("/admin/promo-codes", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { code, discountType, discountValue, maxUses, active, validFrom, validUntil } = req.body;

  if (!discountType || !["percentage", "amount"].includes(discountType)) {
    res.status(400).json({ error: "discountType must be 'percentage' or 'amount'" });
    return;
  }
  const val = Number(discountValue);
  if (!Number.isFinite(val) || val <= 0) {
    res.status(400).json({ error: "discountValue must be a positive number" });
    return;
  }
  if (discountType === "percentage" && val > 100) {
    res.status(400).json({ error: "percentage discount cannot exceed 100" });
    return;
  }

  const finalCode = (typeof code === "string" && code.trim()) ? code.trim().toUpperCase() : randomPromoCode(8);

  // Check uniqueness
  const existing = await db.select({ id: promoCodesTable.id }).from(promoCodesTable).where(eq(promoCodesTable.code, finalCode)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Promo code already exists" });
    return;
  }

  const [promo] = await db
    .insert(promoCodesTable)
    .values({
      code: finalCode,
      discountType,
      discountValue: val,
      maxUses: maxUses != null ? Number(maxUses) : null,
      active: active !== false,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
    })
    .returning();

  res.status(201).json(promo);
});

router.put("/admin/promo-codes/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid promo ID" }); return; }

  const [existing] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Promo code not found" }); return; }

  const updates: Record<string, unknown> = {};

  if (req.body.code != null) {
    const newCode = String(req.body.code).trim().toUpperCase();
    if (!newCode) { res.status(400).json({ error: "code cannot be empty" }); return; }
    const conflict = await db.select({ id: promoCodesTable.id }).from(promoCodesTable).where(eq(promoCodesTable.code, newCode)).limit(1);
    if (conflict.length > 0 && conflict[0].id !== id) { res.status(409).json({ error: "Promo code already exists" }); return; }
    updates.code = newCode;
  }
  if (req.body.discountType != null) {
    if (!["percentage", "amount"].includes(req.body.discountType)) { res.status(400).json({ error: "discountType must be 'percentage' or 'amount'" }); return; }
    updates.discountType = req.body.discountType;
  }
  if (req.body.discountValue != null) {
    const val = Number(req.body.discountValue);
    if (!Number.isFinite(val) || val <= 0) { res.status(400).json({ error: "discountValue must be positive" }); return; }
    if (req.body.discountType === "percentage" && val > 100) { res.status(400).json({ error: "percentage discount cannot exceed 100" }); return; }
    updates.discountValue = val;
  }
  if (req.body.maxUses != null) updates.maxUses = req.body.maxUses === null ? null : Number(req.body.maxUses);
  if (req.body.active != null) updates.active = req.body.active === true || req.body.active === "true";
  if (req.body.validFrom != null) updates.validFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;
  if (req.body.validUntil != null) updates.validUntil = req.body.validUntil ? new Date(req.body.validUntil) : null;

  if (Object.keys(updates).length === 0) {
    res.json(existing);
    return;
  }

  const [updated] = await db.update(promoCodesTable).set(updates).where(eq(promoCodesTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/promo-codes/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid promo ID" }); return; }
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.status(204).end();
});

// ── Public validation ─────────────────────────────────────────────────────────

router.post("/promo/validate", async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, code.trim().toUpperCase())).limit(1);
  if (!promo) {
    res.json({ valid: false, message: "Invalid promo code" });
    return;
  }

  if (!promo.active) {
    res.json({ valid: false, message: "This promo code is no longer active" });
    return;
  }

  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    res.json({ valid: false, message: "This promo code is not yet active" });
    return;
  }
  if (promo.validUntil && now > promo.validUntil) {
    res.json({ valid: false, message: "This promo code has expired" });
    return;
  }

  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    res.json({ valid: false, message: "This promo code has reached its maximum uses" });
    return;
  }

  res.json({
    valid: true,
    id: promo.id,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
  });
});

export default router;
