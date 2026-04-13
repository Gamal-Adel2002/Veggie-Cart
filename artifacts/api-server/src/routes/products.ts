import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";
import { broadcastToAll } from "./notifications";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

function stripTashkeel(str: string): string {
  return str.replace(/[\u064B-\u065F\u0670]/g, "");
}

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
  },
});

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
    images: productsTable.images,
    categoryId: productsTable.categoryId,
    featured: productsTable.featured,
    inStock: productsTable.inStock,
    quantity: productsTable.quantity,
    quantityAlert: productsTable.quantityAlert,
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
  if (search) {
    const normalized = stripTashkeel(String(search));
    conditions.push(
      or(
        ilike(productsTable.name, `%${normalized}%`),
        ilike(productsTable.nameAr, `%${normalized}%`)
      )
    );
  }
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
    images: productsTable.images,
    categoryId: productsTable.categoryId,
    featured: productsTable.featured,
    inStock: productsTable.inStock,
    quantity: productsTable.quantity,
    quantityAlert: productsTable.quantityAlert,
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
  const id = parseInt(String(req.params.id));
  const product = await getProductWithCategory(id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.post("/", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const { name, nameAr, description, descriptionAr, price, unit, image, images, categoryId, featured, inStock, quantity, quantityAlert } = req.body;
  if (!name || !nameAr || !price || !unit) {
    res.status(400).json({ error: "name, nameAr, price, and unit are required" });
    return;
  }

  const qty = quantity !== undefined && quantity !== null && quantity !== "" ? Number(quantity) : null;
  const qtyAlert = quantityAlert !== undefined && quantityAlert !== null && quantityAlert !== "" ? Number(quantityAlert) : null;
  const imagesArr: string[] | null = Array.isArray(images) ? images.filter(Boolean) : null;

  const [product] = await db.insert(productsTable).values({
    name,
    nameAr,
    description: description || null,
    descriptionAr: descriptionAr || null,
    price: Number(price),
    unit: unit || "kg",
    image: image || null,
    images: imagesArr,
    categoryId: categoryId ? Number(categoryId) : null,
    featured: featured ?? false,
    inStock: qty !== null ? qty > 0 : (inStock ?? true),
    quantity: qty,
    quantityAlert: qtyAlert,
  }).returning();
  const full = await getProductWithCategory(product.id);
  setImmediate(() => { broadcastToAll("product_updated", {}); });
  res.status(201).json(full);
});

router.put("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const { name, nameAr, description, descriptionAr, price, unit, image, images, categoryId, featured, inStock, quantity, quantityAlert } = req.body;

  const qty = quantity !== undefined && quantity !== null && quantity !== "" ? Number(quantity) : quantity === null ? null : undefined;
  const qtyAlert = quantityAlert !== undefined && quantityAlert !== null && quantityAlert !== "" ? Number(quantityAlert) : quantityAlert === null ? null : undefined;

  // Auto-set inStock based on quantity if quantity is provided
  let resolvedInStock: boolean | undefined = inStock ?? undefined;
  if (qty !== undefined && qty !== null) {
    resolvedInStock = qty > 0;
  } else if (qty === null) {
    resolvedInStock = inStock ?? undefined;
  }

  const imagesArr: string[] | null | undefined = images !== undefined
    ? (Array.isArray(images) ? images.filter(Boolean) : null)
    : undefined;

  const [product] = await db.update(productsTable).set({
    name,
    nameAr,
    description: description !== undefined ? (description || null) : undefined,
    descriptionAr: descriptionAr !== undefined ? (descriptionAr || null) : undefined,
    price: price !== undefined ? Number(price) : undefined,
    unit: unit || undefined,
    image: image !== undefined ? image || null : undefined,
    images: imagesArr,
    categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
    featured: featured ?? undefined,
    inStock: resolvedInStock,
    quantity: qty,
    quantityAlert: qtyAlert,
  }).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const full = await getProductWithCategory(product.id);
  setImmediate(() => { broadcastToAll("product_updated", {}); });
  res.json(full);
});

router.delete("/:id", authenticate(), requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(productsTable).where(eq(productsTable.id, id));
  setImmediate(() => { broadcastToAll("product_updated", {}); });
  res.json({ success: true, message: "Product deleted" });
});

router.post("/upload-image", authenticate(), requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
