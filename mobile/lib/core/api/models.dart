/// Lightweight API models — plain Dart, no codegen needed.

// ── Dashboard Models ──────────────────────────────────────────────────────────

class FunnelStep {
  final String stage;
  final int count;
  const FunnelStep({required this.stage, required this.count});
  factory FunnelStep.fromJson(Map<String, dynamic> j) => FunnelStep(
        stage: j['stage'] as String,
        count: j['count'] as int? ?? 0,
      );
}

class EmployerSummary {
  final int openDevisCount;
  final int pendingRequestsCount;
  final int pendingLivraisonsCount;
  final double revenueMtd;
  final double revenueYtd;
  final int overdueFacturesCount;
  final List<FunnelStep> salesFunnel;

  const EmployerSummary({
    required this.openDevisCount,
    required this.pendingRequestsCount,
    required this.pendingLivraisonsCount,
    required this.revenueMtd,
    required this.revenueYtd,
    required this.overdueFacturesCount,
    required this.salesFunnel,
  });

  factory EmployerSummary.fromJson(Map<String, dynamic> j) => EmployerSummary(
        openDevisCount:         j['openDevisCount'] as int? ?? 0,
        pendingRequestsCount:   j['pendingRequestsCount'] as int? ?? 0,
        pendingLivraisonsCount: j['pendingLivraisonsCount'] as int? ?? 0,
        revenueMtd:             (j['revenueMtd'] as num?)?.toDouble() ?? 0.0,
        revenueYtd:             (j['revenueYtd'] as num?)?.toDouble() ?? 0.0,
        overdueFacturesCount:   j['overdueFacturesCount'] as int? ?? 0,
        salesFunnel: (j['salesFunnel'] as List? ?? [])
            .map((e) => FunnelStep.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class EmployeeSummary {
  final int livraisonsEnPreparation;
  final int livraisonsPretes;
  final int requestsNouveaux;
  final int openCommandes;

  const EmployeeSummary({
    required this.livraisonsEnPreparation,
    required this.livraisonsPretes,
    required this.requestsNouveaux,
    required this.openCommandes,
  });

  factory EmployeeSummary.fromJson(Map<String, dynamic> j) => EmployeeSummary(
        livraisonsEnPreparation: j['livraisonsEnPreparation'] as int? ?? 0,
        livraisonsPretes:        j['livraisonsPretes'] as int? ?? 0,
        requestsNouveaux:        j['requestsNouveaux'] as int? ?? 0,
        openCommandes:           j['openCommandes'] as int? ?? 0,
      );
}

class ClientSummaryDash {
  final int totalDevis;
  final int acceptedDevis;
  final int pendingRequests;
  final double totalInvoiced;
  final double totalPaid;

  const ClientSummaryDash({
    required this.totalDevis,
    required this.acceptedDevis,
    required this.pendingRequests,
    required this.totalInvoiced,
    required this.totalPaid,
  });

  double get outstanding => totalInvoiced - totalPaid;

  factory ClientSummaryDash.fromJson(Map<String, dynamic> j) => ClientSummaryDash(
        totalDevis:      j['totalDevis'] as int? ?? 0,
        acceptedDevis:   j['acceptedDevis'] as int? ?? 0,
        pendingRequests: j['pendingRequests'] as int? ?? 0,
        totalInvoiced:   (j['totalInvoiced'] as num?)?.toDouble() ?? 0.0,
        totalPaid:       (j['totalPaid'] as num?)?.toDouble() ?? 0.0,
      );
}

// ── Product ───────────────────────────────────────────────────────────────────

class ProductSummary {
  final String id;
  final String reference;
  final String name;
  final String? description;
  final String unit;
  final double unitPrice;
  final double tvaRate;
  final bool active;

  const ProductSummary({
    required this.id,
    required this.reference,
    required this.name,
    this.description,
    required this.unit,
    required this.unitPrice,
    required this.tvaRate,
    required this.active,
  });

  factory ProductSummary.fromJson(Map<String, dynamic> j) => ProductSummary(
        id:          j['id'] as String,
        reference:   j['reference'] as String,
        name:        j['name'] as String,
        description: j['description'] as String?,
        unit:        j['unit'] as String? ?? 'unité',
        unitPrice:   (j['unitPrice'] as num?)?.toDouble() ?? 0.0,
        tvaRate:     (j['tvaRate'] as num?)?.toDouble() ?? 20.0,
        active:      j['active'] as bool? ?? true,
      );
}

// ── CRM ───────────────────────────────────────────────────────────────────────

class ProspectSummary {
  final String id;
  final String name;
  final String? company;
  final String email;
  final String? phone;
  final String status;
  final String createdAt;

  const ProspectSummary({
    required this.id,
    required this.name,
    this.company,
    required this.email,
    this.phone,
    required this.status,
    required this.createdAt,
  });

  String get displayLabel => company != null && company!.isNotEmpty
      ? '$name — $company'
      : name;

  factory ProspectSummary.fromJson(Map<String, dynamic> j) => ProspectSummary(
        id:        j['id'] as String,
        name:      j['name'] as String,
        company:   j['company'] as String?,
        email:     j['email'] as String,
        phone:     j['phone'] as String?,
        status:    j['status'] as String,
        createdAt: j['createdAt'] as String? ?? '',
      );
}

// ── Sales Documents ───────────────────────────────────────────────────────────

class CommandeSummary {
  final String id;
  final String reference;
  final String status;
  final String? expectedDeliveryDate;
  final String createdAt;

  const CommandeSummary({
    required this.id,
    required this.reference,
    required this.status,
    this.expectedDeliveryDate,
    required this.createdAt,
  });

  factory CommandeSummary.fromJson(Map<String, dynamic> j) => CommandeSummary(
        id:                   j['id'] as String,
        reference:            j['reference'] as String,
        status:               j['status'] as String,
        expectedDeliveryDate: j['expectedDeliveryDate'] as String?,
        createdAt:            j['createdAt'] as String? ?? '',
      );
}

class LivraisonSummary {
  final String id;
  final String reference;
  final String status;
  final String? deliveryDate;
  final String createdAt;

  const LivraisonSummary({
    required this.id,
    required this.reference,
    required this.status,
    this.deliveryDate,
    required this.createdAt,
  });

  factory LivraisonSummary.fromJson(Map<String, dynamic> j) => LivraisonSummary(
        id:           j['id'] as String,
        reference:    j['reference'] as String,
        status:       j['status'] as String,
        deliveryDate: j['deliveryDate'] as String?,
        createdAt:    j['createdAt'] as String? ?? '',
      );
}

class FactureFullSummary {
  final String id;
  final String reference;
  final String status;
  final double totalTtc;
  final double amountPaid;
  final String? dueDate;
  final String createdAt;

  const FactureFullSummary({
    required this.id,
    required this.reference,
    required this.status,
    required this.totalTtc,
    required this.amountPaid,
    this.dueDate,
    required this.createdAt,
  });

  bool get isOverdue {
    if (status == 'EN_RETARD') return true;
    if (amountPaid >= totalTtc) return false;
    if (dueDate == null || dueDate!.isEmpty) return false;
    return DateTime.tryParse(dueDate!)?.isBefore(DateTime.now()) == true;
  }

  double get remaining => (totalTtc - amountPaid).clamp(0, double.infinity);

  factory FactureFullSummary.fromJson(Map<String, dynamic> j) => FactureFullSummary(
        id:         j['id'] as String,
        reference:  j['reference'] as String,
        status:     j['status'] as String,
        totalTtc:   (j['totalTtc'] as num?)?.toDouble() ?? 0.0,
        amountPaid: (j['amountPaid'] as num?)?.toDouble() ?? 0.0,
        dueDate:    j['dueDate'] as String?,
        createdAt:  j['createdAt'] as String? ?? '',
      );
}

// ── Achats ────────────────────────────────────────────────────────────────────

class FournisseurSummary {
  final String id;
  final String code;
  final String nom;
  final String? telephone;
  final String? email;
  final bool actif;

  const FournisseurSummary({
    required this.id,
    required this.code,
    required this.nom,
    this.telephone,
    this.email,
    required this.actif,
  });

  factory FournisseurSummary.fromJson(Map<String, dynamic> j) => FournisseurSummary(
        id:        j['id'] as String,
        code:      j['code'] as String,
        nom:       j['nom'] as String,
        telephone: j['telephone'] as String?,
        email:     j['email'] as String?,
        actif:     j['actif'] as bool? ?? true,
      );
}

class BonCommandeSummary {
  final String id;
  final String reference;
  final String status;
  final String fournisseurNom;
  final String? dateLivraison;
  final double totalTtc;
  final String createdAt;

  const BonCommandeSummary({
    required this.id,
    required this.reference,
    required this.status,
    required this.fournisseurNom,
    this.dateLivraison,
    required this.totalTtc,
    required this.createdAt,
  });

  factory BonCommandeSummary.fromJson(Map<String, dynamic> j) => BonCommandeSummary(
        id:             j['id'] as String,
        reference:      j['reference'] as String,
        status:         j['status'] as String,
        fournisseurNom: j['fournisseurNom'] as String? ?? '',
        dateLivraison:  j['dateLivraison'] as String?,
        totalTtc:       (j['totalTtc'] as num?)?.toDouble() ?? 0.0,
        createdAt:      j['createdAt'] as String? ?? '',
      );
}

// ── Inventory Location ────────────────────────────────────────────────────────

class LocationModel {
  final String id;
  final String code;
  final String name;

  const LocationModel({required this.id, required this.code, required this.name});

  factory LocationModel.fromJson(Map<String, dynamic> j) => LocationModel(
        id:   j['id'] as String,
        code: j['code'] as String,
        name: j['name'] as String? ?? j['code'] as String,
      );
}

// ── Global Search ─────────────────────────────────────────────────────────────

class SearchResult {
  final String entityType;
  final String id;
  final String title;
  final String? subtitle;

  const SearchResult({
    required this.entityType,
    required this.id,
    required this.title,
    this.subtitle,
  });
}

class StockItem {
  final String id;
  final String productId;
  final String productReference;
  final String productName;
  final double quantity;
  final double reservedQuantity;
  final double availableQuantity;
  final String updatedAt;

  const StockItem({
    required this.id,
    required this.productId,
    required this.productReference,
    required this.productName,
    required this.quantity,
    required this.reservedQuantity,
    required this.availableQuantity,
    required this.updatedAt,
  });

  factory StockItem.fromJson(Map<String, dynamic> j) => StockItem(
        id:                j['id'] as String,
        productId:         j['productId'] as String,
        productReference:  j['productReference'] as String,
        productName:       j['productName'] as String? ?? '',
        quantity:          (j['quantity'] as num).toDouble(),
        reservedQuantity:  (j['reservedQuantity'] as num).toDouble(),
        availableQuantity: (j['availableQuantity'] as num).toDouble(),
        updatedAt:         j['updatedAt'] as String? ?? '',
      );
}

class StockMovement {
  final String id;
  final String productId;
  final String productReference;
  final String movementType; // ENTREE | SORTIE | AJUSTEMENT
  final double quantity;
  final String? referenceType;
  final String? referenceId;
  final String? notes;
  final String occurredAt;

  const StockMovement({
    required this.id,
    required this.productId,
    required this.productReference,
    required this.movementType,
    required this.quantity,
    this.referenceType,
    this.referenceId,
    this.notes,
    required this.occurredAt,
  });

  factory StockMovement.fromJson(Map<String, dynamic> j) => StockMovement(
        id:               j['id'] as String,
        productId:        j['productId'] as String,
        productReference: j['productReference'] as String,
        movementType:     j['movementType'] as String,
        quantity:         (j['quantity'] as num).toDouble(),
        referenceType:    j['referenceType'] as String?,
        referenceId:      j['referenceId'] as String?,
        notes:            j['notes'] as String?,
        occurredAt:       j['occurredAt'] as String,
      );
}

class PageResult<T> {
  final List<T> content;
  final int totalElements;
  final int totalPages;
  final int number;

  const PageResult({
    required this.content,
    required this.totalElements,
    required this.totalPages,
    required this.number,
  });
}

class DevisSummary {
  final String id;
  final String? clientId;
  final String reference;
  final String status;
  final String? validUntil;
  final double totalTtc;
  final String createdAt;

  const DevisSummary({
    required this.id,
    this.clientId,
    required this.reference,
    required this.status,
    this.validUntil,
    required this.totalTtc,
    required this.createdAt,
  });

  factory DevisSummary.fromJson(Map<String, dynamic> j) => DevisSummary(
        id:         j['id'] as String,
        clientId:   j['clientId'] as String?,
        reference:  j['reference'] as String,
        status:     j['status'] as String,
        validUntil: j['validUntil'] as String?,
        totalTtc:   (j['totalTtc'] as num?)?.toDouble() ?? 0.0,
        createdAt:  j['createdAt'] as String? ?? '',
      );
}

class FactureSummary {
  final String id;
  final String reference;
  final String status;
  final double totalTtc;
  final double amountPaid;
  final String? dueDate;

  const FactureSummary({
    required this.id,
    required this.reference,
    required this.status,
    required this.totalTtc,
    required this.amountPaid,
    this.dueDate,
  });

  factory FactureSummary.fromJson(Map<String, dynamic> j) => FactureSummary(
        id:         j['id'] as String,
        reference:  j['reference'] as String,
        status:     j['status'] as String,
        totalTtc:   (j['totalTtc'] as num?)?.toDouble() ?? 0.0,
        amountPaid: (j['amountPaid'] as num?)?.toDouble() ?? 0.0,
        dueDate:    j['dueDate'] as String?,
      );
}

class DevisRequestSummary {
  final String id;
  final String projectType;
  final String status;
  final int itemCount;
  final String createdAt;

  const DevisRequestSummary({
    required this.id,
    required this.projectType,
    required this.status,
    required this.itemCount,
    required this.createdAt,
  });

  factory DevisRequestSummary.fromJson(Map<String, dynamic> j) => DevisRequestSummary(
        id:          j['id'] as String,
        projectType: j['projectType'] as String,
        status:      j['status'] as String,
        itemCount:   j['itemCount'] as int? ?? 0,
        createdAt:   j['createdAt'] as String? ?? '',
      );
}

// ── Devis Creation Models ──────────────────────────────────────────────────────

class DevisFormData {
  final String clientId;
  final String? clientName;
  final List<DevisLineItem> lines;
  final String? notes;
  final String? reference;

  const DevisFormData({
    required this.clientId,
    this.clientName,
    required this.lines,
    this.notes,
    this.reference,
  });

  Map<String, dynamic> toJson() => {
    'clientId': clientId,
    'clientName': clientName,
    'lines': lines.map((l) => l.toJson()).toList(),
    'notes': notes,
    'reference': reference,
  };
}

class DevisLineItem {
  final String productId;
  final String description;
  final double unitPrice;
  final int quantity;
  final double? discount;

  const DevisLineItem({
    required this.productId,
    required this.description,
    required this.unitPrice,
    required this.quantity,
    this.discount,
  });

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'description': description,
    'unitPrice': unitPrice,
    'quantity': quantity,
    'discount': discount,
  };
}

// ── Purchase Invoice Models ────────────────────────────────────────────────────

class PurchaseInvoiceData {
  final String supplierId;
  final String supplierName;
  final String invoiceNumber;
  final DateTime invoiceDate;
  final double amountHT;
  final double tvaRate;
  final String? notes;
  final String? attachmentPath;

  const PurchaseInvoiceData({
    required this.supplierId,
    required this.supplierName,
    required this.invoiceNumber,
    required this.invoiceDate,
    required this.amountHT,
    required this.tvaRate,
    this.notes,
    this.attachmentPath,
  });

  Map<String, dynamic> toJson() => {
    'supplierId': supplierId,
    'supplierName': supplierName,
    'invoiceNumber': invoiceNumber,
    'invoiceDate': invoiceDate.toIso8601String(),
    'amountHT': amountHT,
    'tvaRate': tvaRate,
    'notes': notes,
    'attachmentPath': attachmentPath,
  };
}

class PurchaseInvoiceSummary {
  final String id;
  final String invoiceNumber;
  final String supplierName;
  final double totalTTC;
  final String invoiceDate;
  final bool synced;

  const PurchaseInvoiceSummary({
    required this.id,
    required this.invoiceNumber,
    required this.supplierName,
    required this.totalTTC,
    required this.invoiceDate,
    this.synced = false,
  });

  factory PurchaseInvoiceSummary.fromJson(Map<String, dynamic> j) => PurchaseInvoiceSummary(
    id: j['id'] as String,
    invoiceNumber: j['invoiceNumber'] as String,
    supplierName: j['supplierName'] as String,
    totalTTC: (j['totalTTC'] as num?)?.toDouble() ?? 0.0,
    invoiceDate: j['invoiceDate'] as String? ?? '',
    synced: j['synced'] as bool? ?? false,
  );
}
