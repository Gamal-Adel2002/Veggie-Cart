import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'api_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background message — Firebase handles display automatically
}

class FcmService {
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static const _channelId = 'freshveg_channel';
  static const _channelName = 'FreshVeg Notifications';
  static GoRouter? _router;

  static const _androidChannel = AndroidNotificationChannel(
    _channelId,
    _channelName,
    description: 'FreshVeg order and delivery updates',
    importance: Importance.high,
  );

  /// Call once after the router is created so deep-link taps can navigate.
  static void setRouter(GoRouter router) {
    _router = router;
  }

  static Future<void> initialize() async {
    try {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_androidChannel);

      await _localNotifications.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
      );

      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        final token = await FirebaseMessaging.instance.getToken();
        if (token != null) {
          await _sendTokenToBackend(token);
        }
        FirebaseMessaging.instance.onTokenRefresh.listen(_sendTokenToBackend);
      }

      FirebaseMessaging.onMessage.listen(_showLocalNotification);

      // Handle notification tap when app is in foreground/background (not terminated)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Handle notification tap when app was terminated
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        // Delay to allow router to initialize before navigating
        Future.delayed(const Duration(milliseconds: 500), () {
          _handleNotificationTap(initialMessage);
        });
      }
    } catch (_) {
      // Firebase not configured — silently skip
    }
  }

  static void _handleNotificationTap(RemoteMessage message) {
    if (_router == null) return;
    final data = message.data;
    final screen = data['screen'] as String?;

    if (screen != null && screen.isNotEmpty) {
      // Backend sends explicit route (e.g. '/orders/42', '/messages')
      _router!.go(screen);
    } else {
      // Default: send customer to their orders list
      final role = data['role'] as String? ?? 'customer';
      switch (role) {
        case 'admin':
          _router!.go('/admin/orders');
        case 'delivery':
          _router!.go('/delivery/orders');
        default:
          _router!.go('/account/orders');
      }
    }
  }

  /// Call after a successful login to register the current device token
  static Future<void> sendCurrentToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _sendTokenToBackend(token);
    } catch (_) {}
  }

  /// Call before logout to unregister this device
  static Future<void> deleteToken() async {
    try {
      await apiClient.delete('/notifications/fcm-token');
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }

  static Future<void> _sendTokenToBackend(String token) async {
    try {
      await apiClient.post('/notifications/fcm-token', data: {'token': token});
    } catch (_) {}
  }

  static Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: 'FreshVeg order and delivery updates',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }
}
