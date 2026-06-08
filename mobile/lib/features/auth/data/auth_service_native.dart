import 'package:flutter_appauth/flutter_appauth.dart';

import 'auth_models.dart';

class AuthService {
  final _appAuth = const FlutterAppAuth();

  Future<AuthTokens> login() async {
    final result = await _appAuth.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        kClientId,
        kRedirectUri,
        issuer: kIssuer,
        scopes: kScopes,
        preferEphemeralSession: true,
      ),
    );

    return AuthTokens(
      accessToken:       result.accessToken!,
      refreshToken:      result.refreshToken,
      idToken:           result.idToken,
      accessTokenExpiry: result.accessTokenExpirationDateTime,
    );
  }

  Future<AuthTokens> refresh(String refreshToken) async {
    final result = await _appAuth.token(
      TokenRequest(
        kClientId,
        kRedirectUri,
        issuer: kIssuer,
        refreshToken: refreshToken,
        scopes: kScopes,
      ),
    );

    return AuthTokens(
      accessToken:       result.accessToken!,
      refreshToken:      result.refreshToken ?? refreshToken,
      idToken:           result.idToken,
      accessTokenExpiry: result.accessTokenExpirationDateTime,
    );
  }

  Future<void> logout(String idToken) async {
    await _appAuth.endSession(
      EndSessionRequest(
        idTokenHint:             idToken,
        issuer:                  kIssuer,
        postLogoutRedirectUrl:   kRedirectUri,
        preferEphemeralSession:  true,
      ),
    );
  }
}
