import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", router);

app.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy – FreshVeg</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 2rem; font-weight: 700; color: #2d7a3a; margin-bottom: 0.25rem; }
    .subtitle { color: #666; font-size: 0.95rem; margin-bottom: 2.5rem; }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2rem 0 0.5rem; color: #1a1a1a; }
    p, li { font-size: 1rem; color: #333; }
    ul { padding-left: 1.4rem; margin: 0.4rem 0; }
    li { margin-bottom: 0.3rem; }
    a { color: #2d7a3a; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 2.5rem 0; }
    .footer { font-size: 0.875rem; color: #888; margin-top: 3rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="subtitle">FreshVeg Grocery Delivery &nbsp;·&nbsp; Last updated: April 20, 2026</p>

    <p>This Privacy Policy describes how FreshVeg ("we", "us", or "our") collects, uses, and protects information when you use the FreshVeg mobile app and website (collectively, the "Service").</p>

    <h2>1. Information We Collect</h2>
    <p>We collect the following categories of personal information when you register and use the Service:</p>
    <ul>
      <li><strong>Name</strong> – to personalise your account and address deliveries.</li>
      <li><strong>Phone number</strong> – to send order confirmations and delivery updates via SMS or in-app notification.</li>
      <li><strong>Delivery address</strong> – to fulfil and route your grocery orders.</li>
      <li><strong>Location data</strong> – with your permission, we access your device's location to auto-fill your delivery address and to show nearby availability. Location access is optional and can be revoked at any time in your device settings.</li>
      <li><strong>Order history</strong> – items you purchase, so we can display past orders and improve recommendations.</li>
      <li><strong>Payment information</strong> – payment details are processed by our third-party payment provider and are never stored on our servers.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To process and deliver your grocery orders.</li>
      <li>To send order status updates and delivery notifications.</li>
      <li>To improve the accuracy of delivery estimates and product availability.</li>
      <li>To respond to customer support inquiries.</li>
      <li>To comply with legal obligations.</li>
    </ul>

    <h2>3. Sharing of Information</h2>
    <p>We do not sell your personal information. We may share it with:</p>
    <ul>
      <li><strong>Delivery partners</strong> – name and delivery address are shared only as needed to complete your order.</li>
      <li><strong>Payment processors</strong> – to securely handle transactions.</li>
      <li><strong>Service providers</strong> – cloud infrastructure and analytics providers who process data on our behalf under strict confidentiality agreements.</li>
      <li><strong>Law enforcement</strong> – where required by applicable law.</li>
    </ul>

    <h2>4. Data Retention</h2>
    <p>We retain your personal data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us.</p>

    <h2>5. Your Rights</h2>
    <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, or to object to certain processing. To exercise these rights, please contact us at the address below.</p>

    <h2>6. Children's Privacy</h2>
    <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us so we can delete it promptly.</p>

    <h2>7. Security</h2>
    <p>We use industry-standard measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. No method of transmission over the internet is 100% secure, however, and we cannot guarantee absolute security.</p>

    <h2>8. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the Service after changes are posted constitutes your acceptance of the revised policy.</p>

    <h2>9. Contact Us</h2>
    <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
    <ul>
      <li>Email: <a href="mailto:privacy@freshveg.app">privacy@freshveg.app</a></li>
    </ul>

    <hr />
    <p class="footer">&copy; 2026 FreshVeg. All rights reserved.</p>
  </div>
</body>
</html>`);
});

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(process.cwd(), "artifacts/grocery-store/dist/public");
  app.use(express.static(frontendDist));
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
