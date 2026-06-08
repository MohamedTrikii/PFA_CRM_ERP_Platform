import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_service.dart';

// ── State ──────────────────────────────────────────────────────────────────────
sealed class AuthState {
  const AuthState();
}

class AuthInitial    extends AuthState { const AuthInitial(); }
class AuthLoading    extends AuthState { const AuthLoading(); }
class AuthAuthenticated extends AuthState {
  final AuthTokens tokens;
  final Map<String, dynamic> claims;
  const AuthAuthenticated(this.tokens, this.claims);

  String? get tenantId  => claims['tenant_id'] as String?;
  String? get role      => (claims['realm_access']?['roles'] as List?)?.firstOrNull as String?;
  String? get email     => claims['email'] as String?;
  String? get subject   => claims['sub'] as String?;
}
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

// ── Storage keys ───────────────────────────────────────────────────────────────
const _kAccessToken  = 'auth.access_token';
const _kRefreshToken = 'auth.refresh_token';
const _kIdToken      = 'auth.id_token';

// ── Provider ───────────────────────────────────────────────────────────────────
final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

// ── Notifier ───────────────────────────────────────────────────────────────────
class AuthNotifier extends AsyncNotifier<AuthState> {

  AuthService get _svc => ref.read(authServiceProvider);

  @override
  Future<AuthState> build() async {
    // Try to restore session from SharedPreferences on app start
    final prefs = await SharedPreferences.getInstance();
    final accessToken  = prefs.getString(_kAccessToken);
    final refreshToken = prefs.getString(_kRefreshToken);

    if (accessToken == null || refreshToken == null) return const AuthInitial();

    try {
      // Attempt silent refresh to get a fresh token
      final tokens = await _svc.refresh(refreshToken);
      await _persist(tokens, prefs);
      return AuthAuthenticated(tokens, _decode(tokens.accessToken));
    } catch (_) {
      await _clear(prefs);
      return const AuthInitial();
    }
  }

  Future<void> login() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final tokens = await _svc.login();
      final prefs  = await SharedPreferences.getInstance();
      await _persist(tokens, prefs);
      return AuthAuthenticated(tokens, _decode(tokens.accessToken));
    });
  }

  Future<void> logout() async {
    final current = state.valueOrNull;
    final idToken = (current is AuthAuthenticated)
        ? current.tokens.idToken
        : null;

    final prefs = await SharedPreferences.getInstance();
    await _clear(prefs);
    state = const AsyncValue.data(AuthInitial());

    if (idToken != null) {
      try { await _svc.logout(idToken); } catch (_) {}
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  Future<void> _persist(AuthTokens tokens, SharedPreferences prefs) async {
    await prefs.setString(_kAccessToken,  tokens.accessToken);
    if (tokens.refreshToken != null) {
      await prefs.setString(_kRefreshToken, tokens.refreshToken!);
    }
    if (tokens.idToken != null) {
      await prefs.setString(_kIdToken, tokens.idToken!);
    }
  }

  Future<void> _clear(SharedPreferences prefs) async {
    await prefs.remove(_kAccessToken);
    await prefs.remove(_kRefreshToken);
    await prefs.remove(_kIdToken);
  }

  /// Decode JWT payload without verifying signature (server already validated it).
  Map<String, dynamic> _decode(String jwt) {
    final parts = jwt.split('.');
    if (parts.length < 2) return {};
    final payload = base64Url.decode(base64Url.normalize(parts[1]));
    return jsonDecode(utf8.decode(payload)) as Map<String, dynamic>;
  }
}
