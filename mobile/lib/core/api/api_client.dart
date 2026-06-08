import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/auth/data/auth_notifier.dart';

// 10.0.2.2 → Android emulator localhost; override via env for physical device
const _kBaseUrl = String.fromEnvironment(
  'API_BASE',
  defaultValue: kIsWeb ? 'http://localhost:8443' : 'http://10.0.2.2:8443',
);

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _kBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 20),
    headers: {'Accept': 'application/json'},
  ));

  dio.interceptors.add(_AuthInterceptor(ref));
  return dio;
});

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._ref);
  final Ref _ref;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final authState = _ref.read(authNotifierProvider).valueOrNull;
    if (authState is AuthAuthenticated) {
      options.headers['Authorization'] = 'Bearer ${authState.tokens.accessToken}';
      final tenantId = authState.tenantId;
      if (tenantId != null) {
        options.headers['X-Tenant-Id'] = tenantId;
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Propagate — let callers decide to cache or retry
    handler.next(err);
  }
}
