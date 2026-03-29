import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryPersonsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

router.get("/", authenticate(), requireAdmin, async (_req, res) => {
  const persons = await db.select().from(deliveryPersonsTable);
  res.json(persons);
});

router.post("/", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, phone, active } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: "name and phone are required" });
    return;
  }
  const [person] = await db.insert(deliveryPersonsTable).values({
    name,
    phone,
    active: active ?? true,
  }).returning();
  res.status(201).json(person);
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, active } = req.body;
  const [person] = await db.update(deliveryPersonsTable)
    .set({ name, phone, active })
    .where(eq(deliveryPersonsTable.id, id))
    .returning();
  if (!person) {
    res.status(404).json({ error: "Delivery person not found" });
    return;
  }
  res.json(person);
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  await db.delete(deliveryPersonsTable).where(eq(deliveryPersonsTable.id, id));
  res.json({ success: true, message: "Delivery person deleted" });
});

export default router;
