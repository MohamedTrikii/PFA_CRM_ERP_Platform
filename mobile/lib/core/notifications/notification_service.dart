import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// FCM push notification service.
///
/// SETUP REQUIRED before running:
///   1. Create a Firebase project at https://console.firebase.google.com
///   2. Add Android app with package name `com.erp.mobile`
///   3. Download `google-services.json` → place at `android/app/google-services.json`
///   4. Add iOS app → download `GoogleService-Info.plist` → place at `ios/Runner/`
///   5. Run: `flutter pub add firebase_core firebase_messaging`
///   6. Run: `flutterfire configure`
///   7. Uncomment the FirebaseMessaging calls below.
///
/// The backend side (Spring) would call FCM v1 API via a service account
/// when a new Livraison is assigned to an EMPLOYEE.
///
/// Until Firebase is configured, this service is a no-op stub.

final notificationServiceProvider = Provider<NotificationService>(
  (ref) => NotificationService(),
);

class NotificationService {
  final _log = Logger();

  Future<void> init() async {
    _log.i('NotificationService: Firebase setup required — see file header');
    // TODO: Uncomment after Firebase project is configured:
    //
    // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    // final messaging = FirebaseMessaging.instance;
    //
    // final settings = await messaging.requestPermission(
    //   alert: true, badge: true, sound: true,
    // );
    // if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    //   final token = await messaging.getToken();
    //   _log.i('FCM token: $token');
    //   await _saveToken(token);
    // }
    //
    // FirebaseMessaging.onMessage.listen(_handleForeground);
    // FirebaseMessaging.onMessageOpenedApp.listen(_handleBackground);
  }

  // void _handleForeground(RemoteMessage message) {
  //   _log.d('FCM foreground: ${message.notification?.title}');
  //   // Show in-app snackbar or local notification
  // }
  //
  // void _handleBackground(RemoteMessage message) {
  //   _log.d('FCM background tap: ${message.data}');
  // }

  Future<void> saveToken(String? token) async {
    if (token == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('fcm_token', token);
  }

  Future<String?> getSavedToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('fcm_token');
  }
}
