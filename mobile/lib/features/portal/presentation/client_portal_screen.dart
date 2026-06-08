import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

import '../../../core/api/models.dart';
import '../../../core/api/portal_api.dart';

// ── Providers ────────────────────────────────────────────────────────────────

final _myDevisProvider = FutureProvider<List<DevisSummary>>(
  (ref) => ref.watch(portalApiProvider).myDevis(),
);
final _myFacturesProvider = FutureProvider<List<FactureSummary>>(
  (ref) => ref.watch(portalApiProvider).myFactures(),
);
final _myRequestsProvider = FutureProvider<List<DevisRequestSummary>>(
  (ref) => ref.watch(portalApiProvider).myRequests(),
);

// ── Screen ───────────────────────────────────────────────────────────────────

class ClientPortalScreen extends ConsumerStatefulWidget {
  const ClientPortalScreen({super.key});

  @override
  ConsumerState<ClientPortalScreen> createState() => _ClientPortalScreenState();
}

class _ClientPortalScreenState extends ConsumerState<ClientPortalScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _log = Logger();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
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
        title: const Text('Mon espace client'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(icon: Icon(Icons.description), text: 'Devis'),
            Tab(icon: Icon(Icons.receipt_long), text: 'Factures'),
            Tab(icon: Icon(Icons.send), text: 'Demandes'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _DevisTab(log: _log),
          _FacturesTab(log: _log),
          _RequestsTab(log: _log),
        ],
      ),
    );
  }
}

// ── Devis Tab ────────────────────────────────────────────────────────────────

class _DevisTab extends ConsumerWidget {
  const _DevisTab({required this.log});
  final Logger log;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_myDevisProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) { log.e('myDevis error', error: e); return _ErrorView(onRetry: () => ref.invalidate(_myDevisProvider)); },
      data:    (devis) => devis.isEmpty
          ? const _EmptyView(label: 'Aucun devis pour le moment.')
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: devis.length,
              itemBuilder: (_, i) => _DevisCard(item: devis[i]),
            ),
    );
  }
}

class _DevisCard extends StatelessWidget {
  const _DevisCard({required this.item});
  final DevisSummary item;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: const Icon(Icons.description_outlined, color: Colors.indigo),
        title: Text(item.reference, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('Créé le ${_fmtDate(item.createdAt)}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _StatusChip(status: item.status, type: 'devis'),
            const SizedBox(height: 4),
            Text('${item.totalTtc.toStringAsFixed(2)} MAD',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

// ── Factures Tab ─────────────────────────────────────────────────────────────

class _FacturesTab extends ConsumerWidget {
  const _FacturesTab({required this.log});
  final Logger log;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_myFacturesProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) { log.e('myFactures error', error: e); return _ErrorView(onRetry: () => ref.invalidate(_myFacturesProvider)); },
      data:    (factures) => factures.isEmpty
          ? const _EmptyView(label: 'Aucune facture pour le moment.')
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: factures.length,
              itemBuilder: (_, i) => _FactureCard(item: factures[i]),
            ),
    );
  }
}

class _FactureCard extends StatelessWidget {
  const _FactureCard({required this.item});
  final FactureSummary item;

  bool get _isOverdue =>
      item.status == 'EN_RETARD' ||
      (item.amountPaid < item.totalTtc &&
          item.dueDate != null &&
          item.dueDate!.isNotEmpty &&
          DateTime.tryParse(item.dueDate!)?.isBefore(DateTime.now()) == true);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      color: _isOverdue ? Colors.red.shade50 : null,
      child: ListTile(
        leading: Icon(Icons.receipt_long_outlined,
            color: _isOverdue ? Colors.red : Colors.teal),
        title: Text(item.reference, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('Échéance : ${_fmtDate(item.dueDate ?? '')}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _StatusChip(status: item.status, type: 'facture'),
            const SizedBox(height: 4),
            Text('${item.totalTtc.toStringAsFixed(2)} MAD',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            if (item.amountPaid > 0 && item.amountPaid < item.totalTtc)
              Text('Encaissé : ${item.amountPaid.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 10, color: Colors.green)),
          ],
        ),
      ),
    );
  }
}

// ── Requests Tab ─────────────────────────────────────────────────────────────

class _RequestsTab extends ConsumerWidget {
  const _RequestsTab({required this.log});
  final Logger log;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_myRequestsProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) { log.e('myRequests error', error: e); return _ErrorView(onRetry: () => ref.invalidate(_myRequestsProvider)); },
      data:    (requests) => requests.isEmpty
          ? const _EmptyView(label: 'Aucune demande de devis envoyée.')
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: requests.length,
              itemBuilder: (_, i) => _RequestCard(item: requests[i]),
            ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.item});
  final DevisRequestSummary item;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: const Icon(Icons.send_outlined, color: Colors.orange),
        title: Text(item.projectType, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(_fmtDate(item.createdAt)),
        trailing: _StatusChip(status: item.status, type: 'request'),
      ),
    );
  }
}

// ── Shared widgets ───────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.type});
  final String status;
  final String type;

  Color get _color {
    switch (status) {
      case 'BROUILLON': case 'EN_ATTENTE': return Colors.grey;
      case 'ENVOYE':    case 'EMISE':      return Colors.blue;
      case 'ACCEPTE':   case 'PAYEE':      return Colors.green;
      case 'REFUSE':    case 'ANNULEE':    return Colors.red;
      case 'EN_RETARD':                    return Colors.orange;
      case 'PARTIELLEMENT_PAYEE':          return Colors.amber;
      default:                             return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withValues(alpha: 0.4)),
      ),
      child: Text(status,
          style: TextStyle(fontSize: 11, color: _color, fontWeight: FontWeight.w600)),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.inbox_outlined, size: 64, color: Colors.black26),
          const SizedBox(height: 12),
          Text(label, style: const TextStyle(color: Colors.black45)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 8),
          const Text('Impossible de charger les données.'),
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

// ── Helpers ──────────────────────────────────────────────────────────────────

String _fmtDate(String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '—';
  return '${dt.day.toString().padLeft(2,'0')}/${dt.month.toString().padLeft(2,'0')}/${dt.year}';
}
