// API base URL for the FreshVeg backend.
//
// After deploying the website on Replit, copy your production URL from the
// Deployments tab (it looks like https://your-app-name.replit.app) and replace
// the defaultValue below — OR pass it at build time without editing this file:
//
//   flutter build apk  --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//   flutter build ipa  --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//   flutter run        --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//
// TODO: Replace the defaultValue with your production .replit.app URL before releasing.
const String kApiBaseUrl = String.fromEnvironment(
  'FLUTTER_API_BASE_URL',
  defaultValue: 'https://YOUR-APP-NAME.replit.app',
);

const String kApiUrl = '$kApiBaseUrl/api';
