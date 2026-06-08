import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/models.dart';
import '../../../core/api/sales_api.dart';
import '../../devis/presentation/devis_form_screen.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _devisPageProvider =
    FutureProvider.family<List<DevisSummary>, int>((ref, page) async {
  final r = await ref.watch(salesApiProvider).getDevis(page: page, size: 20);
  return r.content;
});

final _commandesProvider =
    FutureProvider<List<CommandeSummary>>((ref) async {
  final r = await ref.watch(salesApiProvider).getCommandes(size: 50);
  return r.content;
});

final _livraisonsProvider =
    FutureProvider<List<LivraisonSummary>>((ref) async {
  final r = await ref.watch(salesApiProvider).getLivraisons(size: 50);
  return r.content;
});

final _facturesProvider =
    FutureProvider<List<FactureFullSummary>>((ref) async {
  final r = await ref.watch(salesApiProvider).getFactures(size: 50);
  return r.content;
});

// ── Status colors ─────────────────────────────────────────────────────────────

Color _statusColor(String status) {
  switch (status) {
    case 'BROUILLON':
    case 'EN_ATTENTE':
      return Colors.blueGrey;
    case 'ENVOYE':
    case 'EMISE':
      return Colors.blue;
    case 'ACCEPTE':
    case 'PAYEE':
    case 'CONFIRME':
    case 'RECU':
      return Colors.green;
    case 'REFUSE':
    case 'ANNULE':
    case 'ANNULEE':
      return Colors.red;
    case 'EN_RETARD':
      return Colors.orange;
    case 'PARTIELLEMENT_PAYEE':
    case 'PARTIELLEMENT_RECU':
      return Colors.amber;
    case 'EN_COURS':
    case 'EN_LIVRAISON':
      return Colors.indigo;
    default:
      return Colors.blueGrey;
  }
}

Widget _statusChip(String status) {
  final color = _statusColor(status);
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(
      color: color.withOpacity(0.12),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withOpacity(0.4)),
    ),
    child: Text(
      status,
      style:
          TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
    ),
  );
}

String _fmtDate(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  return DateFormat('dd/MM/yy').format(dt);
}

final _amtFmt = NumberFormat('#,##0.00', 'fr_MA');

// ── Ventes Screen (tabbed) ────────────────────────────────────────────────────

class VentesScreen extends ConsumerStatefulWidget {
  const VentesScreen({super.key});

  @override
  ConsumerState<VentesScreen> createState() => _VentesScreenState();
}

class _VentesScreenState extends ConsumerState<VentesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ventes', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.description), text: 'Devis'),
            Tab(icon: Icon(Icons.shopping_bag), text: 'Commandes'),
            Tab(icon: Icon(Icons.local_shipping), text: 'Livraisons'),
            Tab(icon: Icon(Icons.receipt_long), text: 'Factures'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _DevisTab(),
          _CommandesTab(),
          _LivraisonsTab(),
          _FacturesTab(),
        ],
      ),
    );
  }
}

// ── Devis Tab ─────────────────────────────────────────────────────────────────

class _DevisTab extends ConsumerWidget {
  const _DevisTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_devisPageProvider(0));
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_devis',
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const DevisFormScreen()),
        ).then((_) => ref.invalidate(_devisPageProvider(0))),
        child: const Icon(Icons.add),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(onRetry: () => ref.invalidate(_devisPageProvider(0))),
        data: (items) => items.isEmpty
            ? _EmptyView(icon: Icons.description, label: 'Aucun devis')
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (_, i) {
                  final d = items[i];
                  return Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: const Icon(Icons.description_outlined,
                          color: Colors.indigo),
                      title: Text(d.reference,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontFamily: 'monospace')),
                      subtitle: Text(
                          'Créé ${_fmtDate(d.createdAt)}${d.validUntil != null ? ' · Expire ${_fmtDate(d.validUntil)}' : ''}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _statusChip(d.status),
                          const SizedBox(height: 4),
                          Text('${_amtFmt.format(d.totalTtc)} MAD',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12)),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ── Commandes Tab ─────────────────────────────────────────────────────────────

class _CommandesTab extends ConsumerWidget {
  const _CommandesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_commandesProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) =>
          _ErrorView(onRetry: () => ref.invalidate(_commandesProvider)),
      data: (items) => items.isEmpty
          ? _EmptyView(icon: Icons.shopping_bag, label: 'Aucune commande')
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final c = items[i];
                return Card(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: const Icon(Icons.shopping_bag_outlined,
                        color: Colors.teal),
                    title: Text(c.reference,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace')),
                    subtitle: c.expectedDeliveryDate != null
                        ? Text('Livraison : ${_fmtDate(c.expectedDeliveryDate)}')
                        : Text('Créé ${_fmtDate(c.createdAt)}'),
                    trailing: _statusChip(c.status),
                  ),
                );
              },
            ),
    );
  }
}

// ── Livraisons Tab ────────────────────────────────────────────────────────────

class _LivraisonsTab extends ConsumerWidget {
  const _LivraisonsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_livraisonsProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) =>
          _ErrorView(onRetry: () => ref.invalidate(_livraisonsProvider)),
      data: (items) => items.isEmpty
          ? _EmptyView(icon: Icons.local_shipping, label: 'Aucune livraison')
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final l = items[i];
                return Card(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: const Icon(Icons.local_shipping_outlined,
                        color: Colors.blue),
                    title: Text(l.reference,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace')),
                    subtitle: l.deliveryDate != null
                        ? Text('Date : ${_fmtDate(l.deliveryDate)}')
                        : Text('Créé ${_fmtDate(l.createdAt)}'),
                    trailing: _statusChip(l.status),
                  ),
                );
              },
            ),
    );
  }
}

// ── Factures Tab ──────────────────────────────────────────────────────────────

class _FacturesTab extends ConsumerWidget {
  const _FacturesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_facturesProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) =>
          _ErrorView(onRetry: () => ref.invalidate(_facturesProvider)),
      data: (items) => items.isEmpty
          ? _EmptyView(icon: Icons.receipt_long, label: 'Aucune facture')
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final f = items[i];
                return Card(
                  color: f.isOverdue ? Colors.red.shade50 : null,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: Icon(Icons.receipt_long_outlined,
                        color: f.isOverdue ? Colors.red : Colors.teal),
                    title: Text(f.reference,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace')),
                    subtitle: Text(
                        'Échéance : ${_fmtDate(f.dueDate)}'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _statusChip(f.status),
                        const SizedBox(height: 4),
                        Text('${_amtFmt.format(f.totalTtc)} MAD',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11)),
                        if (f.amountPaid > 0 && f.remaining > 0)
                          Text(
                            'Reste : ${_amtFmt.format(f.remaining)}',
                            style: const TextStyle(
                                fontSize: 10, color: Colors.orange),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  final IconData icon;
  final String label;
  const _EmptyView({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text(label, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 56, color: Colors.orange),
          const SizedBox(height: 8),
          const Text('Erreur de chargement'),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}
