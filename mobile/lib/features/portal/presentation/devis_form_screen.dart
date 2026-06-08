import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models.dart';
import '../data/portal_notifiers.dart';

class DevisFormScreen extends ConsumerWidget {
  const DevisFormScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formData = ref.watch(devisFormNotifierProvider);
    final formNotifier = ref.read(devisFormNotifierProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Créer un Devis'),
        actions: [
          TextButton(
            onPressed: () => _saveDevis(context, ref, formData, formNotifier),
            child: const Text('Envoyer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _FormSection(
            title: 'Client',
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Sélectionner un client',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                suffixIcon: const Icon(Icons.arrow_drop_down),
              ),
              onChanged: (val) => formNotifier.setClient('client_id', val),
            ),
          ),
          const SizedBox(height: 16),
          _FormSection(
            title: 'Articles',
            child: Column(
              children: [
                ...(formData.lines.asMap().entries).map((e) {
                  final idx = e.key;
                  final line = e.value;
                  return _DevisLineCard(
                    line: line,
                    onRemove: () => formNotifier.removeLine(idx),
                  );
                }),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _showAddLineDialog(context, ref, formNotifier),
                  icon: const Icon(Icons.add),
                  label: const Text('Ajouter Article'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _FormSection(
            title: 'Commentaires',
            child: TextField(
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Conditions, délais, etc...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onChanged: (val) => formNotifier.setNotes(val),
            ),
          ),
          const SizedBox(height: 24),
          _SummaryCard(data: formData),
        ],
      ),
    );
  }

  Future<void> _saveDevis(
    BuildContext context,
    WidgetRef ref,
    DevisFormData formData,
    DevisFormNotifier formNotifier,
  ) async {
    try {
      final api = ref.read(portalApiProvider);
      await formNotifier.save(api);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Devis créé avec succès')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showAddLineDialog(
    BuildContext context,
    WidgetRef ref,
    DevisFormNotifier formNotifier,
  ) {
    showDialog(
      context: context,
      builder: (_) => _AddLineDialog(
        onAdd: (line) {
          formNotifier.addLine(line);
          Navigator.pop(context);
        },
      ),
    );
  }
}

extension _DevisFormDataX on DevisFormData {
  double getHTTotal() => lines.fold(0, (sum, line) => sum + (line.quantity * line.unitPrice));
  double getTTCTotal() => getHTTotal() * 1.2;
}

class _FormSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _FormSection({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _DevisLineCard extends StatelessWidget {
  final DevisLineItem line;
  final VoidCallback onRemove;

  const _DevisLineCard({required this.line, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(line.description, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text('${line.quantity} × ${line.unitPrice.toStringAsFixed(2)} MAD',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${(line.quantity * line.unitPrice).toStringAsFixed(2)} MAD',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: onRemove,
                  child: const Icon(Icons.close, size: 18, color: Colors.red),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AddLineDialog extends StatefulWidget {
  final Function(DevisLineItem) onAdd;

  const _AddLineDialog({required this.onAdd});

  @override
  State<_AddLineDialog> createState() => _AddLineDialogState();
}

class _AddLineDialogState extends State<_AddLineDialog> {
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _qtyCtrl;

  @override
  void initState() {
    super.initState();
    _descCtrl = TextEditingController();
    _priceCtrl = TextEditingController();
    _qtyCtrl = TextEditingController(text: '1');
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Ajouter Article'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _descCtrl,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _priceCtrl,
            decoration: const InputDecoration(labelText: 'Prix Unitaire'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _qtyCtrl,
            decoration: const InputDecoration(labelText: 'Quantité'),
            keyboardType: TextInputType.number,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: () {
            widget.onAdd(DevisLineItem(
              productId: '',
              description: _descCtrl.text,
              unitPrice: double.tryParse(_priceCtrl.text) ?? 0,
              quantity: int.tryParse(_qtyCtrl.text) ?? 1,
            ));
          },
          child: const Text('Ajouter'),
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final DevisFormData data;

  const _SummaryCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final ht = data.getHTTotal();
    final ttc = data.getTTCTotal();

    return Card(
      color: Colors.indigo.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Montant HT'),
                Text('${ht.toStringAsFixed(2)} MAD', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('TVA (20%)'),
                Text('${(ttc - ht).toStringAsFixed(2)} MAD', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total TTC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('${ttc.toStringAsFixed(2)} MAD',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.indigo)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
