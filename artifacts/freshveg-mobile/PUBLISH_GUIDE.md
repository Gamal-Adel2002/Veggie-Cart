# FreshVeg Mobile — Publishing & Setup Guide

## Overview

This guide covers everything you need to:
- Install the app on your iPhone for testing
- Publish to Google Play (Android)
- Publish to the Apple App Store (iPhone/iPad)
- Move this Flutter project to a new standalone Replit project

---

## Important: Update the Production API URL

Before building for release, update the API URL in `lib/config/api_config.dart`:

1. Open the [Replit Deployments tab](https://replit.com) and copy your published `.replit.app` URL
2. Replace the `defaultValue` in `lib/config/api_config.dart`:
   ```dart
   defaultValue: 'https://YOUR-APP-NAME.replit.app',
   ```
   Or pass it at build time without editing the file:
   ```bash
   flutter build apk --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
   flutter build ipa --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
   ```

---

## Part 1: Install on Your iPhone (No App Store Required)

You have two options: **TestFlight** (recommended, works up to 90 days) or **AltStore** (free, but expires every 7 days and requires refreshing).

### Option A: TestFlight (Recommended for testers)

**What you need:** Apple Developer account ($99/year) — [enroll here](https://developer.apple.com/programs/enroll/)

1. **On your Mac**, open Xcode and the project:
   ```bash
   cd artifacts/freshveg-mobile/ios
   open Runner.xcworkspace
   ```
2. In Xcode → **Signing & Capabilities** → select your Team (Apple ID) and set **Bundle Identifier** to `com.freshveg.app`
3. **Archive the app**: Product → Archive → wait for it to finish
4. In the **Organizer**, click **Distribute App** → **App Store Connect** → follow prompts to upload
5. In [App Store Connect](https://appstoreconnect.apple.com):
   - Go to **TestFlight** → select your build → add internal testers (your Apple ID)
   - Apple will process the build (15-30 minutes)
6. On your iPhone, install **TestFlight** from the App Store
7. Open the link Apple sends you → install **FreshVeg** via TestFlight

### Option B: AltStore Sideloading (Free, no developer account needed)

> ⚠️ Apps installed via AltStore expire every 7 days and require refreshing via AltStore on your Mac/PC.

**What you need:** A Mac or Windows PC with iTunes/Apple Devices installed

1. **Build the IPA on your Mac** (Replit cannot build iOS apps — Xcode requires macOS):
   ```bash
   flutter build ipa --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
   ```
   The IPA will be at: `build/ios/ipa/freshveg_mobile.ipa`

2. **Install AltStore on your Mac/PC**: [altstore.io](https://altstore.io) → download → drag to Applications
3. Connect your iPhone via USB
4. In AltStore (Mac menu bar) → **Install AltStore** → select your iPhone
5. On your iPhone: Settings → General → VPN & Device Management → trust your Apple ID
6. Open AltStore on iPhone → **My Apps** → `+` → choose the `.ipa` file
7. Sign in with your Apple ID when prompted

**Refreshing (every 7 days):** Open AltStore on your iPhone while on the same WiFi as your Mac → tap the app → **Refresh**

---

## Part 2: Publish to Google Play

**Cost:** One-time $25 registration fee  
**What you need:** [Google Play Console account](https://play.google.com/console)

### Step 1: Generate a Signing Key (do this once)

```bash
keytool -genkey -v -keystore freshveg-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias freshveg
```

Save the keystore file and passwords safely — you **cannot** recover these.

### Step 2: Configure Signing in Flutter

Create `android/key.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=freshveg
storeFile=../freshveg-release.jks
```

Add to `android/app/build.gradle.kts` in the `android {}` block:
```kotlin
val keyPropertiesFile = rootProject.file("key.properties")
val keyProperties = Properties()
keyProperties.load(FileInputStream(keyPropertiesFile))

signingConfigs {
    create("release") {
        keyAlias = keyProperties["keyAlias"] as String
        keyPassword = keyProperties["keyPassword"] as String
        storeFile = file(keyProperties["storeFile"] as String)
        storePassword = keyProperties["storePassword"] as String
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
    }
}
```

### Step 3: Build the Release Bundle

```bash
flutter build appbundle --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
```

The AAB file will be at: `build/app/outputs/bundle/release/app-release.aab`

### Step 4: Submit to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console) → **Create app**
2. Fill in: App name "FreshVeg", Default language, App or Game, Free or Paid
3. Go to **Production** → **Create new release** → upload the `.aab` file
4. Add a release name (e.g., "1.0.0") and release notes
5. Complete the **Store listing**:
   - Short description (80 chars): "Fresh vegetables & fruits delivered to your door"
   - Full description (4000 chars): describe the app's features
   - Upload screenshots (min 2): phone screenshots (1080×1920 or similar)
   - Upload a feature graphic (1024×500 px)
   - Upload app icon (512×512 px)
6. Complete **Content rating** (answer the questionnaire)
7. Set up **Pricing & distribution** (select countries)
8. Click **Review and publish** → wait 1-3 days for review

---

## Part 3: Publish to Apple App Store

**Cost:** $99/year Apple Developer Program  
**What you need:** [Apple Developer account](https://developer.apple.com/programs/enroll/), Mac with Xcode

### Step 1: Set Up Signing in Xcode

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select the **Runner** target → **Signing & Capabilities**
3. Check **Automatically manage signing**
4. Select your **Team** (your Apple Developer account)
5. Xcode will create provisioning profiles automatically

### Step 2: Create the App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → `+` → **New App**
2. Platform: **iOS**, Name: **FreshVeg**, Bundle ID: **com.freshveg.app**
3. SKU: `freshveg-001` (any unique string)

### Step 3: Build and Upload

1. In Xcode, set the scheme to **Release** (Product → Scheme → Edit Scheme → Archive)
2. Connect your iPhone or choose **Any iOS Device (arm64)** as the target
3. **Product → Archive** → wait for the build
4. In Organizer → **Distribute App** → **App Store Connect** → **Upload**
5. Wait 15-30 minutes for processing in App Store Connect

### Step 4: Submit for Review

1. In App Store Connect → your app → **App Store** tab
2. Select the uploaded build under **Build**
3. Fill in:
   - **App Information**: Privacy Policy URL (required — host a simple one at `/privacy`)
   - **Pricing**: Free
   - **App Review Information**: login credentials (use the test admin: 01000000000 / admin123)
   - **Screenshots**: upload for iPhone 6.5" and 5.5" sizes (use the Xcode Simulator to capture them)
4. Click **Submit for Review** → Apple reviews within 24-48 hours

### Required Privacy Policy

Apple requires a privacy policy URL. You can create a simple one and host it on your website, for example at `https://your-app.replit.app/privacy`. Add a static HTML route to the Express API or link to a Google Docs/Notion page.

---

## Part 4: Move Flutter App to a New Standalone Replit Project

To keep the Flutter mobile app in its own repository:

### Step 1: Create a New Replit Project

1. Go to [replit.com](https://replit.com) → **Create Repl**
2. Search for the **Flutter** template (or select "Blank" and set language to Dart/Flutter)
3. Give it a name like `freshveg-mobile`

### Step 2: Transfer the Flutter Files

The Flutter app lives entirely in `artifacts/freshveg-mobile/`. Copy these files to your new Replit project:

```
freshveg-mobile/
├── lib/              ← all Dart source code
├── android/          ← Android project files
├── ios/              ← iOS project files
├── assets/           ← images and fonts
├── pubspec.yaml      ← dependencies
├── pubspec.lock      ← locked dependency versions
└── l10n.yaml         ← localization config
```

**In Replit:** Use the Shell tab in your new project and run:
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/freshveg-mobile.git
# Copy files using the Replit file manager or upload a zip
git add .
git commit -m "Initial Flutter app"
git push -u origin main
```

### Step 3: Connect to GitHub (New Repo)

1. Create a new repo on GitHub: `freshveg-mobile` (make it private if needed)
2. In your new Replit project: **Version Control** tab → connect to the GitHub repo
3. Push your code

### Step 4: Point to the Same API

The Flutter app already uses `FLUTTER_API_BASE_URL` as a build-time variable. The backend API at your `.replit.app` URL is shared — no changes needed on the server side. Both the website and mobile app talk to the same database.

---

## App Credentials Summary

| Role | Username / Phone | Password |
|------|------------------|----------|
| Admin | 01000000000 | admin123 |
| Customer | (register via app) | — |
| Delivery (ahmed) | ahmed | delivery123 |
| Delivery (mohamed) | mohamed | delivery123 |
| Delivery (khaled) | khaled | delivery123 |

---

## Google Maps API Key

The app uses Google Maps for delivery location. To enable it:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an API key and enable **Maps SDK for Android** and **Maps SDK for iOS**
3. **Android**: replace `YOUR_GOOGLE_MAPS_API_KEY` in `android/app/src/main/AndroidManifest.xml`
4. **iOS**: set `GOOGLE_MAPS_API_KEY` in your Xcode build settings or replace `$(GOOGLE_MAPS_API_KEY)` in `ios/Runner/Info.plist`

---

## Firebase Push Notifications (Optional)

The app handles missing Firebase configuration gracefully (push notifications simply won't work until configured):

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android app (package: `com.freshveg.app`) → download `google-services.json` → place in `android/app/`
3. Add iOS app (bundle ID: `com.freshveg.app`) → download `GoogleService-Info.plist` → add to `ios/Runner/` in Xcode
4. Enable **Cloud Messaging** in Firebase Console
5. Set `FIREBASE_SERVICE_ACCOUNT_KEY` in your Replit Secrets (the API server uses this for sending push notifications)
