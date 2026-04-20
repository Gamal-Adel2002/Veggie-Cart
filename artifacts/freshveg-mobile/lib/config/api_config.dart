// API base URL for the FreshVeg backend.
//
// The defaultValue below is the current development server URL (functional now).
// Once the website is deployed, update the defaultValue to the production URL
// from the Replit Deployments tab (e.g. https://your-app.replit.app),
// OR override it at build time without editing this file:
//
//   flutter build apk  --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//   flutter build ipa  --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//   flutter run        --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
const String kApiBaseUrl = String.fromEnvironment(
  'FLUTTER_API_BASE_URL',
  defaultValue: 'https://099d49ab-9db1-4f5a-9dcd-134bcd00126f-00-3qgerl1s7w7o2.riker.replit.dev',
);

const String kApiUrl = '$kApiBaseUrl/api';
