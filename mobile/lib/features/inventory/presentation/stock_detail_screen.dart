import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';
import '../../../core/database/app_database.dart';
import '../../../core/sync/sync_service.dart';
import 'adjustment_dialog.dart';

final _fmt = NumberFormat('#,##0.##');

class StockDetailScreen extends ConsumerStatefulWidget {
  const StockDetailScreen({super.key, required this.item});
  final StockItem item;

  @override
  ConsumerState<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends ConsumerState<StockDetailScreen> {
  List<StockMovement> _movements = [];
  bool _loadingMovements = true;

  @override
  void initState() {
    super.initState();
    _fetchMovements();
    _cacheItem();
  }

  Future<void> _fetchMovements() async {
    try {
      final list = await ref.read(inventoryApiProvider).getMovementsByProduct(widget.item.productId);
      if (mounted) setState(() { _movements = list; _loadingMovements = false; });
    } catch (_) {
      if (mounted) setState(() { _loadingMovements = false; });
    }
  }

  Future<void> _cacheItem() async {
    await ref.read(appDatabaseProvider).upsertStockItem(
      CachedStockItemsCompanion.insert(
        productId:        widget.item.productId,
        productReference: widget.item.productReference,
        productName:      widget.item.productName,
        quantity:         widget.item.quantity,
        availableQty:     widget.item.availableQuantity,
      ),
    );
  }

  Future<void> _openAdjustment() async {
    final result = await showDialog<AdjustmentResult>(
      context: context,
      builder: (_) => AdjustmentDialog(item: widget.item),
    );
    if (result == null) return;

    final syncSvc = ref.read(syncServiceProvider);
    try {
      await ref.read(inventoryApiProvider).recordMovement(
        productId:    widget.item.productId,
        locationId:   result.locationId,
        movementType: result.type,
        quantity:     result.quantity,
        notes:        result.notes,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mouvement enregistré'), backgroundColor: Colors.green),
        );
        _fetchMovements();
      }
    } catch (_) {
      // Offline → enqueue
      await syncSvc.enqueueMovement(
        productId:    widget.item.productId,
        locationId:   result.locationId,
        movementType: result.type,
        quantity:     result.quantity,
        notes:        result.notes,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Hors-ligne — mouvement mis en file d\'attente'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(item.productReference),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note),
            tooltip: 'Ajustement stock',
            onPressed: _openAdjustment,
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Stock level card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [theme.colorScheme.primaryContainer, theme.colorScheme.surface],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName, style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StockTile('Total', _fmt.format(item.quantity),         Colors.blue),
                    _StockTile('Réservé', _fmt.format(item.reservedQuantity), Colors.orange),
                    _StockTile('Dispo', _fmt.format(item.availableQuantity),  Colors.green),
                  ],
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Historique des mouvements', style: theme.textTheme.titleSmall),
          ),
          const SizedBox(height: 8),

          Expanded(
            child: _loadingMovements
                ? const Center(child: CircularProgressIndicator())
                : _movements.isEmpty
                    ? const Center(child: Text('Aucun mouvement enregistré'))
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _movements.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final m = _movements[i];
                          final isSortie = m.movementType == 'SORTIE';
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(
                              backgroundColor: isSortie ? Colors.red.shade50 : Colors.green.shade50,
                              child: Icon(
                                isSortie ? Icons.remove_circle_outline : Icons.add_circle_outline,
                                color: isSortie ? Colors.red : Colors.green,
                              ),
                            ),
                            title: Text(
                              '${isSortie ? '-' : '+'}${_fmt.format(m.quantity)}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isSortie ? Colors.red : Colors.green,
                              ),
                            ),
                            subtitle: Text(m.notes ?? m.movementType),
                            trailing: Text(
                              _formatDate(m.occurredAt),
                              style: theme.textTheme.bodySmall,
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('dd/MM HH:mm').format(dt);
    } catch (_) {
      return iso;
    }
  }
}

class _StockTile extends StatelessWidget {
  const _StockTile(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

