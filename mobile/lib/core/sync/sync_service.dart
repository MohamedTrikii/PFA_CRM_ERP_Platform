import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

import '../api/inventory_api.dart';
import '../database/app_database.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(
    db:  ref.watch(appDatabaseProvider),
    inv: ref.watch(inventoryApiProvider),
  );
});

class SyncService {
  SyncService({required this.db, required this.inv});

  final AppDatabase  db;
  final InventoryApi inv;
  final _log = Logger();

  bool _syncing = false;

  /// Enqueue a stock movement for offline sync.
  Future<void> enqueueMovement({
    required String productId,
    required String locationId,
    required String movementType,
    required double quantity,
    String? notes,
  }) async {
    final payload = jsonEncode({
      'productId':    productId,
      'locationId':   locationId,
      'movementType': movementType,
      'quantity':     quantity,
      if (notes != null) 'notes': notes,
    });
    await db.enqueueSyncItem(
      SyncQueueEntriesCompanion.insert(
        entityType: 'STOCK_MOVEMENT',
        payload:    payload,
      ),
    );
    _log.d('SyncService: enqueued STOCK_MOVEMENT for $productId');
  }

  /// Try to upload all pending items.  Call this on app resume or after reconnect.
  Future<SyncResult> syncPending() async {
    if (_syncing) return const SyncResult(uploaded: 0, failed: 0);
    _syncing = true;

    int uploaded = 0;
    int failed   = 0;

    try {
      final pending = await db.getPendingItems();
      for (final item in pending) {
        try {
          await _upload(item);
          await db.markSyncSuccess(item.id);
          uploaded++;
        } on DioException catch (e) {
          if (_isNetworkError(e)) {
            // Stop trying; still no connectivity
            break;
          }
          await db.markSyncFailed(item.id, item.retries);
          failed++;
          _log.w('SyncService: failed to sync item ${item.id}: $e');
        } catch (e) {
          await db.markSyncFailed(item.id, item.retries);
          failed++;
          _log.e('SyncService: unexpected error for item ${item.id}: $e');
        }
      }
    } finally {
      _syncing = false;
    }

    if (uploaded > 0) _log.i('SyncService: uploaded $uploaded item(s)');
    return SyncResult(uploaded: uploaded, failed: failed);
  }

  Future<void> _upload(SyncQueueEntry item) async {
    final payload = jsonDecode(item.payload) as Map<String, dynamic>;
    switch (item.entityType) {
      case 'STOCK_MOVEMENT':
        await inv.recordMovement(
          productId:    payload['productId'] as String,
          locationId:   payload['locationId'] as String,
          movementType: payload['movementType'] as String,
          quantity:     (payload['quantity'] as num).toDouble(),
          notes:        payload['notes'] as String?,
        );
      default:
        _log.w('SyncService: unknown entityType ${item.entityType}');
    }
  }

  bool _isNetworkError(DioException e) =>
      e.type == DioExceptionType.connectionTimeout ||
      e.type == DioExceptionType.connectionError   ||
      e.type == DioExceptionType.receiveTimeout;
}

class SyncResult {
  final int uploaded;
  final int failed;
  const SyncResult({required this.uploaded, required this.failed});
}

// ── Sync state notifier — tracks pending count ─────────────────────────────────

final pendingSyncCountProvider = StreamProvider<int>((ref) async* {
  final db = ref.watch(appDatabaseProvider);
  while (true) {
    final items = await db.getPendingItems();
    yield items.length;
    await Future<void>.delayed(const Duration(seconds: 30));
  }
});
