import Flutter
import UIKit
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Explicitly configure Firebase (FirebaseAppDelegateProxyEnabled=false in Info.plist)
    FirebaseApp.configure()

    // Register as UNUserNotificationCenter delegate so foreground notifications
    // are delivered and taps are forwarded to FlutterLocalNotifications.
    UNUserNotificationCenter.current().delegate = self

    // Set Messaging delegate to receive FCM tokens via swizzle-free path.
    Messaging.messaging().delegate = self

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Forward APNs device token to Firebase Messaging (required when swizzling is off).
  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }
}

// MARK: - MessagingDelegate (FCM token refresh)
extension AppDelegate: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    // Token refresh is handled by the Flutter FcmService via onTokenRefresh stream.
    // No additional action needed here.
  }
}
