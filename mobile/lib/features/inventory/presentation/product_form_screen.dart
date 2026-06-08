import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models.dart';
import '../../../core/api/sales_api.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final String? prefillReference;
  const ProductFormScreen({super.key, this.prefillReference});

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey  = GlobalKey<FormState>();
  late final _refCtrl   = TextEditingController(text: widget.prefillReference ?? '');
  final _nameCtrl  = TextEditingController();
  final _descCtrl  = TextEditingController();
  final _priceCtrl = TextEditingController();
  String _unit    = 'unité';
  double _tvaRate = 20.0;
  bool   _saving  = false;

  static const _units = ['ml', 'm²', 'm', 'unité', 'kg', 'pièce', 'lot', 'heure', 'paquet'];
  static const _tvaRates = [0.0, 7.0, 10.0, 14.0, 20.0];

  @override
  void dispose() {
    _refCtrl.dispose();
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final product = await ref.read(salesApiProvider).createProduct({
        'reference':   _refCtrl.text.trim(),
        'name':        _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'unit':        _unit,
        'unitPrice':   double.parse(_priceCtrl.text.replaceAll(',', '.')),
        'tvaRate':     _tvaRate,
        'active':      true,
      });
      if (mounted) Navigator.pop(context, product);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau produit',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Identification ────────────────────────────────────────────────
            _Section(
              title: 'Identification',
              children: [
                TextFormField(
                  controller: _refCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Référence *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.qr_code),
                    hintText: 'PROD-001 ou code scanné',
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nom du produit *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.label_outline),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                    hintText: 'Description optionnelle…',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // ── Tarification ──────────────────────────────────────────────────
            _Section(
              title: 'Tarification',
              children: [
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextFormField(
                        controller: _priceCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Prix unitaire HT *',
                          border: OutlineInputBorder(),
                          suffixText: 'MAD',
                        ),
                        validator: (v) {
                          final n = double.tryParse(
                              (v ?? '').replaceAll(',', '.'));
                          if (n == null || n < 0) return 'Montant invalide';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _unit,
                        decoration: const InputDecoration(
                          labelText: 'Unité',
                          border: OutlineInputBorder(),
                        ),
                        items: _units
                            .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                            .toList(),
                        onChanged: (v) => setState(() => _unit = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<double>(
                  value: _tvaRate,
                  decoration: const InputDecoration(
                    labelText: 'Taux TVA *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.percent),
                  ),
                  items: _tvaRates
                      .map((r) => DropdownMenuItem(
                            value: r,
                            child: Text('${r.toStringAsFixed(0)} %'),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _tvaRate = v!),
                ),
              ],
            ),

            const SizedBox(height: 24),

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
                    : const Icon(Icons.save),
                label: Text(_saving ? 'Enregistrement…' : 'Créer le produit'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}
