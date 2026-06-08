import 'dart:convert';
import 'dart:js' as js;

import 'package:dio/dio.dart';

import 'auth_models.dart';

class AuthService {
  final _dio = Dio();

  Future<AuthTokens> login() async {
    final mode = js.context.callMethod('prompt', [
      'Choose login mode for Web Dev:\n'
      '1 - Real Keycloak Login (Requires Keycloak running at localhost:8080 & Direct Access Grants enabled)\n'
      '2 - Mock Login (Instant login as Super Admin offline)\n\n'
      'Enter 1 or 2:',
      '2',
    ]) as String?;

    if (mode == '1') {
      final username = js.context.callMethod('prompt', ['Enter Keycloak Username:', 'superadmin']) as String?;
      if (username == null || username.trim().isEmpty) {
        return _mockLogin();
      }
      final password = js.context.callMethod('prompt', ['Enter Keycloak Password:', 'SuperAdmin@123']) as String?;
      if (password == null) {
        return _mockLogin();
      }

      try {
        final response = await _dio.post(
          'http://localhost:8080/realms/erp/protocol/openid-connect/token',
          data: {
            'grant_type': 'password',
            'username': username,
            'password': password,
            'client_id': kClientId,
            'scope': 'openid profile email offline_access',
          },
          options: Options(
            contentType: Headers.formUrlEncodedContentType,
          ),
        );

        final data = response.data;
        return AuthTokens(
          accessToken: data['access_token'] as String,
          refreshToken: data['refresh_token'] as String?,
          idToken: data['id_token'] as String?,
          accessTokenExpiry: DateTime.now().add(
            Duration(seconds: (data['expires_in'] as int? ?? 300)),
          ),
        );
      } catch (e) {
        js.context.callMethod('alert', [
          'Keycloak Direct Login failed.\n'
          'Error: $e\n\n'
          'Falling back to Mock Login.',
        ]);
        return _mockLogin();
      }
    }

    return _mockLogin();
  }

  Future<AuthTokens> refresh(String refreshToken) async {
    if (refreshToken == 'mock_refresh_token') {
      return _mockLogin();
    }

    try {
      final response = await _dio.post(
        'http://localhost:8080/realms/erp/protocol/openid-connect/token',
        data: {
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken,
          'client_id': kClientId,
          'scope': 'openid profile email offline_access',
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
        ),
      );

      final data = response.data;
      return AuthTokens(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String?,
        idToken: data['id_token'] as String?,
        accessTokenExpiry: DateTime.now().add(
          Duration(seconds: (data['expires_in'] as int? ?? 300)),
        ),
      );
    } catch (_) {
      return _mockLogin();
    }
  }

  Future<void> logout(String idToken) async {
    if (idToken == 'mock_id_token') return;

    try {
      await _dio.post(
        'http://localhost:8080/realms/erp/protocol/openid-connect/logout',
        data: {
          'client_id': kClientId,
          'refresh_token': idToken,
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
        ),
      );
    } catch (_) {}
  }

  AuthTokens _mockLogin() {
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'})));
    final payload = base64Url.encode(utf8.encode(jsonEncode({
      'tenant_id': '00000000-0000-0000-0000-000000000001',
      'realm_access': {
        'roles': ['SUPER_ADMIN']
      },
      'email': 'superadmin@erp.local',
      'sub': 'superadmin',
      'exp': DateTime.now().add(const Duration(hours: 2)).millisecondsSinceEpoch ~/ 1000,
    })));

    final jwt = '$header.$payload.mock_signature';

    return AuthTokens(
      accessToken: jwt,
      refreshToken: 'mock_refresh_token',
      idToken: 'mock_id_token',
      accessTokenExpiry: DateTime.now().add(const Duration(hours: 2)),
    );
  }
}
