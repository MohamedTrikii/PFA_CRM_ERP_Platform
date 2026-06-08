import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/inventory_api.dart';
import '../../../core/api/models.dart';

/// Shows ENTREE / SORTIE / AJUSTEMENT form for a stock item.
/// Returns [AdjustmentResult] or null on cancel.
class AdjustmentDialog extends ConsumerStatefulWidget {
  const AdjustmentDialog({super.key, required this.item});
  final StockItem item;

  @override
  ConsumerState<AdjustmentDialog> createState() => _AdjustmentDialogState();
}

class _AdjustmentDialogState extends ConsumerState<AdjustmentDialog> {
  final _qtyCtrl   = TextEditingController(text: '1');
  final _notesCtrl = TextEditingController();
  final _form      = GlobalKey<FormState>();
  String _type     = 'ENTREE';

  List<LocationModel> _locations = [];
  String?             _locationId;
  bool                _loadingLocations = true;

  @override
  void initState() {
    super.initState();
    _fetchLocations();
  }

  Future<void> _fetchLocations() async {
    try {
      final locs = await ref.read(inventoryApiProvider).getLocations();
      if (mounted) {
        setState(() {
          _locations = locs;
          _locationId = locs.isNotEmpty ? locs.first.id : 'default';
          _loadingLocations = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _locationId = 'default';
          _loadingLocations = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Ajuster : ${widget.item.productReference}'),
      content: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                      value: 'ENTREE',
                      label: Text('Entrée'),
                      icon: Icon(Icons.add)),
                  ButtonSegment(
                      value: 'SORTIE',
                      label: Text('Sortie'),
                      icon: Icon(Icons.remove)),
                  ButtonSegment(
                      value: 'AJUSTEMENT',
                      label: Text('Ajust.'),
                      icon: Icon(Icons.tune)),
                ],
                selected: {_type},
                onSelectionChanged: (s) =>
                    setState(() => _type = s.first),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _qtyCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Quantité *',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  if (n == null || n <= 0) return 'Saisir une quantité > 0';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              // Location dropdown — shows loader while fetching, fallback to text if empty
              if (_loadingLocations)
                const LinearProgressIndicator()
              else if (_locations.isEmpty)
                const SizedBox.shrink()
              else
                DropdownButtonFormField<String>(
                  value: _locationId,
                  decoration: const InputDecoration(
                    labelText: 'Emplacement',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.place_outlined),
                  ),
                  items: _locations
                      .map((l) => DropdownMenuItem(
                            value: l.id,
                            child: Text(l.name,
                                overflow: TextOverflow.ellipsis),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _locationId = v),
                ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(
                  labelText: 'Notes (optionnel)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler')),
        FilledButton(
          onPressed: () {
            if (!_form.currentState!.validate()) return;
            Navigator.pop(
              context,
              AdjustmentResult(
                type:       _type,
                quantity:   double.parse(_qtyCtrl.text),
                locationId: _locationId ?? 'default',
                notes:      _notesCtrl.text.trim().isEmpty
                    ? null
                    : _notesCtrl.text.trim(),
              ),
            );
          },
          child: const Text('Confirmer'),
        ),
      ],
    );
  }
}

/// Public result type — shared with StockDetailScreen.
class AdjustmentResult {
  final String  type;
  final double  quantity;
  final String  locationId;
  final String? notes;
  const AdjustmentResult({
    required this.type,
    required this.quantity,
    required this.locationId,
    this.notes,
  });
}
