import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final portalApiProvider = Provider<PortalApi>(
  (ref) => PortalApi(ref.watch(dioProvider)),
);

class PortalApi {
  PortalApi(this._dio);
  final Dio _dio;

  Future<List<DevisSummary>> myDevis() async {
    final res = await _dio.get<List<dynamic>>('/api/v1/sales/portal/devis');
    return (res.data ?? []).map((e) => DevisSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<FactureSummary>> myFactures() async {
    final res = await _dio.get<List<dynamic>>('/api/v1/sales/portal/factures');
    return (res.data ?? []).map((e) => FactureSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<DevisRequestSummary>> myRequests() async {
    final res = await _dio.get<List<dynamic>>('/api/v1/sales/portal/requests');
    return (res.data ?? []).map((e) => DevisRequestSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<int>> downloadDevisPdf(String devisId) async {
    final res = await _dio.get<List<int>>(
      '/api/v1/sales/portal/devis/$devisId/pdf',
      options: Options(responseType: ResponseType.bytes),
    );
    return res.data ?? [];
  }

  Future<List<int>> downloadFacturePdf(String factureId) async {
    final res = await _dio.get<List<int>>(
      '/api/v1/sales/portal/factures/$factureId/pdf',
      options: Options(responseType: ResponseType.bytes),
    );
    return res.data ?? [];
  }

  Future<void> submitRequest(Map<String, dynamic> payload) async {
    await _dio.post<void>('/api/v1/sales/requests/public', data: payload);
  }

  // ── Devis Creation (Employer/Super Admin) ──────────────────────────────────

  Future<DevisSummary> createDevis(DevisFormData data) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/sales/devis',
      data: data.toJson(),
    );
    return DevisSummary.fromJson(res.data ?? {});
  }

  Future<DevisSummary> updateDevis(String devisId, DevisFormData data) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/api/v1/sales/devis/$devisId',
      data: data.toJson(),
    );
    return DevisSummary.fromJson(res.data ?? {});
  }

  Future<void> sendDevis(String devisId) async {
    await _dio.post<void>('/api/v1/sales/devis/$devisId/send');
  }

  Future<List<DevisSummary>> listDevis({int page = 0, int size = 20}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/sales/devis',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data?['content'] as List? ?? [];
    return data.map((e) => DevisSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ── Purchase Invoices (Employer/Super Admin) ───────────────────────────────

  Future<PurchaseInvoiceSummary> createPurchaseInvoice(PurchaseInvoiceData data) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/v1/purchases/invoices',
      data: data.toJson(),
    );
    return PurchaseInvoiceSummary.fromJson(res.data ?? {});
  }

  Future<PurchaseInvoiceSummary> updatePurchaseInvoice(
    String invoiceId,
    PurchaseInvoiceData data,
  ) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/api/v1/purchases/invoices/$invoiceId',
      data: data.toJson(),
    );
    return PurchaseInvoiceSummary.fromJson(res.data ?? {});
  }

  Future<List<PurchaseInvoiceSummary>> listPurchaseInvoices({
    int page = 0,
    int size = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/purchases/invoices',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data?['content'] as List? ?? [];
    return data.map((e) => PurchaseInvoiceSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> deletePurchaseInvoice(String invoiceId) async {
    await _dio.delete<void>('/api/v1/purchases/invoices/$invoiceId');
  }
}
