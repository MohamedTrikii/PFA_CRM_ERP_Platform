import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final dashboardApiProvider = Provider<DashboardApi>(
  (ref) => DashboardApi(ref.watch(dioProvider)),
);

class DashboardApi {
  DashboardApi(this._dio);
  final Dio _dio;

  Future<EmployerSummary> employer() async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/dashboard/employer',
    );
    return EmployerSummary.fromJson(res.data!);
  }

  Future<EmployeeSummary> employee() async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/dashboard/employee',
    );
    return EmployeeSummary.fromJson(res.data!);
  }

  Future<ClientSummaryDash> client() async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/dashboard/client',
    );
    return ClientSummaryDash.fromJson(res.data!);
  }
}
