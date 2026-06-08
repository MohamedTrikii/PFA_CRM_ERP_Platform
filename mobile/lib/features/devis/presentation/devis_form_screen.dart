import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/crm_api.dart';
import '../../../core/api/models.dart';
import '../../../core/api/sales_api.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _clientsProvider = FutureProvider<List<ProspectSummary>>((ref) async {
  final page = await ref.watch(crmApiProvider).getProspects(size: 200);
  return page.content;
});

final _productsProvider = FutureProvider<List<ProductSummary>>((ref) async {
  return ref.watch(salesApiProvider).getActiveProducts();
});

// ── Internal line model ───────────────────────────────────────────────────────

class _DevisLine {
  final String productId;
  final String productName;
  final double unitPrice;
  double quantity;
  double discountPct;

  _DevisLine({
    required this.productId,
    required this.productName,
    required this.unitPrice,
    this.quantity = 1,
    this.discountPct = 0,
  });

  double get totalHT => unitPrice * quantity * (1 - discountPct / 100);
}

// ── Screen ────────────────────────────────────────────────────────────────────

class DevisFormScreen extends ConsumerStatefulWidget {
  const DevisFormScreen({super.key});

  @override
  ConsumerState<DevisFormScreen> createState() => _DevisFormScreenState();
}

class _DevisFormScreenState extends ConsumerState<DevisFormScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _notesCtrl   = TextEditingController();
  final _lines       = <_DevisLine>[];
  ProspectSummary?   _selectedClient;
  DateTime?          _validUntil;
  bool               _saving = false;

  static final _dateFmt = DateFormat('dd/MM/yyyy');
  static final _amtFmt  = NumberFormat('#,##0.00', 'fr_MA');

  double get _totalHT  => _lines.fold(0, (s, l) => s + l.totalHT);
  double get _totalTTC => _lines.fold(0, (s, l) {
    // TVA already baked into the line subtotal; here we use product-level tvaRate if available
    // For now, compute TTC as HT × 1.20 (default 20%) at form level
    return s + l.totalHT * 1.20;
  });

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _validUntil ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Valide jusqu\'au',
    );
    if (picked != null) setState(() => _validUntil = picked);
  }

  Future<void> _addLine(List<ProductSummary> products) async {
    final line = await showModalBottomSheet<_DevisLine>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _LineSheet(products: products),
    );
    if (line != null) setState(() => _lines.add(line));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClient == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Veuillez sélectionner un client'),
            backgroundColor: Colors.orange),
      );
      return;
    }
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Ajoutez au moins une ligne'),
            backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      await ref.read(salesApiProvider).createDevis({
        'clientId':   _selectedClient!.id,
        'validUntil': _validUntil?.toIso8601String().split('T').first,
        'notes':      _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        'lines': _lines
            .map((l) => {
                  'productId':    l.productId,
                  'quantity':     l.quantity,
                  'discountPct':  l.discountPct,
                })
            .toList(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Devis créé avec succès'),
              backgroundColor: Colors.green),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final clientsAsync  = ref.watch(_clientsProvider);
    final productsAsync = ref.watch(_productsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau Devis',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Client ────────────────────────────────────────────────────────
            Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Client',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    clientsAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text(
                          'Impossible de charger les clients',
                          style: TextStyle(color: Colors.red)),
                      data: (clients) => DropdownButtonFormField<ProspectSummary>(
                        value: _selectedClient,
                        decoration: const InputDecoration(
                          labelText: 'Client *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.person),
                        ),
                        items: clients
                            .map((c) => DropdownMenuItem(
                                  value: c,
                                  child: Text(c.displayLabel,
                                      overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedClient = v),
                        validator: (_) => _selectedClient == null
                            ? 'Sélectionnez un client'
                            : null,
                      ),
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(8),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Valide jusqu\'au',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.event),
                        ),
                        child: Text(
                          _validUntil != null
                              ? _dateFmt.format(_validUntil!)
                              : 'Choisir une date…',
                          style: TextStyle(
                              color: _validUntil != null
                                  ? null
                                  : Colors.grey),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Lignes ────────────────────────────────────────────────────────
            Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Lignes du devis',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold)),
                        productsAsync.when(
                          loading: () => const SizedBox(
                              width: 20,
                              height: 20,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2)),
                          error: (_, __) => const Icon(Icons.error,
                              color: Colors.red),
                          data: (products) => TextButton.icon(
                            onPressed: () => _addLine(products),
                            icon: const Icon(Icons.add),
                            label: const Text('Ajouter'),
                          ),
                        ),
                      ],
                    ),
                    if (_lines.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                            child: Text('Aucune ligne ajoutée',
                                style: TextStyle(color: Colors.grey))),
                      )
                    else
                      ..._lines.asMap().entries.map((e) => _LineTile(
                            line: e.value,
                            onDelete: () =>
                                setState(() => _lines.removeAt(e.key)),
                            onQtyChanged: (qty) =>
                                setState(() => _lines[e.key].quantity = qty),
                          )),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Notes ─────────────────────────────────────────────────────────
            Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Notes',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText:
                            'Conditions particulières, remarques…',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Totaux ────────────────────────────────────────────────────────
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _TotalRow('Total HT',  _totalHT),
                    _TotalRow('TVA (20%)', _totalTTC - _totalHT),
                    const Divider(),
                    _TotalRow('Total TTC', _totalTTC, isBold: true),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send),
                label: Text(_saving ? 'Envoi en cours…' : 'Créer le devis'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ── Line tile ─────────────────────────────────────────────────────────────────

class _LineTile extends StatelessWidget {
  final _DevisLine line;
  final VoidCallback onDelete;
  final void Function(double) onQtyChanged;
  const _LineTile(
      {required this.line,
      required this.onDelete,
      required this.onQtyChanged});

  static final _amtFmt = NumberFormat('#,##0.00', 'fr_MA');

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(line.productName,
          style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text(
          '${line.quantity.toStringAsFixed(0)} × ${_amtFmt.format(line.unitPrice)} MAD'
          '${line.discountPct > 0 ? ' (−${line.discountPct.toStringAsFixed(0)}%)' : ''}'),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${_amtFmt.format(line.totalHT)} MAD',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

// ── Total row ─────────────────────────────────────────────────────────────────

class _TotalRow extends StatelessWidget {
  final String label;
  final double value;
  final bool isBold;
  const _TotalRow(this.label, this.value, {this.isBold = false});

  static final _amtFmt = NumberFormat('#,##0.00', 'fr_MA');

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
        fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
        fontSize: isBold ? 16 : 14);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text('${_amtFmt.format(value)} MAD', style: style),
        ],
      ),
    );
  }
}

// ── Product line bottom sheet ─────────────────────────────────────────────────

class _LineSheet extends StatefulWidget {
  final List<ProductSummary> products;
  const _LineSheet({required this.products});

  @override
  State<_LineSheet> createState() => _LineSheetState();
}

class _LineSheetState extends State<_LineSheet> {
  final _formKey      = GlobalKey<FormState>();
  final _qtyCtrl      = TextEditingController(text: '1');
  final _discountCtrl = TextEditingController(text: '0');
  ProductSummary? _selected;

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _discountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ajouter une ligne',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            DropdownButtonFormField<ProductSummary>(
              value: _selected,
              decoration: const InputDecoration(
                labelText: 'Produit *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.inventory_2_outlined),
              ),
              items: widget.products
                  .map((p) => DropdownMenuItem(
                        value: p,
                        child: Text(
                            '${p.reference} — ${p.name}',
                            overflow: TextOverflow.ellipsis),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _selected = v),
              validator: (_) =>
                  _selected == null ? 'Sélectionnez un produit' : null,
            ),
            const SizedBox(height: 12),
            if (_selected != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Prix unit. : ${NumberFormat('#,##0.00', 'fr_MA').format(_selected!.unitPrice)} MAD',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _qtyCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                        labelText: 'Quantité *',
                        border: OutlineInputBorder()),
                    validator: (v) {
                      final n = double.tryParse(v ?? '');
                      if (n == null || n <= 0) return 'Invalide';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _discountCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                        labelText: 'Remise %',
                        border: OutlineInputBorder(),
                        suffixText: '%'),
                    validator: (v) {
                      final n = double.tryParse(v ?? '0');
                      if (n == null || n < 0 || n > 100) return 'Entre 0-100';
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  if (_selected == null) return;
                  Navigator.pop(
                    context,
                    _DevisLine(
                      productId:   _selected!.id,
                      productName: _selected!.name,
                      unitPrice:   _selected!.unitPrice,
                      quantity:    double.parse(_qtyCtrl.text),
                      discountPct: double.tryParse(_discountCtrl.text) ?? 0,
                    ),
                  );
                },
                child: const Text('Ajouter'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
