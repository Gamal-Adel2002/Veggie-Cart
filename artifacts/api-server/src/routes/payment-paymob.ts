import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import crypto from "crypto";

interface PayMobAuthResponse {
  token: string;
  merchant_id?: number;
  expires_in?: number;
}

interface PayMobOrderResponse {
  id: number | string;
  order_id?: string;
  status?: string;
  amount_cents: number;
  currency: string;
  created_at?: string;
}

interface PayMobPaymentKeyResponse {
  token: string;
  order?: PayMobOrderResponse;
}

interface PayMobWebhookPayment {
  id: string | number;
  order_id?: string;
  amount_cents?: number;
  currency?: string;
}

interface PayMobWebhookOrder {
  id: string | number;
}

interface PayMobWebhookEvent {
  event: string;
  order?: PayMobWebhookOrder;
  obj?: PayMobWebhookPayment;
}

const router = Router();

// POST /api/payment/paymob/create
// Creates a PayMob payment and returns redirect URL
router.post("/create", authenticate(), async (req: AuthRequest, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "orderId is required" });
  }

  // Get order from DB
  const [order] = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      customerName: ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      finalPrice: ordersTable.finalPrice,
      totalPrice: ordersTable.totalPrice,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Verify order belongs to user
  if (!order.userId || order.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Verify order is in 'waiting' status
  if (order.status !== "waiting") {
    return res.status(400).json({ error: "Order cannot be paid" });
  }

  // Check if already paid
  if (order.paymentStatus === "paid") {
    return res.status(400).json({ error: "Order already paid" });
  }

  // Get order items separately
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  try {
    // Step 1: Get auth token from PayMob
    const apiKey = process.env.PAYMOB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "PayMob API key not configured" });
    }

    const tokenRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      console.error("PayMob auth error:", err);
      return res.status(500).json({ error: "Failed to authenticate with PayMob", details: err });
    }

    const authData = (await tokenRes.json()) as PayMobAuthResponse;
    const token = authData.token;

    // Step 2: Create order on PayMob
    // Amount in cents (EGP * 100)
    const amountCents = Math.round((order.finalPrice || order.totalPrice) * 100);

    const orderPayload = {
      merchant_order_id: `order_${order.id}`,
      amount_cents: amountCents,
      currency: "EGP",
      items: items.map((item) => ({
        name: item.productName,
        amount_cents: Math.round(item.subtotal * 100),
        quantity: item.quantity,
        description: item.unit,
      })),
      delivery_needed: false,
      store_id: process.env.PAYMOB_MERCHANT_ID,
    };

    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json();
      console.error("PayMob order creation error:", err);
      return res.status(500).json({ error: "Failed to create PayMob order", details: err });
    }

    const paymobOrder = (await orderRes.json()) as PayMobOrderResponse;

    // Step 3: Get payment key
    const paymentKeyPayload = {
      card_integration_id: process.env.PAYMOB_TERMINAL_ID,
    };

    const paymentKeyRes = await fetch(
      `https://accept.paymob.com/api/ecommerce/orders/${paymobOrder.id}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentKeyPayload),
      }
    );

    if (!paymentKeyRes.ok) {
      const err = await paymentKeyRes.json();
      console.error("PayMob payment key error:", err);
      return res.status(500).json({ error: "Failed to get payment key", details: err });
    }

    const paymentKeyData = (await paymentKeyRes.json()) as PayMobPaymentKeyResponse;
    const paymentToken = paymentKeyData.token;

    // Step 4: Save PayMob order ID to our order
    await db
      .update(ordersTable)
      .set({
        paymentTransactionId: String(paymobOrder.id),
        paymentMethod: "card",
        paymentStatus: "pending",
        paymentGateway: "paymob",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    // Step 5: Return redirect URL
    const paymentUrl = `https://accept.paymob.com/api/accept?token=${paymentToken}`;
    return res.json({
      success: true,
      paymentUrl,
      paymobOrderId: paymobOrder.id,
    });
  } catch (error: unknown) {
    console.error("PayMob integration error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to initialize payment", details: message });
  }
});

// POST /api/payment/paymob/webhook
// Handles payment success/failure notifications from PayMob
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paymob-signature"] as string | undefined;
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const webhookSecret = process.env.PAYMOB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("PAYMOB_WEBHOOK_SECRET not set");
    return res.status(500).send("Server configuration error");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("Invalid PayMob webhook signature");
    return res.status(400).send("Invalid signature");
  }

  const webhookData = req.body as PayMobWebhookEvent;
  const { event, order } = webhookData;

  console.log(`PayMob webhook received: ${event} for order ${order?.id}`);

  try {
    switch (event) {
      case "payment.success":
        if (order?.id) {
          await db
            .update(ordersTable)
            .set({
              paymentStatus: "paid",
              paymentPaidAt: new Date(),
              status: "accepted", // Auto-accept paid orders
              updatedAt: new Date(),
            })
            .where(eq(ordersTable.paymentTransactionId, String(order.id)));
          console.log(`✅ Payment succeeded for PayMob order: ${order.id}`);
        }
        break;

      case "payment.failed":
        if (order?.id) {
          await db
            .update(ordersTable)
            .set({
              paymentStatus: "failed",
              updatedAt: new Date(),
            })
            .where(eq(ordersTable.paymentTransactionId, String(order.id)));
          console.log(`❌ Payment failed for PayMob order: ${order.id}`);
        }
        break;

      case "payment.refunded":
        if (order?.id) {
          await db
            .update(ordersTable)
            .set({
              paymentStatus: "refunded",
              updatedAt: new Date(),
            })
            .where(eq(ordersTable.paymentTransactionId, String(order.id)));
          console.log(`↩️ Payment refunded for PayMob order: ${order.id}`);
        }
        break;

      default:
        console.log(`📦 Received unhandled PayMob webhook event: ${event}`);
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Error processing webhook");
  }
});

// GET /api/payment/paymob/status/:orderId
// Check payment status for an order
router.get("/status/:orderId", authenticate(), async (req: AuthRequest, res) => {
  const { orderId } = req.params;

  const [order] = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      paymentTransactionId: ordersTable.paymentTransactionId,
      paymentPaidAt: ordersTable.paymentPaidAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, Number(orderId)))
    .limit(1);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!order.userId || order.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json({
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentTransactionId: order.paymentTransactionId,
    paidAt: order.paymentPaidAt,
  });
});

export default router;
