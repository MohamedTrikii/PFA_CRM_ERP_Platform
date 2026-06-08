import 'package:flutter/foundation.dart';

const kIssuer = kIsWeb
    ? 'http://localhost:8080/realms/erp'
    : 'http://10.0.2.2:8080/realms/erp';
const kIssuerWeb = 'http://localhost:8080/realms/erp';
const kClientId = 'erp-mobile';
const kRedirectUri = 'com.erp.mobile:/oauthredirect';
const kScopes = ['openid', 'profile', 'email', 'offline_access'];

class AuthTokens {
  final String accessToken;
  final String? refreshToken;
  final String? idToken;
  final DateTime? accessTokenExpiry;

  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.idToken,
    this.accessTokenExpiry,
  });

  bool get isExpired =>
      accessTokenExpiry != null &&
      DateTime.now().isAfter(accessTokenExpiry!);
}
