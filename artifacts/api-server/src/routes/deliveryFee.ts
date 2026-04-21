import { Router } from "express";
import { db } from "@workspace/db";
import { deliverySettingsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

// Public — get current delivery fee config
router.get("/delivery-fee", async (_req, res) => {
  const settings = await db.select().from(deliverySettingsTable).limit(1);
  if (settings.length === 0) {
    res.json({ feeType: "fixed", feeValue: 0, minimumFee: 0 });
    return;
  }
  res.json(settings[0]);
});

// Admin — upsert delivery fee settings
router.put("/admin/delivery-fee", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { feeType, feeValue, minimumFee } = req.body;

  if (!feeType || !["fixed", "percentage"].includes(feeType)) {
    res.status(400).json({ error: "feeType must be 'fixed' or 'percentage'" });
    return;
  }
  const val = Number(feeValue);
  const min = Number(minimumFee);
  if (!Number.isFinite(val) || val < 0) {
    res.status(400).json({ error: "feeValue must be a non-negative number" });
    return;
  }
  if (!Number.isFinite(min) || min < 0) {
    res.status(400).json({ error: "minimumFee must be a non-negative number" });
    return;
  }

  const existing = await db.select().from(deliverySettingsTable).limit(1);

  if (existing.length === 0) {
    const [row] = await db
      .insert(deliverySettingsTable)
      .values({ feeType, feeValue: val, minimumFee: min })
      .returning();
    res.status(201).json(row);
  } else {
    const [row] = await db
      .update(deliverySettingsTable)
      .set({ feeType, feeValue: val, minimumFee: min, updatedAt: new Date() })
      .where(eq(deliverySettingsTable.id, existing[0].id))
      .returning();
    res.json(row);
  }
});

export default router;
