import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'connection.dart' as impl;

part 'app_database.g.dart';

// ── Table definitions ──────────────────────────────────────────────────────────

/// Pending movements that couldn't be synced (offline).
class SyncQueueEntries extends Table {
  IntColumn    get id         => integer().autoIncrement()();
  TextColumn   get entityType => text()(); // 'STOCK_MOVEMENT'
  TextColumn   get payload    => text()(); // JSON string
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  IntColumn    get retries    => integer().withDefault(const Constant(0))();
  BoolColumn   get failed     => boolean().withDefault(const Constant(false))();
}

/// Cached stock items for offline display.
class CachedStockItems extends Table {
  TextColumn   get productId        => text()();
  TextColumn   get productReference => text()();
  TextColumn   get productName      => text()();
  RealColumn   get quantity         => real()();
  RealColumn   get availableQty     => real()();
  TextColumn   get category         => text().nullable()();
  TextColumn   get supplier         => text().nullable()();
  RealColumn   get alertThreshold   => real().nullable()();
  TextColumn   get imagePath        => text().nullable()();
  TextColumn   get comment          => text().nullable()();
  DateTimeColumn get cachedAt       => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {productId};
}

/// Purchase invoices for local tracking (offline-first).
class PurchaseInvoiceEntries extends Table {
  TextColumn   get id             => text()();
  TextColumn   get supplierId     => text()();
  TextColumn   get supplierName   => text()();
  TextColumn   get invoiceNumber  => text()();
  DateTimeColumn get invoiceDate  => dateTime()();
  RealColumn   get amountHT       => real()();
  RealColumn   get tvaAmount      => real()();
  RealColumn   get totalTTC       => real()();
  TextColumn   get notes          => text().nullable()();
  TextColumn   get attachmentPath => text().nullable()();
  DateTimeColumn get createdAt    => dateTime().withDefault(currentDateAndTime)();
  BoolColumn   get synced         => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

// ── Database ──────────────────────────────────────────────────────────────────

@DriftDatabase(tables: [SyncQueueEntries, CachedStockItems, PurchaseInvoiceEntries])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(impl.connect());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        // Add new columns to CachedStockItems
        await m.addColumn(cachedStockItems, cachedStockItems.category);
        await m.addColumn(cachedStockItems, cachedStockItems.supplier);
        await m.addColumn(cachedStockItems, cachedStockItems.alertThreshold);
        await m.addColumn(cachedStockItems, cachedStockItems.imagePath);
        await m.addColumn(cachedStockItems, cachedStockItems.comment);
        // Create purchase invoices table
        await m.createTable(purchaseInvoiceEntries);
      }
    },
  );

  // ── SyncQueue DAOs ──────────────────────────────────────────────────────────

  Future<int> enqueueSyncItem(SyncQueueEntriesCompanion entry) =>
      into(syncQueueEntries).insert(entry);

  Future<List<SyncQueueEntry>> getPendingItems() =>
      (select(syncQueueEntries)..where((t) => t.failed.equals(false))).get();

  Future<void> markSyncSuccess(int id) =>
      (delete(syncQueueEntries)..where((t) => t.id.equals(id))).go();

  Future<void> markSyncFailed(int id, int currentRetries) =>
      (update(syncQueueEntries)..where((t) => t.id.equals(id))).write(
        SyncQueueEntriesCompanion(
          retries: Value(currentRetries + 1),
          failed:  Value(currentRetries + 1 >= 3),
        ),
      );

  // ── CachedStock DAOs ────────────────────────────────────────────────────────

  Future<void> upsertStockItem(CachedStockItemsCompanion item) =>
      into(cachedStockItems).insertOnConflictUpdate(item);

  Future<List<CachedStockItem>> getCachedItems() =>
      select(cachedStockItems).get();

  Future<CachedStockItem?> getCachedItemByReference(String ref) =>
      (select(cachedStockItems)..where((t) => t.productReference.equals(ref)))
          .getSingleOrNull();

  // ── PurchaseInvoice DAOs ───────────────────────────────────────────────────

  Future<int> insertPurchaseInvoice(PurchaseInvoiceEntriesCompanion invoice) =>
      into(purchaseInvoiceEntries).insert(invoice);

  Future<List<PurchaseInvoiceEntry>> getPurchaseInvoices() =>
      (select(purchaseInvoiceEntries)
        ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)]))
          .get();

  Future<void> markInvoiceSynced(String id) =>
      (update(purchaseInvoiceEntries)..where((t) => t.id.equals(id))).write(
        const PurchaseInvoiceEntriesCompanion(synced: Value(true)),
      );
}

// ── Provider ───────────────────────────────────────────────────────────────────

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
