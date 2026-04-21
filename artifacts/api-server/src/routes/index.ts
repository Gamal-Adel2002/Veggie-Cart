import { Router } from "express";
import path from "path";
import fs from "fs";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import deliveryRouter from "./delivery";
import deliveryPortalRouter from "./delivery-portal";
import adminRouter from "./admin";
import uploadRouter from "./upload";
import zonesRouter from "./zones";
import notificationsRouter from "./notifications";
import chatRouter from "./chat";
import storeRouter from "./store";
import promoRouter from "./promo";
import voucherRouter from "./voucher";
import deliveryFeeRouter from "./deliveryFee";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/delivery-zones", zonesRouter);
router.use("/admin/delivery-persons", deliveryRouter);
router.use("/admin", adminRouter);
router.use("/admin", promoRouter);
router.use("/upload", uploadRouter);
router.use("/delivery", deliveryPortalRouter);
router.use("/notifications", notificationsRouter);
router.use("/chat", chatRouter);
router.use("/store", storeRouter);
router.use("/", promoRouter);
router.use("/", voucherRouter);
router.use("/", deliveryFeeRouter);
// PayMob payment disabled until approval - commented out
// router.use("/payment/paymob", paymentRouter);

export default router;
