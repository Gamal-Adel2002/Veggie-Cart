import { Router } from "express";
import path from "path";
import fs from "fs";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import deliveryRouter from "./delivery";
import adminRouter from "./admin";
import uploadRouter from "./upload";
import zonesRouter from "./zones";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/delivery-zones", zonesRouter);
router.use("/admin/delivery-persons", deliveryRouter);
router.use("/admin", adminRouter);
router.use("/upload", uploadRouter);

export default router;
