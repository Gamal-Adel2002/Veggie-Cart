import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await db.select({
    id: categoriesTable.id,
    name: categoriesTable.name,
    nameAr: categoriesTable.nameAr,
    icon: categoriesTable.icon,
    productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE category_id = ${categoriesTable.id} AND in_stock = true)::int`,
  }).from(categoriesTable);
  res.json(categories);
});

router.post("/", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, nameAr, icon } = req.body;
  if (!name || !nameAr || !icon) {
    res.status(400).json({ error: "name, nameAr, and icon are required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({ name, nameAr, icon }).returning();
  res.status(201).json({ ...cat, productCount: 0 });
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { name, nameAr, icon } = req.body;
  const [cat] = await db.update(categoriesTable)
    .set({ name, nameAr, icon })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json({ ...cat, productCount: 0 });
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ success: true, message: "Category deleted" });
});

export default router;
