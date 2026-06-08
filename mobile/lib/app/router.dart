import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/achats/presentation/achats_screen.dart';
import '../features/auth/data/auth_notifier.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/crm/presentation/prospects_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/inventory/presentation/barcode_scanner_screen.dart';
import '../features/inventory/presentation/inventory_list_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/portal/presentation/client_portal_screen.dart';
import '../features/portal/presentation/purchase_invoice_screen.dart';
import '../features/sales/presentation/ventes_screen.dart';
import '../features/search/presentation/search_screen.dart';
import '../core/sync/sync_service.dart';

// ── Root router ────────────────────────────────────────────────────────────────

class ErpRouter extends ConsumerWidget {
  const ErpRouter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authNotifierProvider);

    return authAsync.when(
      loading: () => const _Splash(),
      error:   (_, __) => const LoginScreen(),
      data:    (state) => switch (state) {
        AuthAuthenticated() => _HomeShell(auth: state),
        _                   => const LoginScreen(),
      },
    );
  }
}

// ── Splash while restoring session ────────────────────────────────────────────

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

// ── Main shell — adapts navigation to role ────────────────────────────────────

class _HomeShell extends ConsumerStatefulWidget {
  const _HomeShell({required this.auth});
  final AuthAuthenticated auth;

  @override
  ConsumerState<_HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<_HomeShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(syncServiceProvider).syncPending());
  }

  List<_NavEntry> get _navEntries {
    final role = widget.auth.role ?? '';
    switch (role) {
      case 'CLIENT':
        return [
          _NavEntry('Accueil',  Icons.home,               const DashboardScreen()),
          _NavEntry('Devis',    Icons.description,        const ClientPortalScreen()),
          _NavEntry('Factures', Icons.receipt_long,       const PurchaseInvoiceListScreen()),
          _NavEntry('Recherche',Icons.search,             const SearchScreen()),
          _NavEntry('Alertes',  Icons.notifications_none, const NotificationsScreen()),
        ];
      case 'EMPLOYEE':
        return [
          _NavEntry('Accueil',   Icons.home,              const DashboardScreen()),
          _NavEntry('Stock',     Icons.inventory_2,       const InventoryListScreen()),
          _NavEntry('Scanner',   Icons.qr_code_scanner,  const BarcodeScannerScreen()),
          _NavEntry('Recherche', Icons.search,            const SearchScreen()),
          _NavEntry('Alertes',   Icons.notifications_none,const NotificationsScreen()),
        ];
      default: // EMPLOYER / SUPER_ADMIN
        return [
          _NavEntry('Accueil', Icons.home,               const DashboardScreen()),
          _NavEntry('Stock',   Icons.inventory_2,        const InventoryListScreen()),
          _NavEntry('Ventes',  Icons.shopping_cart,      const VentesScreen()),
          _NavEntry('Achats',  Icons.receipt,            const AchatsScreen()),
          _NavEntry('CRM',     Icons.contacts,           const ProspectsScreen()),
          _NavEntry('Alertes', Icons.notifications_none, const NotificationsScreen()),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final entries    = _navEntries;
    final notifCount = ref.watch(notificationCountProvider);

    // Index of the Alertes tab — always the last
    final alertsIdx = entries.length - 1;

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: entries.map((e) => e.screen).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: entries.asMap().entries.map((entry) {
          final i = entry.key;
          final e = entry.value;
          final isAlerts = i == alertsIdx;
          final icon = isAlerts && notifCount > 0
              ? Badge(
                  label: Text('$notifCount'),
                  child: Icon(e.icon),
                )
              : Icon(e.icon);
          final selectedIcon = isAlerts && notifCount > 0
              ? Badge(
                  label: Text('$notifCount'),
                  child: Icon(
                    e.icon == Icons.notifications_none
                        ? Icons.notifications
                        : e.icon,
                  ),
                )
              : Icon(
                  e.icon == Icons.notifications_none
                      ? Icons.notifications
                      : e.icon,
                );
          return NavigationDestination(
            icon: icon,
            selectedIcon: selectedIcon,
            label: e.label,
          );
        }).toList(),
      ),
    );
  }
}

// ── Nav entry helper ──────────────────────────────────────────────────────────

class _NavEntry {
  final String   label;
  final IconData icon;
  final Widget   screen;
  const _NavEntry(this.label, this.icon, this.screen);
}
