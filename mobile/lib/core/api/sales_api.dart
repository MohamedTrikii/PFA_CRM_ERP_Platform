import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final salesApiProvider = Provider<SalesApi>(
  (ref) => SalesApi(ref.watch(dioProvider)),
);

class SalesApi {
  SalesApi(this._dio);
  final Dio _dio;

  // ── Products ──────────────────────────────────────────────────────────────

  Future<List<ProductSummary>> getActiveProducts() async {
    final res = await _dio.get<List<dynamic>>('/api/v1/sales/products/active');
    return (res.data ?? [])
        .map((e) => ProductSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PageResult<ProductSummary>> getProducts({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/products',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<ProductSummary>(
      content: (data['content'] as List)
          .map((e) => ProductSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  Future<ProductSummary> createProduct(Map<String, dynamic> payload) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/sales/products',
      data: payload,
    );
    return ProductSummary.fromJson(res.data!);
  }

  // ── Devis ─────────────────────────────────────────────────────────────────

  Future<PageResult<DevisSummary>> getDevis({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/devis',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<DevisSummary>(
      content: (data['content'] as List)
          .map((e) => DevisSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  Future<DevisSummary> createDevis(Map<String, dynamic> payload) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/sales/devis',
      data: payload,
    );
    return DevisSummary.fromJson(res.data!);
  }

  Future<void> transitionDevis(String id, String targetStatus) async {
    await _dio.patch<void>(
      '/api/v1/sales/devis/$id/status',
      data: {'targetStatus': targetStatus},
    );
  }

  // ── Commandes ─────────────────────────────────────────────────────────────

  Future<PageResult<CommandeSummary>> getCommandes({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/commandes',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<CommandeSummary>(
      content: (data['content'] as List)
          .map((e) => CommandeSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  // ── Livraisons ────────────────────────────────────────────────────────────

  Future<PageResult<LivraisonSummary>> getLivraisons({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/livraisons',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<LivraisonSummary>(
      content: (data['content'] as List)
          .map((e) => LivraisonSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }

  // ── Factures ──────────────────────────────────────────────────────────────

  Future<PageResult<FactureFullSummary>> getFactures({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/factures',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<FactureFullSummary>(
      content: (data['content'] as List)
          .map((e) => FactureFullSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages'] as int,
      number:        data['number'] as int,
    );
  }
}
