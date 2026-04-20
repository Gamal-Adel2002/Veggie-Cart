// API base URL for the FreshVeg backend.
//
// Override at build time with:
//   flutter build apk --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//   flutter build ipa --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app
//
// After publishing the website on Replit, replace the defaultValue below
// with your production .replit.app URL (visible in the Replit Deployments tab).
const String kApiBaseUrl = String.fromEnvironment(
  'FLUTTER_API_BASE_URL',
  defaultValue: 'https://099d49ab-9db1-4f5a-9dcd-134bcd00126f-00-3qgerl1s7w7o2.riker.replit.dev',
);

const String kApiUrl = '$kApiBaseUrl/api';
