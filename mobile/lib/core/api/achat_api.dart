import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final achatApiProvider = Provider<AchatApi>(
  (ref) => AchatApi(ref.watch(dioProvider)),
);

class AchatApi {
  AchatApi(this._dio);
  final Dio _dio;

  // ── Fournisseurs ──────────────────────────────────────────────────────────

  Future<List<FournisseurSummary>> getActiveFournisseurs() async {
    final res = await _dio.get<dynamic>(
      '/api/v1/achats/fournisseurs/active',
      queryParameters: {'page': 0, 'size': 100},
    );
    final raw = res.data;
    final list = raw is Map<String, dynamic>
        ? (raw['content'] as List? ?? [])
        : (raw as List? ?? []);
    return list
        .map((e) => FournisseurSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PageResult<FournisseurSummary>> getFournisseurs({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/achats/fournisseurs',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<FournisseurSummary>(
      content: (data['content'] as List)
          .map((e) => FournisseurSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  Future<FournisseurSummary> createFournisseur(
    Map<String, dynamic> payload,
  ) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/achats/fournisseurs',
      data: payload,
    );
    return FournisseurSummary.fromJson(res.data!);
  }

  // ── Bons de Commande ──────────────────────────────────────────────────────

  Future<PageResult<BonCommandeSummary>> getBonsCommande({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/achats/bons-commande',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<BonCommandeSummary>(
      content: (data['content'] as List)
          .map((e) => BonCommandeSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  Future<BonCommandeSummary> createBonCommande(
    Map<String, dynamic> payload,
  ) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/achats/bons-commande',
      data: payload,
    );
    return BonCommandeSummary.fromJson(res.data!);
  }

  Future<void> transitionBonCommande(
    String id,
    String targetStatus,
  ) async {
    await _dio.patch<void>(
      '/api/v1/achats/bons-commande/$id/transition',
      data: {'targetStatus': targetStatus},
    );
  }
}
