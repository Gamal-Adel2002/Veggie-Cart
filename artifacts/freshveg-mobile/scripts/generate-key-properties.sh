#!/usr/bin/env bash
# ============================================================
# FreshVeg — Generate android/key.properties from Replit Secrets
#
# WHEN TO USE THIS SCRIPT:
#   - Local development / debugging, when you have the ANDROID_*
#     env vars exported in your shell but want to inspect or pre-
#     generate key.properties before running a build.
#
# WHEN YOU DON'T NEED THIS SCRIPT:
#   - Release builds inside Replit: `flutter build appbundle` already
#     reads the Replit Secrets automatically via android/app/build.gradle.kts
#     (Gradle auto-generates key.properties at configuration time).
#     Just run `flutter build appbundle --dart-define=...` directly.
#
# Reads environment variables set from Replit Secrets:
#   ANDROID_KEYSTORE_BASE64  — base64-encoded .jks file
#   ANDROID_STORE_PASSWORD   — keystore password
#   ANDROID_KEY_PASSWORD     — key password
#   ANDROID_KEY_ALIAS        — key alias (default: freshveg)
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$MOBILE_ROOT/android"
KEYSTORE_PATH="$MOBILE_ROOT/freshveg-release.jks"
KEY_PROPERTIES="$ANDROID_DIR/key.properties"

echo "=== Generating Android signing config ==="

# Validate required secrets
missing=()
[ -z "$ANDROID_KEYSTORE_BASE64" ] && missing+=("ANDROID_KEYSTORE_BASE64")
[ -z "$ANDROID_STORE_PASSWORD"  ] && missing+=("ANDROID_STORE_PASSWORD")
[ -z "$ANDROID_KEY_PASSWORD"    ] && missing+=("ANDROID_KEY_PASSWORD")

if [ ${#missing[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: Missing Replit Secrets:"
  for key in "${missing[@]}"; do
    echo "  - $key"
  done
  echo ""
  echo "Run scripts/setup-android-signing.sh on your local machine first,"
  echo "then add the output values to Replit Secrets."
  exit 1
fi

KEY_ALIAS="${ANDROID_KEY_ALIAS:-freshveg}"

# Decode keystore from base64
echo "  Decoding keystore → $KEYSTORE_PATH"
echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$KEYSTORE_PATH"

# Write key.properties (relative path from android/ to the jks file)
RELATIVE_KEYSTORE="../freshveg-release.jks"

cat > "$KEY_PROPERTIES" <<EOF
storePassword=$ANDROID_STORE_PASSWORD
keyPassword=$ANDROID_KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=$RELATIVE_KEYSTORE
EOF

echo "  Written: $KEY_PROPERTIES"
echo ""
echo "=== Signing config ready. Build with: ==="
echo "  flutter build appbundle --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app"
echo "  flutter build apk       --dart-define=FLUTTER_API_BASE_URL=https://your-app.replit.app"
echo ""
