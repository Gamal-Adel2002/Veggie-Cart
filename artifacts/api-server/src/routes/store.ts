import { Router } from "express";
import { db } from "@workspace/db";
import { storeSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import { isStoreOpenNow } from "../lib/storeHours";

const router = Router();

// Public: get store status
router.get("/status", async (_req, res) => {
  const open = await isStoreOpenNow();
  return res.json({ open });
});

// Public: get store schedule settings (read-only for frontend UI)
router.get("/settings", async (_req, res) => {
  const settings = await db
    .select()
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.id, 1))
    .limit(1);
  if (!settings.length) {
    return res.json({ schedule: {} });
  }
  return res.json({ schedule: settings[0].schedule });
});

// Admin only: update store schedule
router.put("/settings", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { schedule } = req.body;
  if (!schedule || typeof schedule !== "object") {
    return res.status(400).json({ error: "schedule object is required" });
  }

  const existing = await db
    .select()
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.id, 1))
    .limit(1);
  if (!existing.length) {
    const [row] = await db.insert(storeSettingsTable).values({ schedule }).returning();
    return res.status(201).json({ schedule: row.schedule });
  }

  const [row] = await db
    .update(storeSettingsTable)
    .set({ schedule, updatedAt: new Date() })
    .where(eq(storeSettingsTable.id, 1))
    .returning();
  return res.json({ schedule: row.schedule });
});

export default router;
