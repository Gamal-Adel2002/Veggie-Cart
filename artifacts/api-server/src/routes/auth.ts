import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, generateToken } from "../lib/auth";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { password: _, ...safe } = user;
  return safe;
}

router.post("/signup", async (req, res) => {
  const { name, phone, password, address, profileImage, latitude, longitude } = req.body;
  if (!name || !phone || !password) {
    res.status(400).json({ error: "name, phone, and password are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone already registered" });
    return;
  }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    name,
    phone,
    password: hashed,
    address: address || null,
    profileImage: profileImage || null,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    role: "customer",
  }).returning();

  const token = generateToken({ userId: user.id, role: user.role });
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json({ user: sanitizeUser(user), token });
});

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ error: "phone and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.role === "admin") {
    res.status(401).json({ error: "Use admin login endpoint" });
    return;
  }

  const token = generateToken({ userId: user.id, role: user.role });
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ user: sanitizeUser(user), token });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", authenticate(), async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(user));
});

router.put("/me/location", authenticate(), async (req: AuthRequest, res) => {
  const { latitude, longitude, address } = req.body;
  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: "latitude and longitude are required" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ latitude: Number(latitude), longitude: Number(longitude), address: address || null })
    .where(eq(usersTable.id, req.userId!))
    .returning();
  res.json(sanitizeUser(user));
});

router.post("/admin/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ error: "phone and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.phone, phone)).limit(1);
  if (!user || user.role !== "admin") {
    res.status(401).json({ error: "Invalid credentials or not an admin" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken({ userId: user.id, role: user.role });
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ user: sanitizeUser(user), token });
});

export default router;
