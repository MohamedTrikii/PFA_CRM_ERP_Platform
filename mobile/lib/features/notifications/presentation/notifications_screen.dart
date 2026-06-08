import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/dashboard_api.dart';
import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';
import '../../auth/data/auth_notifier.dart';

// ── In-app notification model ─────────────────────────────────────────────────

enum NotifLevel { info, warning, critical }

class AppNotification {
  final String title;
  final String body;
  final NotifLevel level;
  final IconData icon;

  const AppNotification({
    required this.title,
    required this.body,
    required this.level,
    required this.icon,
  });
}

// ── Notification provider — derives alerts from dashboard + stock ─────────────

final notificationsProvider =
    FutureProvider<List<AppNotification>>((ref) async {
  final authState = ref.watch(authNotifierProvider).valueOrNull;
  if (authState is! AuthAuthenticated) return [];

  final role = authState.role ?? 'CLIENT';
  final notifications = <AppNotification>[];

  // Low-stock alerts from inventory
  try {
    final stockItems = await ref.read(inventoryApiProvider).listStock(size: 200);
    final lowStock = stockItems.where((i) => i.availableQuantity <= 5).toList();
    final outOfStock = stockItems.where((i) => i.availableQuantity <= 0).toList();

    if (outOfStock.isNotEmpty) {
      notifications.add(AppNotification(
        title: 'Rupture de stock',
        body: '${outOfStock.length} article(s) en rupture de stock.',
        level: NotifLevel.critical,
        icon: Icons.warning_rounded,
      ));
    } else if (lowStock.isNotEmpty) {
      notifications.add(AppNotification(
        title: 'Stock faible',
        body: '${lowStock.length} article(s) sous le seuil d\'alerte.',
        level: NotifLevel.warning,
        icon: Icons.inventory_2,
      ));
    }
  } catch (_) {}

  // Employer / Super Admin specific alerts
  if (role == 'EMPLOYER' || role == 'SUPER_ADMIN') {
    try {
      final summary = await ref.read(dashboardApiProvider).employer();

      if (summary.overdueFacturesCount > 0) {
        notifications.add(AppNotification(
          title: 'Factures en retard',
          body: '${summary.overdueFacturesCount} facture(s) client impayée(s) dépassent leur échéance.',
          level: NotifLevel.critical,
          icon: Icons.receipt_long,
        ));
      }

      if (summary.openDevisCount > 0) {
        notifications.add(AppNotification(
          title: 'Devis en attente',
          body: '${summary.openDevisCount} devis ouvert(s) en cours de négociation.',
          level: NotifLevel.info,
          icon: Icons.description,
        ));
      }

      if (summary.pendingRequestsCount > 0) {
        notifications.add(AppNotification(
          title: 'Nouvelles demandes',
          body: '${summary.pendingRequestsCount} demande(s) de devis à traiter.',
          level: NotifLevel.warning,
          icon: Icons.inbox,
        ));
      }

      if (summary.pendingLivraisonsCount > 0) {
        notifications.add(AppNotification(
          title: 'Livraisons en cours',
          body: '${summary.pendingLivraisonsCount} livraison(s) en attente de traitement.',
          level: NotifLevel.info,
          icon: Icons.local_shipping,
        ));
      }
    } catch (_) {}
  }

  // Employee specific
  if (role == 'EMPLOYEE') {
    try {
      final summary = await ref.read(dashboardApiProvider).employee();

      if (summary.livraisonsEnPreparation > 0) {
        notifications.add(AppNotification(
          title: 'Livraisons à préparer',
          body: '${summary.livraisonsEnPreparation} livraison(s) en cours de préparation.',
          level: NotifLevel.info,
          icon: Icons.inventory,
        ));
      }

      if (summary.requestsNouveaux > 0) {
        notifications.add(AppNotification(
          title: 'Nouvelles demandes',
          body: '${summary.requestsNouveaux} nouvelle(s) demande(s) reçue(s).',
          level: NotifLevel.warning,
          icon: Icons.inbox,
        ));
      }
    } catch (_) {}
  }

  // Client specific
  if (role == 'CLIENT') {
    try {
      final summary = await ref.read(dashboardApiProvider).client();
      final outstanding = summary.outstanding;

      if (outstanding > 0) {
        notifications.add(AppNotification(
          title: 'Montant dû',
          body: '${outstanding.toStringAsFixed(2)} MAD restant à régler.',
          level: outstanding > 10000 ? NotifLevel.critical : NotifLevel.warning,
          icon: Icons.account_balance_wallet,
        ));
      }
    } catch (_) {}
  }

  if (notifications.isEmpty) {
    notifications.add(const AppNotification(
      title: 'Tout est en ordre',
      body: 'Aucune alerte active pour le moment.',
      level: NotifLevel.info,
      icon: Icons.check_circle,
    ));
  }

  return notifications;
});

// ── Notification count badge ──────────────────────────────────────────────────

final notificationCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).when(
    data: (list) =>
        list.where((n) => n.level != NotifLevel.info).length,
    loading: () => 0,
    error: (_, __) => 0,
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(notificationsProvider),
          ),
        ],
      ),
      body: notifsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              const Text('Impossible de charger les alertes'),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(notificationsProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (notifications) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: notifications.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (_, i) => _NotifCard(notif: notifications[i]),
        ),
      ),
    );
  }
}

// ── Notification card ─────────────────────────────────────────────────────────

class _NotifCard extends StatelessWidget {
  final AppNotification notif;
  const _NotifCard({required this.notif});

  Color get _bgColor {
    switch (notif.level) {
      case NotifLevel.critical: return Colors.red.shade50;
      case NotifLevel.warning:  return Colors.orange.shade50;
      case NotifLevel.info:     return Colors.blue.shade50;
    }
  }

  Color get _borderColor {
    switch (notif.level) {
      case NotifLevel.critical: return Colors.red.shade200;
      case NotifLevel.warning:  return Colors.orange.shade200;
      case NotifLevel.info:     return Colors.blue.shade200;
    }
  }

  Color get _iconColor {
    switch (notif.level) {
      case NotifLevel.critical: return Colors.red;
      case NotifLevel.warning:  return Colors.orange;
      case NotifLevel.info:     return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(notif.icon, color: _iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notif.title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: _iconColor.shade900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  notif.body,
                  style: TextStyle(
                      fontSize: 13,
                      color: _iconColor.shade800.withOpacity(0.85)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

extension on Color {
  // Shade darker by blending with black
  Color get shade800 => Color.lerp(this, Colors.black, 0.3) ?? this;
  Color get shade900 => Color.lerp(this, Colors.black, 0.4) ?? this;
}
