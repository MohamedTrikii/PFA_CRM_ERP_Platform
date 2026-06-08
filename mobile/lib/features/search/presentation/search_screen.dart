import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/crm_api.dart';
import '../../../core/api/models.dart';
import '../../../core/api/sales_api.dart';
import '../../../core/database/app_database.dart';

// ── Global search combines stock (local cache) + products + prospects + devis ─

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _ctrl = TextEditingController();
  String _query = '';
  bool _loading = false;
  List<SearchResult> _results = [];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().length < 2) {
      setState(() { _results = []; _loading = false; });
      return;
    }

    setState(() => _loading = true);
    final q = query.trim().toLowerCase();
    final results = <SearchResult>[];

    await Future.wait([
      // Stock items from local cache (always available offline)
      ref.read(appDatabaseProvider).getCachedItems().then((items) {
        for (final i in items) {
          if (i.productName.toLowerCase().contains(q) ||
              i.productReference.toLowerCase().contains(q)) {
            results.add(SearchResult(
              entityType: 'STOCK',
              id:         i.productId,
              title:      i.productName,
              subtitle:   '${i.productReference} · ${i.availableQty.toStringAsFixed(0)} u.',
            ));
          }
        }
      }),

      // Products from API
      ref.read(salesApiProvider).getActiveProducts().then((products) {
        for (final p in products) {
          if (p.name.toLowerCase().contains(q) ||
              p.reference.toLowerCase().contains(q) ||
              (p.description?.toLowerCase().contains(q) ?? false)) {
            // Only add if not already from stock cache
            if (!results.any((r) => r.entityType == 'STOCK' && r.id == p.id)) {
              results.add(SearchResult(
                entityType: 'PRODUIT',
                id:         p.id,
                title:      p.name,
                subtitle:   '${p.reference} · ${p.unitPrice.toStringAsFixed(2)} MAD',
              ));
            }
          }
        }
      }).catchError((_) {}),

      // Prospects from API
      ref.read(crmApiProvider).getProspects(size: 100).then((page) {
        for (final p in page.content) {
          if (p.name.toLowerCase().contains(q) ||
              (p.company?.toLowerCase().contains(q) ?? false) ||
              p.email.toLowerCase().contains(q)) {
            results.add(SearchResult(
              entityType: 'PROSPECT',
              id:         p.id,
              title:      p.displayLabel,
              subtitle:   p.email,
            ));
          }
        }
      }).catchError((_) {}),

      // Devis from API
      ref.read(salesApiProvider).getDevis(size: 50).then((page) {
        for (final d in page.content) {
          if (d.reference.toLowerCase().contains(q)) {
            results.add(SearchResult(
              entityType: 'DEVIS',
              id:         d.id,
              title:      d.reference,
              subtitle:   '${d.status} · ${d.totalTtc.toStringAsFixed(2)} MAD',
            ));
          }
        }
      }).catchError((_) {}),

      // Factures from API
      ref.read(salesApiProvider).getFactures(size: 50).then((page) {
        for (final f in page.content) {
          if (f.reference.toLowerCase().contains(q)) {
            results.add(SearchResult(
              entityType: 'FACTURE',
              id:         f.id,
              title:      f.reference,
              subtitle:   '${f.status} · ${f.totalTtc.toStringAsFixed(2)} MAD',
            ));
          }
        }
      }).catchError((_) {}),
    ]);

    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Produits, clients, devis, factures…',
            border: InputBorder.none,
            hintStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
            suffixIcon: _ctrl.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _ctrl.clear();
                      setState(() { _query = ''; _results = []; });
                    },
                  )
                : null,
          ),
          style: Theme.of(context).textTheme.bodyLarge,
          onChanged: (v) {
            setState(() => _query = v);
            _search(v);
          },
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_query.length < 2 && _results.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search, size: 80,
                color: Colors.grey.withOpacity(0.3)),
            const SizedBox(height: 16),
            const Text('Tapez au moins 2 caractères pour rechercher',
                style: TextStyle(color: Colors.grey),
                textAlign: TextAlign.center),
          ],
        ),
      );
    }

    if (_results.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 64, color: Colors.grey),
            SizedBox(height: 12),
            Text('Aucun résultat trouvé',
                style: TextStyle(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _results.length,
      itemBuilder: (_, i) => _ResultTile(result: _results[i]),
    );
  }
}

// ── Result tile ───────────────────────────────────────────────────────────────

class _ResultTile extends StatelessWidget {
  final SearchResult result;
  const _ResultTile({required this.result});

  IconData get _icon {
    switch (result.entityType) {
      case 'STOCK':
      case 'PRODUIT':   return Icons.inventory_2_outlined;
      case 'PROSPECT':  return Icons.contacts_outlined;
      case 'DEVIS':     return Icons.description_outlined;
      case 'FACTURE':   return Icons.receipt_long_outlined;
      default:          return Icons.search;
    }
  }

  Color get _color {
    switch (result.entityType) {
      case 'STOCK':     return Colors.teal;
      case 'PRODUIT':   return Colors.blue;
      case 'PROSPECT':  return Colors.purple;
      case 'DEVIS':     return Colors.indigo;
      case 'FACTURE':   return Colors.orange;
      default:          return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(_icon, color: _color, size: 20),
        ),
        title: Text(result.title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: result.subtitle != null
            ? Text(result.subtitle!,
                style: const TextStyle(fontSize: 12))
            : null,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: _color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            result.entityType,
            style: TextStyle(
                fontSize: 10,
                color: _color,
                fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
