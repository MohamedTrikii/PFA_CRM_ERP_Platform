import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:drift/drift.dart';
import '../../../core/api/models.dart';
import '../../../core/api/portal_api.dart';
import '../../../core/database/app_database.dart';

// ── Devis Providers ────────────────────────────────────────────────────────────

final devisListProvider = FutureProvider<List<DevisSummary>>((ref) async {
  try {
    return await ref.watch(portalApiProvider).listDevis();
  } catch (_) {
    return [];
  }
});

final devisFormNotifierProvider = StateNotifierProvider<DevisFormNotifier, DevisFormData>((ref) {
  return DevisFormNotifier();
});

class DevisFormNotifier extends StateNotifier<DevisFormData> {
  DevisFormNotifier()
      : super(const DevisFormData(
          clientId: '',
          lines: [],
        ));

  void setClient(String clientId, String clientName) {
    state = state.copyWith(clientId: clientId, clientName: clientName);
  }

  void addLine(DevisLineItem line) {
    final newLines = [...state.lines, line];
    state = state.copyWith(lines: newLines);
  }

  void removeLine(int index) {
    final newLines = [...state.lines];
    newLines.removeAt(index);
    state = state.copyWith(lines: newLines);
  }

  void setNotes(String notes) {
    state = state.copyWith(notes: notes);
  }

  Future<void> save(PortalApi api) async {
    if (state.clientId.isEmpty || state.lines.isEmpty) {
      throw Exception('Veuillez remplir tous les champs requis');
    }
    try {
      await api.createDevis(state);
      reset();
    } catch (e) {
      rethrow;
    }
  }

  void reset() {
    state = const DevisFormData(clientId: '', lines: []);
  }
}

extension _DevisFormDataCopy on DevisFormData {
  DevisFormData copyWith({
    String? clientId,
    String? clientName,
    List<DevisLineItem>? lines,
    String? notes,
    String? reference,
  }) {
    return DevisFormData(
      clientId: clientId ?? this.clientId,
      clientName: clientName ?? this.clientName,
      lines: lines ?? this.lines,
      notes: notes ?? this.notes,
      reference: reference ?? this.reference,
    );
  }
}

// ── Purchase Invoice Providers ────────────────────────────────────────────────

final purchaseInvoiceListProvider = FutureProvider<List<PurchaseInvoiceSummary>>((ref) async {
  try {
    return await ref.watch(portalApiProvider).listPurchaseInvoices();
  } catch (_) {
    // Fallback to local cache
    final db = ref.watch(appDatabaseProvider);
    final cached = await db.getPurchaseInvoices();
    return cached.map((entry) {
      return PurchaseInvoiceSummary(
        id: entry.id,
        invoiceNumber: entry.invoiceNumber,
        supplierName: entry.supplierName,
        totalTTC: entry.totalTTC,
        invoiceDate: entry.invoiceDate.toIso8601String(),
        synced: entry.synced,
      );
    }).toList();
  }
});

final purchaseInvoiceFormNotifierProvider =
    StateNotifierProvider<PurchaseInvoiceFormNotifier, PurchaseInvoiceData>((ref) {
  return PurchaseInvoiceFormNotifier();
});

class PurchaseInvoiceFormNotifier extends StateNotifier<PurchaseInvoiceData> {
  PurchaseInvoiceFormNotifier()
      : super(PurchaseInvoiceData(
          supplierId: '',
          supplierName: '',
          invoiceNumber: '',
          invoiceDate: DateTime.now(),
          amountHT: 0,
          tvaRate: 20,
        ));

  void setSupplier(String supplierId, String supplierName) {
    state = state.copyWith(supplierId: supplierId, supplierName: supplierName);
  }

  void setInvoiceNumber(String number) {
    state = state.copyWith(invoiceNumber: number);
  }

  void setInvoiceDate(DateTime date) {
    state = state.copyWith(invoiceDate: date);
  }

  void setAmount(double amountHT) {
    state = state.copyWith(amountHT: amountHT);
  }

  void setTvaRate(double rate) {
    state = state.copyWith(tvaRate: rate);
  }

  void setNotes(String notes) {
    state = state.copyWith(notes: notes);
  }

  void setAttachment(String path) {
    state = state.copyWith(attachmentPath: path);
  }

  Future<void> save(PortalApi api, AppDatabase db) async {
    if (state.supplierId.isEmpty || state.invoiceNumber.isEmpty) {
      throw Exception('Veuillez remplir tous les champs requis');
    }
    try {
      // Save to backend
      final result = await api.createPurchaseInvoice(state);

      // Also save locally for offline access
      final now = DateTime.now();
      await db.insertPurchaseInvoice(
        PurchaseInvoiceEntriesCompanion.insert(
          id: result.id,
          supplierId: state.supplierId,
          supplierName: state.supplierName,
          invoiceNumber: state.invoiceNumber,
          invoiceDate: state.invoiceDate,
          amountHT: state.amountHT,
          tvaAmount: state.amountHT * (state.tvaRate / 100),
          totalTTC: state.amountHT * (1 + state.tvaRate / 100),
          notes: Value(state.notes),
          attachmentPath: Value(state.attachmentPath),
          createdAt: Value(now),
          synced: Value(true),
        ),
      );
      reset();
    } catch (e) {
      rethrow;
    }
  }

  void reset() {
    state = PurchaseInvoiceData(
      supplierId: '',
      supplierName: '',
      invoiceNumber: '',
      invoiceDate: DateTime.now(),
      amountHT: 0,
      tvaRate: 20,
    );
  }
}

extension _PurchaseInvoiceDataCopy on PurchaseInvoiceData {
  PurchaseInvoiceData copyWith({
    String? supplierId,
    String? supplierName,
    String? invoiceNumber,
    DateTime? invoiceDate,
    double? amountHT,
    double? tvaRate,
    String? notes,
    String? attachmentPath,
  }) {
    return PurchaseInvoiceData(
      supplierId: supplierId ?? this.supplierId,
      supplierName: supplierName ?? this.supplierName,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      amountHT: amountHT ?? this.amountHT,
      tvaRate: tvaRate ?? this.tvaRate,
      notes: notes ?? this.notes,
      attachmentPath: attachmentPath ?? this.attachmentPath,
    );
  }
}
