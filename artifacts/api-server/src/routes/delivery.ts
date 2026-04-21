import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryPersonsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";

const router = Router();

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e.code === "23505" || e.cause?.code === "23505" ||
    (typeof e.message === "string" && e.message.includes("unique constraint"));
}

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
  try {
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
  } catch (err: unknown) {
    const isUniqueViolation = isUniqueConstraintError(err);
    if (isUniqueViolation) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    throw err;
  }
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { name, phone, active, username, password } = req.body;

  const updateData: Record<string, unknown> = { name, phone, active, username: username || null };
  if (password) {
    updateData.password = await hashPassword(password);
  }

  try {
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
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(deliveryPersonsTable).where(eq(deliveryPersonsTable.id, id));
  res.json({ success: true, message: "Delivery person deleted" });
});

export default router;
