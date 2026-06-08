import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/achat_api.dart';
import '../../../core/api/models.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _fournisseursProvider =
    FutureProvider<List<FournisseurSummary>>((ref) async {
  final r = await ref.watch(achatApiProvider).getFournisseurs(size: 100);
  return r.content;
});

final _bonsCommandeProvider =
    FutureProvider<List<BonCommandeSummary>>((ref) async {
  final r = await ref.watch(achatApiProvider).getBonsCommande(size: 50);
  return r.content;
});

// ── Status helpers ────────────────────────────────────────────────────────────

Color _bcStatusColor(String status) {
  switch (status) {
    case 'BROUILLON':         return Colors.blueGrey;
    case 'ENVOYE':            return Colors.blue;
    case 'PARTIELLEMENT_RECU': return Colors.amber;
    case 'RECU':              return Colors.green;
    case 'ANNULE':            return Colors.red;
    default:                  return Colors.blueGrey;
  }
}

Widget _statusChip(String status) {
  final color = _bcStatusColor(status);
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

// ── Achats Screen ─────────────────────────────────────────────────────────────

class AchatsScreen extends ConsumerStatefulWidget {
  const AchatsScreen({super.key});

  @override
  ConsumerState<AchatsScreen> createState() => _AchatsScreenState();
}

class _AchatsScreenState extends ConsumerState<AchatsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
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
        title: const Text('Achats', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(icon: Icon(Icons.business), text: 'Fournisseurs'),
            Tab(icon: Icon(Icons.receipt), text: 'Bons Commande'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _FournisseursTab(),
          _BonsCommandeTab(),
        ],
      ),
    );
  }
}

// ── Fournisseurs Tab ──────────────────────────────────────────────────────────

class _FournisseursTab extends ConsumerStatefulWidget {
  const _FournisseursTab();

  @override
  ConsumerState<_FournisseursTab> createState() => _FournisseursTabState();
}

class _FournisseursTabState extends ConsumerState<_FournisseursTab> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_fournisseursProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_fournisseur',
        onPressed: () => _showCreateSheet(context),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Rechercher fournisseur…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12)),
                filled: true,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
              ),
              onChanged: (v) =>
                  setState(() => _query = v.trim().toLowerCase()),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorView(
                onRetry: () => ref.invalidate(_fournisseursProvider),
              ),
              data: (items) => _buildList(items),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<FournisseurSummary> items) {
    final filtered = _query.isEmpty
        ? items
        : items.where((f) {
            final q = _query;
            return f.nom.toLowerCase().contains(q) ||
                f.code.toLowerCase().contains(q) ||
                (f.email?.toLowerCase().contains(q) ?? false);
          }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.business_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 12),
            Text('Aucun fournisseur',
                style: TextStyle(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        final f = filtered[i];
        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: f.actif
                  ? Colors.teal.shade50
                  : Colors.grey.shade100,
              child: Text(
                f.code.length >= 2 ? f.code.substring(0, 2) : f.code,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: f.actif ? Colors.teal : Colors.grey),
              ),
            ),
            title: Text(f.nom,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Code: ${f.code}',
                    style: const TextStyle(fontSize: 12)),
                if (f.telephone != null && f.telephone!.isNotEmpty)
                  Text(f.telephone!,
                      style: const TextStyle(fontSize: 12)),
              ],
            ),
            isThreeLine: f.telephone != null && f.telephone!.isNotEmpty,
            trailing: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: f.actif
                    ? Colors.green.withOpacity(0.12)
                    : Colors.grey.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: f.actif
                        ? Colors.green.withOpacity(0.4)
                        : Colors.grey.withOpacity(0.4)),
              ),
              child: Text(
                f.actif ? 'Actif' : 'Inactif',
                style: TextStyle(
                    fontSize: 10,
                    color: f.actif ? Colors.green : Colors.grey,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CreateFournisseurSheet(
        onSaved: () => ref.invalidate(_fournisseursProvider),
      ),
    );
  }
}

// ── Create Fournisseur Sheet ───────────────────────────────────────────────────

class _CreateFournisseurSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;
  const _CreateFournisseurSheet({required this.onSaved});

  @override
  ConsumerState<_CreateFournisseurSheet> createState() =>
      _CreateFournisseurSheetState();
}

class _CreateFournisseurSheetState
    extends ConsumerState<_CreateFournisseurSheet> {
  final _formKey  = GlobalKey<FormState>();
  final _codeCtrl = TextEditingController();
  final _nomCtrl  = TextEditingController();
  final _adresseCtrl = TextEditingController();
  final _telCtrl  = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    _nomCtrl.dispose();
    _adresseCtrl.dispose();
    _telCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(achatApiProvider).createFournisseur({
        'code':      _codeCtrl.text.trim(),
        'nom':       _nomCtrl.text.trim(),
        'adresse':   _adresseCtrl.text.trim().isEmpty ? null : _adresseCtrl.text.trim(),
        'telephone': _telCtrl.text.trim().isEmpty ? null : _telCtrl.text.trim(),
        'email':     _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      });
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Fournisseur créé avec succès'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nouveau fournisseur',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _codeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Code *',
                  border: OutlineInputBorder(),
                  hintText: 'FOUR-001',
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Requis' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nomCtrl,
                decoration: const InputDecoration(
                  labelText: 'Nom *',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Requis' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _adresseCtrl,
                decoration: const InputDecoration(
                  labelText: 'Adresse',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _telCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Téléphone',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.save),
                  label:
                      Text(_saving ? 'Enregistrement…' : 'Enregistrer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Bons de Commande Tab ──────────────────────────────────────────────────────

class _BonsCommandeTab extends ConsumerWidget {
  const _BonsCommandeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_bonsCommandeProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) =>
          _ErrorView(onRetry: () => ref.invalidate(_bonsCommandeProvider)),
      data: (items) => items.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.receipt_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('Aucun bon de commande',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final bc = items[i];
                return Card(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading:
                        const Icon(Icons.receipt_outlined, color: Colors.teal),
                    title: Text(bc.reference,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace')),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(bc.fournisseurNom),
                        if (bc.dateLivraison != null)
                          Text(
                              'Livraison : ${_fmtDate(bc.dateLivraison)}',
                              style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                    isThreeLine: bc.dateLivraison != null,
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _statusChip(bc.status),
                        const SizedBox(height: 4),
                        Text('${_amtFmt.format(bc.totalTtc)} MAD',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11)),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ── Shared ────────────────────────────────────────────────────────────────────

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
