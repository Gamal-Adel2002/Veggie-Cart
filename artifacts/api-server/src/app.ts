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

// ── Flutter app download page ──────────────────────────────────────────────
app.get("/download/source", (req, res) => {
  const file = path.join(process.cwd(), "downloads", "freshveg-mobile.tar.gz");
  res.download(file, "freshveg-mobile.tar.gz", (err) => {
    if (err) res.status(404).send("File not found");
  });
});

app.get("/download", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `${proto}://${host}`;
  const downloadUrl = `${base}/download/source`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(downloadUrl)}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FreshVeg Mobile – Download</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f7f5;color:#1a1a1a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
    .logo{font-size:2.4rem;margin-bottom:8px}
    h1{color:#2d7a3a;font-size:1.5rem;margin-bottom:6px}
    p{color:#555;font-size:.95rem;margin-bottom:24px;line-height:1.5}
    .qr{border:3px solid #e8f5e9;border-radius:16px;padding:16px;display:inline-block;margin-bottom:24px}
    .qr img{display:block;width:220px;height:220px}
    .btn{display:inline-block;background:#2d7a3a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:1rem;font-weight:600;margin-bottom:24px;transition:background .2s}
    .btn:hover{background:#225e2c}
    .steps{background:#f5f7f5;border-radius:12px;padding:20px;text-align:left}
    .steps h2{font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#2d7a3a;margin-bottom:12px}
    .steps ol{padding-left:20px;font-size:.88rem;color:#444;line-height:1.9}
    .steps code{background:#e8f5e9;border-radius:4px;padding:2px 6px;font-size:.82rem;color:#1a5928}
    .note{font-size:.8rem;color:#888;margin-top:16px}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🥦</div>
  <h1>FreshVeg Mobile App</h1>
  <p>Download the Flutter source code, then build a free debug APK for your Android phone in under 5 minutes.</p>

  <div class="qr">
    <img src="${qrUrl}" alt="QR code to download source"/>
  </div>

  <br/>
  <a class="btn" href="/download/source">⬇ Download Source (.tar.gz)</a>

  <div class="steps">
    <h2>Install on Android – 5 steps</h2>
    <ol>
      <li>Install <strong>Flutter</strong>: <a href="https://flutter.dev/docs/get-started/install" target="_blank">flutter.dev</a></li>
      <li>Install <strong>Android Studio</strong> (free): <a href="https://developer.android.com/studio" target="_blank">android.com/studio</a></li>
      <li>Extract the downloaded file, open a terminal inside it and run:<br/><code>flutter pub get</code></li>
      <li>Connect your Android phone via USB, enable <strong>USB Debugging</strong> in Developer Options, then run:<br/><code>flutter run</code> — this installs and launches the app directly on your phone</li>
      <li>Or build a standalone APK file:<br/><code>flutter build apk --debug</code><br/>APK will be at <code>build/app/outputs/apk/debug/app-debug.apk</code> — copy it to your phone and install.</li>
    </ol>
  </div>
  <p class="note">No Google Play account needed. Debug builds are completely free.</p>
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
