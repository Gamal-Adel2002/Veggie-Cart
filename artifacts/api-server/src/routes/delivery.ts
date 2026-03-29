import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryPersonsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";

const router = Router();

router.get("/", authenticate(), requireAdmin, async (_req, res) => {
  const persons = await db.select({
    id: deliveryPersonsTable.id,
    name: deliveryPersonsTable.name,
    phone: deliveryPersonsTable.phone,
    active: deliveryPersonsTable.active,
    username: deliveryPersonsTable.username,
    createdAt: deliveryPersonsTable.createdAt,
  }).from(deliveryPersonsTable);
  res.json(persons);
});

router.post("/", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, phone, active, username, password } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: "name and phone are required" });
    return;
  }
  const hashedPassword = password ? await hashPassword(password) : null;
  const [person] = await db.insert(deliveryPersonsTable).values({
    name,
    phone,
    active: active ?? true,
    username: username || null,
    password: hashedPassword,
  }).returning({
    id: deliveryPersonsTable.id,
    name: deliveryPersonsTable.name,
    phone: deliveryPersonsTable.phone,
    active: deliveryPersonsTable.active,
    username: deliveryPersonsTable.username,
    createdAt: deliveryPersonsTable.createdAt,
  });
  res.status(201).json(person);
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { name, phone, active, username, password } = req.body;

  const updateData: Record<string, unknown> = { name, phone, active, username: username || null };
  if (password) {
    updateData.password = await hashPassword(password);
  }

  const [person] = await db.update(deliveryPersonsTable)
    .set(updateData)
    .where(eq(deliveryPersonsTable.id, id))
    .returning({
      id: deliveryPersonsTable.id,
      name: deliveryPersonsTable.name,
      phone: deliveryPersonsTable.phone,
      active: deliveryPersonsTable.active,
      username: deliveryPersonsTable.username,
      createdAt: deliveryPersonsTable.createdAt,
    });
  if (!person) {
    res.status(404).json({ error: "Delivery person not found" });
    return;
  }
  res.json(person);
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(deliveryPersonsTable).where(eq(deliveryPersonsTable.id, id));
  res.json({ success: true, message: "Delivery person deleted" });
});

export default router;
