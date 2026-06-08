import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final crmApiProvider = Provider<CrmApi>(
  (ref) => CrmApi(ref.watch(dioProvider)),
);

class CrmApi {
  CrmApi(this._dio);
  final Dio _dio;

  Future<PageResult<ProspectSummary>> getProspects({
    int page = 0,
    int size = 50,
  }) async {
    final res = await _dio.get<dynamic>(
      '/api/v1/crm/prospects',
      queryParameters: {'page': page, 'size': size},
    );
    final raw = res.data;
    // API may return a Page object or a plain list
    if (raw is Map<String, dynamic>) {
      final content = (raw['content'] as List? ?? []);
      return PageResult<ProspectSummary>(
        content: content
            .map((e) => ProspectSummary.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalElements: raw['totalElements'] as int? ?? content.length,
        totalPages:    raw['totalPages'] as int? ?? 1,
        number:        raw['number'] as int? ?? 0,
      );
    }
    final list = (raw as List? ?? [])
        .map((e) => ProspectSummary.fromJson(e as Map<String, dynamic>))
        .toList();
    return PageResult<ProspectSummary>(
      content:       list,
      totalElements: list.length,
      totalPages:    1,
      number:        0,
    );
  }

  Future<ProspectSummary> createProspect(Map<String, dynamic> payload) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/crm/prospects',
      data: payload,
    );
    return ProspectSummary.fromJson(res.data!);
  }
}
