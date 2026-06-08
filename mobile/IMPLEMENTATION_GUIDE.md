# 📱 MOBILE APP - Phase 2 : Implementation Guide

## ✅ Completed

### 1. **Dashboard (Rôle-spécifique)** ✓
- `dashboard_screen.dart` - Écran principal avec métriques par rôle
- `dashboard_cards.dart` - Composants visuels (MetricCard, TrendChart, TopProducts)
- `dashboard_provider.dart` - Provider Riverpod pour données
- **Intégration:** Déjà dans router (ligne 68, 72, 76)

### 2. **Inventaire Amélioré** ✓ NEW
- `inventory_list_screen.dart` - Liste stock avec recherche/filtrage
  - Recherche par référence/nom
  - Filtres par catégorie
  - Indicateurs de statut (rouge/orange/vert)
  - Navigation vers détail stock

### 3. **Devis (Création)** ✓ NEW
- `devis_form_screen.dart` - Formulaire création/édition devis
  - Sélection client
  - Ajout articles (ligne par ligne)
  - Calcul automatique HT/TVA/TTC
  - Validation & sauvegarde

### 4. **Factures d'Achat** ✓ NEW
- `purchase_invoice_screen.dart` - Gestion factures fournisseurs
  - Liste + création
  - Saisie détails facture
  - Pièces jointes (scanner/fichier)
  - Calcul TVA dynamique

### 5. **Navigation Améliorée** ✓
- `router.dart` - Mise à jour avec nouveaux écrans
  - CLIENT: Accueil + Devis + Factures
  - EMPLOYEE: Accueil + Stock + Scanner
  - EMPLOYER/SUPER_ADMIN: Tous les menus

---

## 🔧 Next Steps : Backend Integration

### Phase 2A : Connect APIs
```dart
// TODO: In core/api/inventory_api.dart
Future<List<StockItem>> listStock();
Future<StockItem> getItemByReference(String ref);

// TODO: In core/api/portal_api.dart  
Future<void> createDevis(DevisFormData data);
Future<void> savePurchaseInvoice(PurchaseInvoiceData data);
```

### Phase 2B : Database Models (Drift)
```dart
// Add to app_database.dart
@DataClassName("PurchaseInvoiceData")
class PurchaseInvoices extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get supplierName => text()();
  TextColumn get invoiceNumber => text().unique()();
  DateTimeColumn get invoiceDate => dateTime()();
  RealColumn get amountHT => real()();
  RealColumn get tvaAmount => real()();
  RealColumn get totalTTC => real()();
  TextColumn get notes => text().nullable()();
  TextColumn get attachmentPath => text().nullable()();
  DateTimeColumn get createdAt => dateTime().clientDefault(() => DateTime.now())();
}
```

### Phase 2C : Offline Sync
```dart
// Extend SyncService to handle:
- Stock adjustments → backend
- Devis drafts (local cache → upload when online)
- Purchase invoices (local → cloud sync)
```

---

## 🚀 Build & Test

### Step 1: Dependencies
```bash
cd mobile
flutter pub get
flutter pub get --dependency-overrides
```

### Step 2: Build & Run
```bash
flutter build apk --debug  # Android
flutter build ios --debug  # iOS (macOS required)
flutter run              # Run on device/emulator
```

### Step 3: Test Flows
- [ ] Login with different roles
- [ ] Dashboard loads correctly
- [ ] Search/filter inventory
- [ ] Create devis (all fields)
- [ ] Add purchase invoice
- [ ] Navigation between tabs
- [ ] Offline sync notification

---

## 📦 Dependencies Status

### Already in pubspec.yaml:
```yaml
flutter_riverpod       # ✓ State management
drift                  # ✓ Local database
flutter_appauth        # ✓ Auth
mobile_scanner         # ✓ Barcode
mlkit                  # ✓ ML Vision
fl_chart               # ✓ Charts
```

### To Add (optional):
```yaml
image_picker: ^1.0.0           # Camera/gallery
file_picker: ^6.0.0            # File selection
intl: ^0.19.0                  # Date formatting
signature: ^5.2.1              # Digital signature
pdf: ^4.1.0                    # PDF generation
printing: ^5.11.0              # Print/share PDF
```

---

## 🎨 UI/UX Checklist

- [x] Gradient cards (Dashboard)
- [x] Status indicators (Stock)
- [x] Form validation (Devis/Invoices)
- [x] Loading states
- [x] Empty states
- [x] Error handling
- [ ] Animations
- [ ] Dark mode support
- [ ] Accessibility (a11y)

---

## 🔐 Security Considerations

1. **Offline Data** - Purchase invoices cached locally
   → Implement encryption (flutter_secure_storage)

2. **File Attachments** - Photos/documents
   → Scan before upload, compress

3. **Auth Token** - Already handled by flutter_appauth
   → Verify refresh on app start ✓

4. **API Calls** - All requests through ApiClient
   → Add request signing if needed (tenant_id + JWT)

---

## 📊 Metrics to Track

### User Actions:
- Daily active users per role
- Most used features (scanner, devis, etc.)
- Offline sync failures
- API response times

### Data:
- Total stock items synced
- Devis created/month
- Purchase invoices tracked
- Average invoice amount

---

## 🔄 Sync Strategy

```
Device State          Network Event          Action
───────────────────────────────────────────────────
Offline              [No change]             Cache locally (Drift)
Online (cold start)  [Detect connection]     Batch sync pending items
Creating devis       [User hits Save]        Save locally, queue for sync
                     [Network available]     Send to backend
                     [Success]               Mark synced, update UI
                     [Failed]                Retry with exponential backoff
```

---

## ✨ Phase 3 : Future Enhancements

- [ ] Document OCR (Google Vision API)
- [ ] Payment tracking dashboard
- [ ] Map view for delivery tracking
- [ ] Video call support (Jitsi)
- [ ] Signature pad integration
- [ ] Barcode label printing
- [ ] Real-time notifications
- [ ] Multi-language support (FR/EN/AR)

---

## 📞 Support

**Issues?**
1. Check Flutter logs: `flutter logs`
2. Clear cache: `flutter clean && flutter pub get`
3. Rebuild: `flutter run --no-fast-start`

**Backend Integration Help:**
- Ensure backend APIs match the expected models
- Test with Postman/Insomnia first
- Use mock data during development

---

**Last Updated:** 2026-06-07  
**Status:** Phase 2 - Frontend Complete ✓ | Backend Integration: Pending
