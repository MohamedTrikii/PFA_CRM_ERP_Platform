import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'core/notifications/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialise notification service (no-op until Firebase project is configured)
  await NotificationService().init();
  runApp(
    const ProviderScope(
      child: ErpApp(),
    ),
  );
}
