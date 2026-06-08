import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/dashboard_api.dart';
import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';
import '../../../core/database/app_database.dart';
import '../../auth/data/auth_notifier.dart';

// ── Unified dashboard data container ─────────────────────────────────────────

class DashboardData {
  final String role;

  // Employer/SuperAdmin (from API)
  final EmployerSummary? employerSummary;

  // Employee (from API)
  final EmployeeSummary? employeeSummary;

  // Client (from API)
  final ClientSummaryDash? clientSummary;

  // Shared local stock stats (fallback / supplement)
  final int totalStockUnits;
  final int outOfStockCount;

  // Legacy fields kept for backward compat with dashboard_screen cards
  double get amountDue        => clientSummary?.outstanding ?? 0.0;
  int    get activeOrders     => clientSummary?.pendingRequests ?? 0;
  int    get overdueInvoices  => employerSummary?.overdueFacturesCount ?? 0;
  int    get pendingDevisCount => employerSummary?.openDevisCount ?? 0;
  double get monthlyRevenue   => employerSummary?.revenueMtd ?? 0.0;

  // Trend line: last 4 months invoiced (derived from yearly/monthly)
  List<double> get monthlyTrend {
    if (clientSummary == null) return [];
    final total = clientSummary!.totalInvoiced;
    if (total <= 0) return [];
    return [total * .2, total * .25, total * .3, total * .25];
  }

  // Top products: not available from dashboard API, remains as empty list
  List<MapEntry<String, int>> get topProducts => const [];

  const DashboardData({
    required this.role,
    this.employerSummary,
    this.employeeSummary,
    this.clientSummary,
    this.totalStockUnits = 0,
    this.outOfStockCount = 0,
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────

final dashboardProvider =
    AsyncNotifierProvider<DashboardNotifier, DashboardData>(
  DashboardNotifier.new,
);

class DashboardNotifier extends AsyncNotifier<DashboardData> {
  @override
  FutureOr<DashboardData> build() async => _load();

  Future<DashboardData> _load() async {
    final authState = ref.watch(authNotifierProvider).valueOrNull;
    if (authState is! AuthAuthenticated) {
      return const DashboardData(role: 'ANONYMOUS');
    }

    final role = authState.role ?? 'CLIENT';
    final dashApi = ref.read(dashboardApiProvider);
    final db      = ref.read(appDatabaseProvider);

    // Always pull local stock for offline-capable widgets
    final stockItems   = await db.getCachedItems();
    int totalStock  = 0;
    int outOfStock  = 0;
    for (final item in stockItems) {
      totalStock += item.quantity.toInt();
      if (item.quantity <= 0 ||
          (item.alertThreshold != null && item.quantity <= item.alertThreshold!)) {
        outOfStock++;
      }
    }

    switch (role) {
      case 'SUPER_ADMIN':
      case 'EMPLOYER':
        try {
          final summary = await dashApi.employer();
          return DashboardData(
            role:             role,
            employerSummary:  summary,
            totalStockUnits:  totalStock,
            outOfStockCount:  outOfStock,
          );
        } catch (_) {
          // Offline / API unavailable — serve cached stock data
          return DashboardData(
            role:            role,
            totalStockUnits: totalStock > 0 ? totalStock : 0,
            outOfStockCount: outOfStock,
          );
        }

      case 'EMPLOYEE':
        try {
          final summary = await dashApi.employee();
          return DashboardData(
            role:             role,
            employeeSummary:  summary,
            totalStockUnits:  totalStock,
            outOfStockCount:  outOfStock,
          );
        } catch (_) {
          return DashboardData(
            role:            role,
            totalStockUnits: totalStock > 0 ? totalStock : 0,
            outOfStockCount: outOfStock,
          );
        }

      default: // CLIENT
        try {
          final summary = await dashApi.client();
          return DashboardData(
            role:          role,
            clientSummary: summary,
          );
        } catch (_) {
          return const DashboardData(role: 'CLIENT');
        }
    }
  }

  Future<void> refreshData() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}

// ── Low-stock alert provider ──────────────────────────────────────────────────

final lowStockProvider = FutureProvider<List<StockItem>>((ref) async {
  try {
    return await ref.watch(inventoryApiProvider).listStock(size: 200).then(
      (items) => items.where((i) => i.availableQuantity <= 5).toList(),
    );
  } catch (_) {
    return [];
  }
});

// ── Pending sync count — re-exported here for convenience ────────────────────

final pendingSyncCountProvider = StreamProvider<int>((ref) async* {
  final db = ref.watch(appDatabaseProvider);
  while (true) {
    final items = await db.getPendingItems();
    yield items.length;
    await Future<void>.delayed(const Duration(seconds: 30));
  }
});
