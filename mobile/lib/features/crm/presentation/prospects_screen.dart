import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/crm_api.dart';
import '../../../core/api/models.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final prospectsProvider = FutureProvider<List<ProspectSummary>>((ref) async {
  final page = await ref.watch(crmApiProvider).getProspects(size: 100);
  return page.content;
});

// ── Status helpers ────────────────────────────────────────────────────────────

Color _statusColor(String status) {
  switch (status) {
    case 'NOUVEAU':  return Colors.blue;
    case 'CONTACTE': return Colors.purple;
    case 'QUALIFIE': return Colors.orange;
    case 'CONVERTI': return Colors.green;
    case 'PERDU':    return Colors.red;
    default:         return Colors.blueGrey;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

class ProspectsScreen extends ConsumerStatefulWidget {
  const ProspectsScreen({super.key});

  @override
  ConsumerState<ProspectsScreen> createState() => _ProspectsScreenState();
}

class _ProspectsScreenState extends ConsumerState<ProspectsScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prospectsAsync = ref.watch(prospectsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('CRM — Prospects',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(prospectsProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Nouveau'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Rechercher nom, société, email…',
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
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
              ),
              onChanged: (v) =>
                  setState(() => _query = v.trim().toLowerCase()),
            ),
          ),
          Expanded(
            child: prospectsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorView(
                message: e.toString(),
                onRetry: () => ref.invalidate(prospectsProvider),
              ),
              data: (list) => _buildList(list),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<ProspectSummary> items) {
    final filtered = _query.isEmpty
        ? items
        : items.where((p) {
            final q = _query;
            return p.name.toLowerCase().contains(q) ||
                (p.company?.toLowerCase().contains(q) ?? false) ||
                p.email.toLowerCase().contains(q);
          }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.contacts_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 12),
            Text('Aucun prospect trouvé',
                style: TextStyle(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) => _ProspectTile(item: filtered[i]),
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CreateProspectSheet(
        onSaved: () => ref.invalidate(prospectsProvider),
      ),
    );
  }
}

// ── Prospect Tile ─────────────────────────────────────────────────────────────

class _ProspectTile extends StatelessWidget {
  final ProspectSummary item;
  const _ProspectTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(item.status);
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.15),
          child: Text(
            item.name.isNotEmpty ? item.name[0].toUpperCase() : '?',
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(item.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.company != null && item.company!.isNotEmpty)
              Text(item.company!,
                  style: const TextStyle(fontSize: 12)),
            Text(item.email,
                style: TextStyle(
                    color: Colors.grey.shade600, fontSize: 12)),
          ],
        ),
        isThreeLine: item.company != null && item.company!.isNotEmpty,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: color.withOpacity(0.4)),
              ),
              child: Text(
                item.status,
                style: TextStyle(
                    fontSize: 10, color: color, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _fmtDate(item.createdAt),
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Create Prospect Sheet ─────────────────────────────────────────────────────

class _CreateProspectSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;
  const _CreateProspectSheet({required this.onSaved});

  @override
  ConsumerState<_CreateProspectSheet> createState() =>
      _CreateProspectSheetState();
}

class _CreateProspectSheetState
    extends ConsumerState<_CreateProspectSheet> {
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _phoneCtrl  = TextEditingController();
  final _sourceCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _companyCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _sourceCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(crmApiProvider).createProspect({
        'name':    _nameCtrl.text.trim(),
        'company': _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
        'email':   _emailCtrl.text.trim(),
        'phone':   _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'source':  _sourceCtrl.text.trim().isEmpty ? null : _sourceCtrl.text.trim(),
      });
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Prospect créé avec succès'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: Colors.red),
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
              Text('Nouveau prospect',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      )),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Nom complet *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _companyCtrl,
                decoration: const InputDecoration(
                  labelText: 'Société',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.business),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Champ requis';
                  if (!RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(v.trim())) {
                    return 'Email invalide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Téléphone',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _sourceCtrl,
                decoration: const InputDecoration(
                  labelText: 'Source',
                  border: OutlineInputBorder(),
                  hintText: 'Site web, recommandation…',
                  prefixIcon: Icon(Icons.source),
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
                  label: Text(_saving ? 'Enregistrement…' : 'Enregistrer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 56, color: Colors.orange),
          const SizedBox(height: 12),
          const Text('Impossible de charger les données',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

String _fmtDate(String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '—';
  return DateFormat('dd/MM/yy').format(dt);
}
