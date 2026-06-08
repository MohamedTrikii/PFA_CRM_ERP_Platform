import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final inventoryApiProvider = Provider<InventoryApi>(
  (ref) => InventoryApi(ref.watch(dioProvider)),
);

class InventoryApi {
  InventoryApi(this._dio);
  final Dio _dio;

  Future<List<StockItem>> listStock({int page = 0, int size = 200}) async {
    final pageResult = await getItems(page: page, size: size);
    return pageResult.content;
  }

  Future<PageResult<StockItem>> getItems({int page = 0, int size = 50}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/api/v1/inventory/items',
      queryParameters: {'page': page, 'size': size},
    );
    final data = res.data!;
    return PageResult<StockItem>(
      content:       (data['content'] as List).map((e) => StockItem.fromJson(e as Map<String, dynamic>)).toList(),
      totalElements: data['totalElements'] as int,
      totalPages:    data['totalPages']    as int,
      number:        data['number']        as int,
    );
  }

  Future<StockItem?> getItemByReference(String reference) async {
    final page = await getItems(size: 200);
    try {
      return page.content.firstWhere((i) => i.productReference == reference);
    } catch (_) {
      return null;
    }
  }

  Future<List<StockMovement>> getMovementsByProduct(String productId) async {
    final res = await _dio.get<List<dynamic>>(
      '/api/v1/inventory/movements/by-product/$productId',
    );
    return (res.data ?? [])
        .map((e) => StockMovement.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> recordMovement({
    required String productId,
    required String locationId,
    required String movementType,
    required double quantity,
    String? notes,
  }) async {
    await _dio.post<void>(
      '/api/v1/inventory/movements',
      data: {
        'productId':    productId,
        'locationId':   locationId,
        'movementType': movementType,
        'quantity':     quantity,
        if (notes != null) 'notes': notes,
      },
    );
  }

  Future<List<LocationModel>> getLocations() async {
    final res = await _dio.get<List<dynamic>>('/api/v1/inventory/locations');
    return (res.data ?? [])
        .map((e) => LocationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
