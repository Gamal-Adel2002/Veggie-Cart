import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryZonesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const zones = await db
    .select()
    .from(deliveryZonesTable)
    .where(eq(deliveryZonesTable.active, true));
  res.json(zones);
});

export default router;
