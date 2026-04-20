#!/usr/bin/env bash
# ============================================================
# FreshVeg — Android Release Signing Setup
# Run this script ONCE on your local machine (requires Java).
# It generates a release keystore and prints the values you
# need to add as Replit Secrets.
# ============================================================
set -e

ALIAS="freshveg"
KEYSTORE="freshveg-release.jks"
VALIDITY_DAYS=10000
KEY_SIZE=2048

echo ""
echo "=== FreshVeg Android Release Signing Setup ==="
echo ""

# Check for keytool
if ! command -v keytool &> /dev/null; then
  echo "ERROR: 'keytool' not found. Install the Java JDK:"
  echo "  macOS:   brew install openjdk"
  echo "  Ubuntu:  sudo apt install default-jdk"
  echo "  Windows: https://adoptium.net/"
  exit 1
fi

# Check keystore doesn't already exist
if [ -f "$KEYSTORE" ]; then
  echo "WARNING: $KEYSTORE already exists. Delete it first if you want to regenerate."
  echo "         Using existing keystore — skipping generation."
else
  echo "Enter passwords and distinguished name when prompted."
  echo "(Use the same password for both store password and key password for simplicity.)"
  echo ""

  keytool -genkey -v \
    -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -keyalg RSA \
    -keysize $KEY_SIZE \
    -validity $VALIDITY_DAYS \
    -storetype JKS
fi

echo ""
echo "=== Keystore generated: $KEYSTORE ==="
echo ""
echo "Now add the following as Replit Secrets in your project:"
echo "(Replit sidebar → Secrets tab → + Add Secret)"
echo ""
echo "──────────────────────────────────────────────"
echo "Secret name:  ANDROID_KEYSTORE_BASE64"
echo "Secret value: (see below — copy the entire base64 string)"
echo ""
base64 < "$KEYSTORE"
echo ""
echo "──────────────────────────────────────────────"
echo "Secret name:  ANDROID_KEY_ALIAS"
echo "Secret value: $ALIAS"
echo ""
echo "Secret name:  ANDROID_STORE_PASSWORD"
echo "Secret value: (the store password you chose above)"
echo ""
echo "Secret name:  ANDROID_KEY_PASSWORD"
echo "Secret value: (the key password you chose above — usually the same)"
echo ""
echo "──────────────────────────────────────────────"
echo ""
echo "After adding the secrets to Replit, build your release AAB with:"
echo ""
echo "  cd artifacts/freshveg-mobile"
echo "  bash scripts/generate-key-properties.sh"
echo "  flutter build appbundle --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app"
echo ""
echo "The signed AAB will be at:"
echo "  build/app/outputs/bundle/release/app-release.aab"
echo ""
