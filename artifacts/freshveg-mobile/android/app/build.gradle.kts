import java.io.FileInputStream
import java.util.Base64
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    // Google Services plugin for Firebase (reads google-services.json)
    id("com.google.gms.google-services")
}

// ─────────────────────────────────────────────────────────
// Release signing: auto-generate key.properties from Replit
// Secrets (ANDROID_KEYSTORE_BASE64, ANDROID_STORE_PASSWORD,
// ANDROID_KEY_PASSWORD, ANDROID_KEY_ALIAS) when they are
// present. Falls back to key.properties if it already exists.
// Run `setup-android-signing.sh` locally first, then add the
// four printed values as Replit Secrets.
// ─────────────────────────────────────────────────────────
val keystoreBase64: String? = System.getenv("ANDROID_KEYSTORE_BASE64")
val storePasswordEnv: String? = System.getenv("ANDROID_STORE_PASSWORD")
val keyPasswordEnv: String? = System.getenv("ANDROID_KEY_PASSWORD")
val keyAliasEnv: String = System.getenv("ANDROID_KEY_ALIAS") ?: "freshveg"

val keyPropertiesFile = rootProject.file("key.properties")

// If all env secrets are present, decode keystore and write key.properties now
// (before signingConfigs reads it) so a single `flutter build appbundle` is enough.
if (!keystoreBase64.isNullOrBlank() && !storePasswordEnv.isNullOrBlank() && !keyPasswordEnv.isNullOrBlank()) {
    val keystoreFile = rootProject.file("../freshveg-release.jks")
    // getMimeDecoder tolerates line-wrapped base64 (common when pasting from terminal output)
    keystoreFile.writeBytes(Base64.getMimeDecoder().decode(keystoreBase64.trim()))

    keyPropertiesFile.writeText(
        "storePassword=$storePasswordEnv\n" +
        "keyPassword=$keyPasswordEnv\n" +
        "keyAlias=$keyAliasEnv\n" +
        "storeFile=../freshveg-release.jks\n"
    )
}

val hasReleaseKey = keyPropertiesFile.exists()
val keyProperties = Properties()
if (hasReleaseKey) {
    keyProperties.load(FileInputStream(keyPropertiesFile))
}

android {
    namespace = "com.freshveg.freshveg_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = "com.freshveg.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                keyAlias = keyProperties["keyAlias"] as String
                keyPassword = keyProperties["keyPassword"] as String
                // rootProject.file resolves from android/ (the Android root), so
                // "../freshveg-release.jks" correctly points to mobile root.
                // Using plain file() would resolve from android/app/ (one level too deep).
                storeFile = rootProject.file(keyProperties["storeFile"] as String)
                storePassword = keyProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKey) {
                signingConfigs.getByName("release")
            } else {
                // Signing secrets not found — using debug keys.
                // Add ANDROID_KEYSTORE_BASE64, ANDROID_STORE_PASSWORD,
                // ANDROID_KEY_PASSWORD, ANDROID_KEY_ALIAS to Replit Secrets
                // (see artifacts/freshveg-mobile/PUBLISH_GUIDE.md).
                logger.warn(
                    "\n\n⚠️  WARNING: Release signing secrets not configured.\n" +
                    "   The AAB is signed with debug keys and CANNOT be uploaded to Google Play.\n" +
                    "   Add ANDROID_* secrets to Replit and re-run `flutter build appbundle`.\n" +
                    "   See artifacts/freshveg-mobile/PUBLISH_GUIDE.md for instructions.\n"
                )
                signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}
