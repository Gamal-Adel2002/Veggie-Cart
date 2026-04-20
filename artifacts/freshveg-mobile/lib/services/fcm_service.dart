import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background messages
}

class FcmService {
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static const _channelId = 'freshveg_channel';
  static const _channelName = 'FreshVeg Notifications';

  static Future<void> initialize() async {
    try {
      await _localNotifications.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );

      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      await FirebaseMessaging.instance
          .requestPermission(alert: true, badge: true, sound: true);

      FirebaseMessaging.onMessage.listen((message) {
        _showLocalNotification(message);
      });

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await _sendTokenToBackend(token);
      }

      FirebaseMessaging.instance.onTokenRefresh.listen(_sendTokenToBackend);
    } catch (e) {
      // Firebase not configured — skip silently
    }
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
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }
}
