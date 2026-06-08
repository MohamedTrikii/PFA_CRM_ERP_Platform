import 'auth_models.dart';

class AuthService {
  Future<AuthTokens> login() => throw UnsupportedError('Platform not supported');
  Future<AuthTokens> refresh(String refreshToken) => throw UnsupportedError('Platform not supported');
  Future<void> logout(String idToken) => throw UnsupportedError('Platform not supported');
}
