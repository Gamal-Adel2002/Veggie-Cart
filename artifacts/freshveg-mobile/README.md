# FreshVeg Mobile App

Flutter mobile app for the FreshVeg bilingual (EN/AR) grocery delivery platform.

## Features

### Customer Portal
- Hero home screen matching the web app banner (vegetables background + delivery-man graphic)
- Browse products by category with search & filters
- Shopping cart with promo code support
- Checkout with Google Maps delivery-location picker + delivery zone pricing
- Order confirmation and order history
- Community feed with reactions
- In-app customer support chat
- Account management: profile, dark mode, language toggle (EN ↔ AR)

### Admin Portal
- Dashboard with revenue, order, and customer stats
- Order management (status tabs: pending → ready → out for delivery → delivered)
  - Assign delivery person, call customer
- Product CRUD with image upload
- Category, delivery zone, store hours, promo code, and voucher management
- Customer, staff, and supplier management
- Supplier order tracking
- Public chat moderation + private customer chat threads

### Delivery Portal
- Active deliveries list with map view + one-tap "Mark Delivered"
- Call customer directly
- Today's summary: completed count, pending, earnings

### Infrastructure
- JWT authentication with role-based routing (customer / admin / delivery)
- Riverpod state management
- go_router with redirect guards per role
- FCM push notification setup (client + server token registration endpoint)
- RTL support for Arabic via flutter_localizations
- Light / Dark theme (emerald #1A6840 + gold #C9974A)

## Setup

### Prerequisites
- Flutter 3.32+ (`flutter --version`)
- Android Studio or Xcode for device/emulator targets
- A running FreshVeg API server (`artifacts/api-server`)

### Configuration

1. **API Base URL** — update `lib/services/api_client.dart`:
   ```dart
   static const _baseUrl = 'https://your-api-domain.replit.app/api';
   ```

2. **Google Maps** — replace `YOUR_GOOGLE_MAPS_API_KEY` in
   `android/app/src/main/AndroidManifest.xml`, and add to `ios/Runner/AppDelegate.swift`.

3. **Firebase (FCM)** — run `flutterfire configure` to generate
   `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).

### Run

```bash
flutter pub get
flutter run
```

### Build

```bash
# Android APK
flutter build apk --release

# iOS IPA (macOS required)
flutter build ipa --release
```

## Project Structure

```
lib/
├── app.dart              # MaterialApp.router + theme + locale
├── main.dart             # ProviderScope entry point
├── config/theme.dart     # emerald #1A6840 + gold #C9974A
├── l10n/                 # Generated EN + AR localizations
├── models/               # Order, Product, Category, User, etc.
├── providers/            # auth, cart, locale, theme (Riverpod)
├── router/app_router.dart # go_router with role-based redirects
├── screens/
│   ├── customer/         # home, shop, product_detail, cart, checkout, ...
│   ├── admin/            # dashboard, orders, products, categories, ...
│   └── delivery/         # login, dashboard
├── services/
│   ├── api_client.dart   # Dio with JWT interceptor
│   ├── auth_service.dart # login / signup / logout per role
│   └── fcm_service.dart  # Firebase Cloud Messaging
└── widgets/              # product_card, order_status_badge, empty_state, loading_skeleton
```

## Publish to GitHub

```bash
cd artifacts/freshveg-mobile
git init
git remote add origin https://github.com/YOUR_ORG/freshveg-mobile.git
git add .
git commit -m "feat: complete FreshVeg Flutter mobile app"
git push -u origin main
```
