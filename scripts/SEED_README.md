Seed scripts
=============

This folder contains helper scripts to populate a development PostgreSQL database
with demo tenants, users and domain fixtures.

Files
- `seed_with_tenants.py` — creates tenants and users and attempts to seed all public tables per-tenant (best-effort).
- `seed_all_tenants.py` — generic table walker that inserts simple test rows across tables (may skip complex tables).
- `seed_realistic_fixtures.py` — inserts realistic demo rows for `clients`, `devis`, `commandes` and `factures`.
- `seed_erp_fixtures.py` — inserts broader ERP demo data for tenants, users, clients, products, suppliers, purchase orders, receptions, invoices, payments and stock.
- `requirements.txt` — Python deps for running the scripts.

Usage
1. Install dependencies:

```bash
pip install -r scripts/requirements.txt
```

2. Configure your DB connection (example for PowerShell):

```powershell
$env:DATABASE_URL="postgresql://erp:change_me_in_prod@localhost:5432/erp_db"
```

3. Run a specific seeder, e.g.: 

```bash
python scripts/seed_realistic_fixtures.py --tenants 2 --users-per-tenant 2
```

Warnings
- Run these only on development or test databases. They may disable or bypass RLS or roll back on constraint errors.
- Review scripts before running in any environment you care about.
