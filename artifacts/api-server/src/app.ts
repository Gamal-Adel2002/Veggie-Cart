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

// ── Flutter app download routes ────────────────────────────────────────────
const GITHUB_REPO = "Gamal-Adel2002/Veggie-Cart";
const GITHUB_RELEASE_TAG = "apk-latest";

async function getApkAsset(): Promise<{ downloadUrl: string; size: number; updatedAt: string } | null> {
  try {
    const token = process.env["GITHUB_TOKEN"];
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "freshveg-server",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${GITHUB_RELEASE_TAG}`,
      { headers }
    );
    if (!resp.ok) return null;
    const release = await resp.json() as { assets: Array<{ name: string; browser_download_url: string; size: number; updated_at: string }> };
    const apk = release.assets?.find((a) => a.name.endsWith(".apk"));
    if (!apk) return null;
    return { downloadUrl: apk.browser_download_url, size: apk.size, updatedAt: apk.updated_at };
  } catch {
    return null;
  }
}

app.get("/download/apk", async (req, res) => {
  const asset = await getApkAsset();
  if (!asset) {
    res.status(404).json({ error: "APK not built yet. See /download for setup instructions." });
    return;
  }
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    res.redirect(asset.downloadUrl);
    return;
  }
  try {
    const ghResp = await fetch(asset.downloadUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/octet-stream", "User-Agent": "freshveg-server" },
      redirect: "follow",
    });
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="freshveg-debug.apk"');
    if (ghResp.headers.get("content-length")) {
      res.setHeader("Content-Length", ghResp.headers.get("content-length")!);
    }
    const { Readable } = await import("stream");
    Readable.fromWeb(ghResp.body as any).pipe(res);
  } catch {
    res.redirect(asset.downloadUrl);
  }
});

app.get("/download/source", (req, res) => {
  const file = path.join(process.cwd(), "downloads", "freshveg-mobile.tar.gz");
  res.download(file, "freshveg-mobile.tar.gz", (err) => {
    if (err) res.status(404).send("File not found");
  });
});

app.get("/download", async (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `${proto}://${host}`;
  const apkUrl = `${base}/download/apk`;

  const asset = await getApkAsset();
  const apkReady = !!asset;
  const apkSizeMb = asset ? (asset.size / 1024 / 1024).toFixed(1) : null;
  const apkDate = asset ? new Date(asset.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(apkUrl)}`;

  const statusBadge = apkReady
    ? `<div class="badge ready">✓ APK Ready — ${apkSizeMb} MB · Built ${apkDate}</div>`
    : `<div class="badge pending">⏳ APK not built yet</div>`;

  const primaryBtn = apkReady
    ? `<a class="btn" href="/download/apk">⬇ Download APK (${apkSizeMb} MB)</a>`
    : `<a class="btn btn-ghost" href="https://github.com/${GITHUB_REPO}/releases/tag/${GITHUB_RELEASE_TAG}" target="_blank">⬇ APK not built yet</a>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FreshVeg – Get the App</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f7f5;color:#1a1a1a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;max-width:500px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
    .logo{font-size:2.4rem;margin-bottom:8px}
    h1{color:#2d7a3a;font-size:1.5rem;margin-bottom:6px}
    .subtitle{color:#555;font-size:.95rem;margin-bottom:20px}
    .badge{display:inline-block;border-radius:20px;padding:6px 16px;font-size:.82rem;font-weight:600;margin-bottom:20px}
    .badge.ready{background:#e8f5e9;color:#2d7a3a}
    .badge.pending{background:#fff8e1;color:#795548}
    .qr{border:3px solid #e8f5e9;border-radius:16px;padding:16px;display:inline-block;margin-bottom:20px}
    .qr img{display:block;width:200px;height:200px}
    .qr-label{font-size:.78rem;color:#888;margin-top:8px}
    .btn{display:inline-block;background:#2d7a3a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:1rem;font-weight:600;margin:0 0 20px;transition:background .2s;width:100%}
    .btn:hover{background:#225e2c}
    .btn-ghost{background:#e8f5e9;color:#2d7a3a}
    .btn-ghost:hover{background:#c8e6c9}
    .divider{border:none;border-top:1px solid #eee;margin:24px 0}
    .setup{background:#f5f7f5;border-radius:12px;padding:20px;text-align:left}
    .setup h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.05em;color:#2d7a3a;margin-bottom:12px}
    .setup ol{padding-left:20px;font-size:.88rem;color:#444;line-height:2}
    .setup code{background:#e8f5e9;border-radius:4px;padding:2px 6px;font-size:.82rem;color:#1a5928;word-break:break-all}
    .setup a{color:#2d7a3a}
    .note{font-size:.78rem;color:#999;margin-top:16px;line-height:1.5}
    .install-tip{background:#e3f2fd;border-radius:10px;padding:14px 16px;text-align:left;font-size:.85rem;color:#1565c0;margin-bottom:20px;line-height:1.6}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🥦</div>
  <h1>FreshVeg Mobile App</h1>
  <p class="subtitle">Android APK — free, no Play Store needed</p>

  ${statusBadge}

  <div class="qr">
    <img src="${qrUrl}" alt="QR code to download APK"/>
    <div class="qr-label">Scan to download APK on your phone</div>
  </div>

  <br/>
  ${primaryBtn}

  ${apkReady ? `
  <div class="install-tip">
    <strong>Installing on Android:</strong><br/>
    1. Download the APK to your phone<br/>
    2. Open your file manager and tap <code>freshveg-debug.apk</code><br/>
    3. If prompted, allow <em>"Install unknown apps"</em> for your browser<br/>
    4. Tap Install — done!
  </div>` : ""}

  <hr class="divider"/>

  <div class="setup">
    <h2>${apkReady ? "Rebuild / Update APK" : "One-time setup to build APK (free)"}</h2>
    <ol>
      <li>Go to your GitHub repo:<br/>
        <a href="https://github.com/${GITHUB_REPO}" target="_blank">github.com/${GITHUB_REPO}</a>
      </li>
      <li>Click <strong>Add file → Create new file</strong></li>
      <li>Type this exact path in the filename box:<br/>
        <code>.github/workflows/build-android-apk.yml</code>
      </li>
      <li>Paste the workflow from the file already in the repo at that path, then click <strong>Commit changes</strong></li>
      <li>GitHub Actions will automatically build the APK for free (takes ~5 min). Come back here — the download button will appear!</li>
    </ol>
  </div>
  <p class="note">The APK is a debug build signed with a temporary key — safe for personal use. Rebuild anytime by going to Actions → Run workflow on GitHub.</p>
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
