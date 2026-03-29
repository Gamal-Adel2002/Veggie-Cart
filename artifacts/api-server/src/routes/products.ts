import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function getProductWithCategory(id: number) {
  const [product] = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    nameAr: productsTable.nameAr,
    description: productsTable.description,
    descriptionAr: productsTable.descriptionAr,
    price: productsTable.price,
    unit: productsTable.unit,
    image: productsTable.image,
    categoryId: productsTable.categoryId,
    featured: productsTable.featured,
    inStock: productsTable.inStock,
    createdAt: productsTable.createdAt,
    category: {
      id: categoriesTable.id,
      name: categoriesTable.name,
      nameAr: categoriesTable.nameAr,
      icon: categoriesTable.icon,
      productCount: sql<number>`0`,
    },
  }).from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));
  return product;
}

router.get("/", async (req, res) => {
  const { search, categoryId, featured } = req.query;

  const conditions = [];
  if (search) conditions.push(like(productsTable.name, `%${search}%`));
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(String(categoryId))));
  if (featured === "true") conditions.push(eq(productsTable.featured, true));

  const products = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    nameAr: productsTable.nameAr,
    description: productsTable.description,
    descriptionAr: productsTable.descriptionAr,
    price: productsTable.price,
    unit: productsTable.unit,
    image: productsTable.image,
    categoryId: productsTable.categoryId,
    featured: productsTable.featured,
    inStock: productsTable.inStock,
    createdAt: productsTable.createdAt,
    category: {
      id: categoriesTable.id,
      name: categoriesTable.name,
      nameAr: categoriesTable.nameAr,
      icon: categoriesTable.icon,
      productCount: sql<number>`0`,
    },
  }).from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(products);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const product = await getProductWithCategory(id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.post("/", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, nameAr, description, descriptionAr, price, unit, image, categoryId, featured, inStock } = req.body;
  if (!name || !nameAr || !price || !unit) {
    res.status(400).json({ error: "name, nameAr, price, and unit are required" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    name,
    nameAr,
    description: description || null,
    descriptionAr: descriptionAr || null,
    price: Number(price),
    unit: unit || "kg",
    image: image || null,
    categoryId: categoryId ? Number(categoryId) : null,
    featured: featured ?? false,
    inStock: inStock ?? true,
  }).returning();
  const full = await getProductWithCategory(product.id);
  res.status(201).json(full);
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { name, nameAr, description, descriptionAr, price, unit, image, categoryId, featured, inStock } = req.body;
  const [product] = await db.update(productsTable).set({
    name,
    nameAr,
    description: description || null,
    descriptionAr: descriptionAr || null,
    price: price !== undefined ? Number(price) : undefined,
    unit: unit || undefined,
    image: image !== undefined ? image || null : undefined,
    categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
    featured: featured ?? undefined,
    inStock: inStock ?? undefined,
  }).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const full = await getProductWithCategory(product.id);
  res.json(full);
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ success: true, message: "Product deleted" });
});

router.post("/upload-image", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
