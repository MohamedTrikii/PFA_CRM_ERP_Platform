from pathlib import Path
files = [
    'frontend/src/app/features/sales/products/product-catalog.component.ts',
    'frontend/src/app/features/sales/factures/facture-list.component.ts',
    'frontend/src/app/features/sales/devis/price-suggestion-dialog.component.ts',
    'frontend/src/app/features/sales/devis/devis-list.component.ts',
    'frontend/src/app/features/portal/quote-request/quote-request.component.ts',
    'frontend/src/app/features/portal/customer-portal/customer-portal.component.ts',
    'frontend/src/app/features/dashboard/employer-dashboard.component.ts',
    'frontend/src/app/features/dashboard/client-dashboard.component.ts',
    'frontend/src/app/features/achats/facture-aging/facture-aging.component.ts',
    'frontend/src/app/features/achats/bon-commande-list/bon-commande-list.component.ts',
    'backend/sales/src/main/java/com/erp/sales/service/PdfGeneratorService.java',
]
old = 'MAD'
new = 'TND'
for fp in files:
    path = Path(fp)
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count > 0:
        path.write_text(text.replace(old, new), encoding='utf-8')
        print(f'UPDATED {fp}: {count}')
    else:
        print(f'NO MATCH: {fp}')
