import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/sync/sync_service.dart' hide pendingSyncCountProvider;
import '../../../core/theme/theme_provider.dart';
import '../../auth/data/auth_notifier.dart';
import '../../search/presentation/search_screen.dart';
import 'dashboard_cards.dart';
import 'dashboard_provider.dart';

final _fmt = NumberFormat('#,##0', 'fr_MA');

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync   = ref.watch(dashboardProvider);
    final authState        = ref.watch(authNotifierProvider).valueOrNull;
    final pendingSyncAsync = ref.watch(pendingSyncCountProvider);

    final userName = (authState is AuthAuthenticated)
        ? (authState.claims['given_name'] ??
            authState.email?.split('@').first ??
            'Utilisateur')
        : 'Utilisateur';

    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de Bord',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Recherche globale',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SearchScreen()),
            ),
          ),
          IconButton(
            icon: Icon(themeMode == ThemeMode.dark
                ? Icons.light_mode
                : Icons.dark_mode),
            tooltip: 'Changer le thème',
            onPressed: () =>
                ref.read(themeModeProvider.notifier).setTheme(
                  themeMode == ThemeMode.dark
                      ? ThemeMode.light
                      : ThemeMode.dark,
                ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(dashboardProvider.notifier).refreshData(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () =>
                ref.read(authNotifierProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(dashboardProvider.notifier).refreshData(),
        child: dashboardAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text('Erreur de chargement: $e',
                    textAlign: TextAlign.center),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.read(dashboardProvider.notifier).refreshData(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Réessayer'),
                ),
              ],
            ),
          ),
          data: (data) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _WelcomeBanner(
                name: userName as String,
                role: data.role,
              ),
              const SizedBox(height: 12),
              pendingSyncAsync.when(
                data: (count) => count > 0
                    ? _SyncBanner(count: count, ref: ref)
                    : const _SyncOkBadge(),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 16),
              _buildRoleDashboard(data, context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleDashboard(DashboardData data, BuildContext context) {
    switch (data.role) {
      case 'CLIENT':
        return _ClientDashboard(data: data);
      case 'EMPLOYEE':
        return _EmployeeDashboard(data: data);
      default:
        return _EmployerDashboard(data: data);
    }
  }
}

// ── Client Dashboard ──────────────────────────────────────────────────────────

class _ClientDashboard extends StatelessWidget {
  final DashboardData data;
  const _ClientDashboard({required this.data});

  @override
  Widget build(BuildContext context) {
    final s = data.clientSummary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.3,
          children: [
            MetricCard(
              title: 'Montant Dû',
              value: '${_fmt.format(s?.outstanding ?? 0)} MAD',
              subtitle: 'À régler',
              icon: Icons.account_balance_wallet,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFFFF9800), Color(0xFFFF5722)],
            ),
            MetricCard(
              title: 'Devis Acceptés',
              value: '${s?.acceptedDevis ?? 0} / ${s?.totalDevis ?? 0}',
              subtitle: 'Total devis',
              icon: Icons.description,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF3F51B5), Color(0xFF2196F3)],
            ),
            MetricCard(
              title: 'Demandes',
              value: '${s?.pendingRequests ?? 0}',
              subtitle: 'En cours',
              icon: Icons.send,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF673AB7), Color(0xFF9C27B0)],
            ),
            MetricCard(
              title: 'Total Facturé',
              value: '${_fmt.format(s?.totalInvoiced ?? 0)} MAD',
              subtitle: 'Payé: ${_fmt.format(s?.totalPaid ?? 0)} MAD',
              icon: Icons.receipt_long,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF009688), Color(0xFF4CAF50)],
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (data.monthlyTrend.isNotEmpty)
          TrendChartCard(data: data.monthlyTrend),
      ],
    );
  }
}

// ── Employee Dashboard ────────────────────────────────────────────────────────

class _EmployeeDashboard extends StatelessWidget {
  final DashboardData data;
  const _EmployeeDashboard({required this.data});

  @override
  Widget build(BuildContext context) {
    final s = data.employeeSummary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.3,
          children: [
            MetricCard(
              title: 'En Préparation',
              value: '${s?.livraisonsEnPreparation ?? 0}',
              subtitle: 'Livraisons à préparer',
              icon: Icons.inventory,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF3F51B5), Color(0xFF2196F3)],
            ),
            MetricCard(
              title: 'Prêtes',
              value: '${s?.livraisonsPretes ?? 0}',
              subtitle: 'Livraisons à expédier',
              icon: Icons.local_shipping,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF009688), Color(0xFF4CAF50)],
            ),
            MetricCard(
              title: 'Commandes',
              value: '${s?.openCommandes ?? 0}',
              subtitle: 'Commandes ouvertes',
              icon: Icons.shopping_bag,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF673AB7), Color(0xFF9C27B0)],
            ),
            MetricCard(
              title: 'Demandes',
              value: '${s?.requestsNouveaux ?? 0}',
              subtitle: 'Nouvelles demandes',
              icon: Icons.inbox,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFFFF9800), Color(0xFFFF5722)],
            ),
          ],
        ),
        const SizedBox(height: 16),
        _StockAlertsCard(
          total: data.totalStockUnits,
          alerts: data.outOfStockCount,
        ),
      ],
    );
  }
}

// ── Employer / Super Admin Dashboard ─────────────────────────────────────────

class _EmployerDashboard extends StatelessWidget {
  final DashboardData data;
  const _EmployerDashboard({required this.data});

  @override
  Widget build(BuildContext context) {
    final s = data.employerSummary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.3,
          children: [
            MetricCard(
              title: 'Devis Ouverts',
              value: '${s?.openDevisCount ?? data.pendingDevisCount}',
              subtitle: 'En négociation',
              icon: Icons.description,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF673AB7), Color(0xFF9C27B0)],
            ),
            MetricCard(
              title: 'CA du Mois',
              value: '${_fmt.format(s?.revenueMtd ?? data.monthlyRevenue)} MAD',
              subtitle: 'Facturé (payé)',
              icon: Icons.trending_up,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF3F51B5), Color(0xFF2196F3)],
            ),
            MetricCard(
              title: 'Stock Total',
              value: '${_fmt.format(data.totalStockUnits)} u.',
              subtitle: '${data.outOfStockCount} alertes stock',
              icon: Icons.inventory_2,
              iconColor: Colors.white,
              gradientColors: const [Color(0xFF009688), Color(0xFF4CAF50)],
            ),
            MetricCard(
              title: 'Factures En Retard',
              value: '${s?.overdueFacturesCount ?? data.overdueInvoices}',
              subtitle: 'Paiement requis',
              icon: Icons.warning_amber_rounded,
              iconColor: Colors.white,
              gradientColors: s?.overdueFacturesCount != null &&
                      s!.overdueFacturesCount > 0
                  ? const [Color(0xFFE91E63), Color(0xFF9C27B0)]
                  : const [Color(0xFF4CAF50), Color(0xFF009688)],
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (s != null && s.salesFunnel.isNotEmpty)
          SalesFunnelCard(funnel: s.salesFunnel),
        const SizedBox(height: 16),
        _RevenueCard(
          revenueMtd: s?.revenueMtd ?? 0,
          revenueYtd: s?.revenueYtd ?? 0,
          pendingLivraisons: s?.pendingLivraisonsCount ?? 0,
          pendingRequests: s?.pendingRequestsCount ?? 0,
        ),
      ],
    );
  }
}

// ── Stock Alerts Card ─────────────────────────────────────────────────────────

class _StockAlertsCard extends StatelessWidget {
  final int total;
  final int alerts;
  const _StockAlertsCard({required this.total, required this.alerts});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: alerts > 0 ? Colors.red.shade50 : Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                alerts > 0 ? Icons.gpp_maybe : Icons.check_circle,
                color: alerts > 0 ? Colors.red : Colors.green,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Stock: $total unités',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Text(
                    alerts > 0
                        ? '$alerts article(s) sous le seuil d\'alerte'
                        : 'Aucune alerte de stock',
                    style: TextStyle(
                      color: alerts > 0
                          ? Colors.red.shade700
                          : Colors.green.shade700,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Revenue Summary Card ──────────────────────────────────────────────────────

class _RevenueCard extends StatelessWidget {
  final double revenueMtd;
  final double revenueYtd;
  final int pendingLivraisons;
  final int pendingRequests;
  const _RevenueCard({
    required this.revenueMtd,
    required this.revenueYtd,
    required this.pendingLivraisons,
    required this.pendingRequests,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Synthèse',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _Row('CA Annuel', '${_fmt.format(revenueYtd)} MAD'),
            _Row('CA Mensuel', '${_fmt.format(revenueMtd)} MAD'),
            _Row('Livraisons en attente', '$pendingLivraisons'),
            _Row('Demandes en attente', '$pendingRequests'),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

// ── Welcome Banner ────────────────────────────────────────────────────────────

class _WelcomeBanner extends StatelessWidget {
  final String name;
  final String role;
  const _WelcomeBanner({required this.name, required this.role});

  String get _subtitle {
    switch (role) {
      case 'CLIENT':
        return 'Bienvenue. Retrouvez vos devis et factures.';
      case 'EMPLOYEE':
        return 'Vue opérationnelle : livraisons, stock, commandes.';
      default:
        return 'Vue globale de l\'activité commerciale et des stocks.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color:
              Theme.of(context).colorScheme.primary.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bonjour, $name',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context)
                      .colorScheme
                      .onPrimaryContainer,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            _subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onPrimaryContainer
                      .withOpacity(0.8),
                ),
          ),
        ],
      ),
    );
  }
}

// ── Sync Banners ──────────────────────────────────────────────────────────────

class _SyncBanner extends StatelessWidget {
  final int count;
  final WidgetRef ref;
  const _SyncBanner({required this.count, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.sync_problem, color: Colors.orange, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '$count modification(s) hors-ligne en attente',
              style: TextStyle(
                  color: Colors.orange.shade900,
                  fontWeight: FontWeight.w500,
                  fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: () => ref.read(syncServiceProvider).syncPending(),
            child: const Text('Synchroniser',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _SyncOkBadge extends StatelessWidget {
  const _SyncOkBadge();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          Icon(Icons.cloud_done, color: Colors.green.shade400, size: 16),
          const SizedBox(width: 8),
          Text(
            'Synchronisé',
            style: TextStyle(
                color: Colors.green.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
