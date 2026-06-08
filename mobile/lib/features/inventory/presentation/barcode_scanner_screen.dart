import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';
import '../../../core/database/app_database.dart';
import 'product_form_screen.dart';
import 'stock_detail_screen.dart';

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final _ctrl =
      MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
  bool _scanning = true;
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _onDetected(BarcodeCapture capture) async {
    if (!_scanning || _loading) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() {
      _scanning = false;
      _loading = true;
    });

    StockItem? item;
    try {
      item = await ref.read(inventoryApiProvider).getItemByReference(code);
    } catch (_) {
      // Network unavailable — try local cache
      final cached =
          await ref.read(appDatabaseProvider).getCachedItemByReference(code);
      if (cached != null && mounted) {
        _goToDetail(StockItem(
          id: cached.productId,
          productId: cached.productId,
          productReference: cached.productReference,
          productName: cached.productName,
          quantity: cached.quantity,
          reservedQuantity: 0,
          availableQuantity: cached.availableQty,
          updatedAt: cached.cachedAt.toIso8601String(),
        ));
        return;
      }
    }

    if (!mounted) return;
    setState(() => _loading = false);

    if (item != null) {
      _goToDetail(item);
    } else {
      _showNotFoundDialog(code);
    }
  }

  void _goToDetail(StockItem item) {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => StockDetailScreen(item: item)))
        .then((_) => setState(() => _scanning = true));
  }

  void _showNotFoundDialog(String code) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.search_off, size: 40, color: Colors.orange),
        title: const Text('Produit introuvable'),
        content: Text(
          'La référence "$code" ne correspond à aucun article en stock.',
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          OutlinedButton.icon(
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Rescanner'),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() => _scanning = true);
            },
          ),
          FilledButton.icon(
            icon: const Icon(Icons.add_circle_outline),
            label: const Text('Créer le produit'),
            onPressed: () {
              Navigator.pop(ctx);
              _openCreateProduct(code);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _openCreateProduct(String scannedCode) async {
    final product = await Navigator.of(context).push<ProductSummary>(
      MaterialPageRoute(
        builder: (_) => ProductFormScreen(prefillReference: scannedCode),
      ),
    );

    if (!mounted) return;

    if (product != null) {
      // Product created — navigate immediately to its stock detail
      final item = StockItem(
        id: product.id,
        productId: product.id,
        productReference: product.reference,
        productName: product.name,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        updatedAt: DateTime.now().toIso8601String(),
      );
      _goToDetail(item);
    } else {
      // Cancelled — resume scanning
      setState(() => _scanning = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scanner un article'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          ValueListenableBuilder(
            valueListenable: _ctrl,
            builder: (_, state, __) => IconButton(
              icon: Icon(
                state.torchState == TorchState.on
                    ? Icons.flash_on
                    : Icons.flash_off,
                color: Colors.white,
              ),
              onPressed: _ctrl.toggleTorch,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _ctrl,
            onDetect: _onDetected,
          ),
          // Viewfinder overlay
          Center(
            child: Container(
              width: 260,
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          if (_loading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 12),
                    Text('Recherche en cours…',
                        style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ),
          const Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Text(
              'Pointez le scanner sur un code-barres ou QR',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
