import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';
import '../../../core/database/app_database.dart';
import 'stock_detail_screen.dart';

// ── Provider ─────────────────────────────────────────────────────────────────

final inventoryListProvider = FutureProvider<List<StockItem>>((ref) async {
  try {
    final api = ref.watch(inventoryApiProvider);
    final page = await api.getItems(size: 200);
    // Cache items into local DB
    final db = ref.watch(appDatabaseProvider);
    for (final item in page.content) {
      await db.upsertStockItem(CachedStockItemsCompanion.insert(
        productId: item.productId,
        productReference: item.productReference,
        productName: item.productName,
        quantity: item.quantity,
        availableQty: item.availableQuantity,
      ));
    }
    return page.content;
  } catch (_) {
    // Offline: serve from local Drift cache
    final db = ref.watch(appDatabaseProvider);
    final cached = await db.getCachedItems();
    return cached.map((c) => StockItem(
      id: c.productId,
      productId: c.productId,
      productReference: c.productReference,
      productName: c.productName,
      quantity: c.quantity,
      reservedQuantity: 0,
      availableQuantity: c.availableQty,
      updatedAt: c.cachedAt.toIso8601String(),
    )).toList();
  }
});

// ── Screen ───────────────────────────────────────────────────────────────────

class InventoryListScreen extends ConsumerStatefulWidget {
  const InventoryListScreen({super.key});

  @override
  ConsumerState<InventoryListScreen> createState() => _InventoryListScreenState();
}

class _InventoryListScreenState extends ConsumerState<InventoryListScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  String? _selectedCategory;

  static const _mockCategories = ['Tous', 'Aluminium', 'Acier', 'Visserie', 'Peinture', 'Joints'];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventoryAsync = ref.watch(inventoryListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion des Stocks', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(inventoryListProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddArticleDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Nouvel article'),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildCategoryFilter(),
          Expanded(
            child: inventoryAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _buildOfflineMode(),
              data: (items) => _buildList(items),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: TextField(
        controller: _searchCtrl,
        decoration: InputDecoration(
          hintText: 'Rechercher par référence ou nom…',
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
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          filled: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
        ),
        onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
      ),
    );
  }

  Widget _buildCategoryFilter() {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemCount: _mockCategories.length,
        itemBuilder: (_, i) {
          final cat = _mockCategories[i];
          final isSelected = (cat == 'Tous' && _selectedCategory == null) ||
              _selectedCategory == cat;
          return ChoiceChip(
            label: Text(cat),
            selected: isSelected,
            onSelected: (_) => setState(() => _selectedCategory = cat == 'Tous' ? null : cat),
          );
        },
      ),
    );
  }

  Widget _buildList(List<StockItem> items) {
    final filtered = items.where((item) {
      final matchesQuery = _query.isEmpty ||
          item.productReference.toLowerCase().contains(_query) ||
          item.productName.toLowerCase().contains(_query);
      return matchesQuery;
    }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Aucun article trouvé', style: TextStyle(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) => _StockTile(
        item: filtered[i],
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => StockDetailScreen(item: filtered[i])),
        ).then((_) => ref.invalidate(inventoryListProvider)),
      ),
    );
  }

  Widget _buildOfflineMode() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off, size: 56, color: Colors.orange),
          SizedBox(height: 16),
          Text('Mode hors-ligne', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          SizedBox(height: 8),
          Text(
            'Données chargées depuis le cache local',
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showAddArticleDialog(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Fonctionnalité de création d\'article disponible via le backend.')),
    );
  }
}

// ── Tile widget ───────────────────────────────────────────────────────────────

class _StockTile extends StatelessWidget {
  final StockItem item;
  final VoidCallback onTap;
  const _StockTile({required this.item, required this.onTap});

  bool get _isCritical => item.availableQuantity <= 10;
  bool get _isAlert => item.availableQuantity <= 0;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _isAlert
              ? Colors.red.shade300
              : _isCritical
                  ? Colors.orange.shade300
                  : Colors.transparent,
          width: _isCritical ? 1.5 : 0,
        ),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: _isAlert
                ? Colors.red.shade50
                : _isCritical
                    ? Colors.orange.shade50
                    : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            _isAlert ? Icons.warning_rounded : Icons.inventory_2,
            color: _isAlert
                ? Colors.red
                : _isCritical
                    ? Colors.orange
                    : Colors.blue,
          ),
        ),
        title: Text(
          item.productName,
          style: const TextStyle(fontWeight: FontWeight.w600),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          item.productReference,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${item.availableQuantity.toStringAsFixed(0)} unités',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: _isAlert ? Colors.red : _isCritical ? Colors.orange : null,
              ),
            ),
            if (_isCritical)
              Text(
                _isAlert ? '🔴 Rupture' : '🟠 Seuil bas',
                style: TextStyle(
                  fontSize: 11,
                  color: _isAlert ? Colors.red : Colors.orange,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
