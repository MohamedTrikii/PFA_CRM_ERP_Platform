#!/usr/bin/env python3
"""
seed_training_data.py — Comprehensive ML training data for ERP/CRM platform.

Creates 2 additional tenants (aluminium-maroc, vitrerie-atlas) and seeds all 3
tenants with realistic aluminum-joinery business data spread over 18 months,
providing enough volume and variety to train all four ML models:

  • Prophet   — sales_forecast_prophet   (≥22 ACCEPTE devis / tenant)
  • XGBoost   — quote_acceptance_xgboost (22 ACCEPTE + 13 REFUSE / tenant)
  • XGBoost   — payment_risk_xgboost     (28 factures with due_date / tenant)
  • IForest   — stock_anomaly_iforest    (60 stock movements / tenant)

Usage:
    DATABASE_URL=postgresql://erp:erp@localhost:5432/erp python seed_training_data.py
"""

import asyncio
import json
import os
import random
import sys
import uuid
from datetime import date, timedelta, datetime, timezone

import asyncpg

DB_URL = os.getenv("DATABASE_URL", "postgresql://erp:erp@localhost:5432/erp")
random.seed(42)

# ─── Fixed tenant / user UUIDs ────────────────────────────────────────────────

T_DEMO = "00000000-0000-0000-0000-000000000002"
T_ALUM = "00000000-0000-0000-0000-000000000003"
T_VITR = "00000000-0000-0000-0000-000000000004"

TENANT_META = [
    (T_DEMO, "demo-tenant",     "Demo Aluminum Joinery Co."),
    (T_ALUM, "aluminium-maroc", "Aluminium Maroc SARL"),
    (T_VITR, "vitrerie-atlas",  "Vitrerie Atlas SA"),
]

# Per-tenant employees (employer, sales employee, warehouse, buyer, accountant)
TENANT_USERS = {
    T_DEMO: {
        "employer":   "10000000-0000-0000-0000-000000000002",
        "sales":      "10000000-0000-0000-0000-000000000003",
        "warehouse":  "10000000-0000-0000-0000-000000000005",
        "buyer":      "10000000-0000-0000-0000-000000000006",
        "accountant": "10000000-0000-0000-0000-000000000007",
    },
    T_ALUM: {
        "employer":   "20000000-0000-0000-0000-000000000001",
        "sales":      "20000000-0000-0000-0000-000000000002",
        "warehouse":  "20000000-0000-0000-0000-000000000003",
        "buyer":      "20000000-0000-0000-0000-000000000004",
        "accountant": "20000000-0000-0000-0000-000000000005",
    },
    T_VITR: {
        "employer":   "30000000-0000-0000-0000-000000000001",
        "sales":      "30000000-0000-0000-0000-000000000002",
        "warehouse":  "30000000-0000-0000-0000-000000000003",
        "buyer":      "30000000-0000-0000-0000-000000000004",
        "accountant": "30000000-0000-0000-0000-000000000005",
    },
}

DATE_START = date(2025, 1, 1)
DATE_END   = date(2026, 5, 31)

# ─── Catalog product definitions ──────────────────────────────────────────────

# (id, ref, name, price, tva, unit, category)  — demo already seeded by Flyway
DEMO_PRODUCTS = [
    ("a0000001-0000-0000-0000-000000000001","ALU-PRO-6060","Profilé aluminium 60x60 mm", 85.00,20.0,"ml","Profilés"),
    ("a0000001-0000-0000-0000-000000000002","ALU-PRO-4040","Profilé aluminium 40x40 mm", 62.00,20.0,"ml","Profilés"),
    ("a0000001-0000-0000-0000-000000000003","VIT-DOUBLE-4","Vitrage double 4/16/4 mm",   45.00,20.0,"m²","Vitrage"),
    ("a0000001-0000-0000-0000-000000000004","VIT-SIMPLE-6","Vitrage simple 6 mm",         22.00,20.0,"m²","Vitrage"),
    ("a0000001-0000-0000-0000-000000000005","JOINT-EPDM-12","Joint EPDM 12 mm",           18.50,20.0,"ml","Quincaillerie"),
    ("a0000001-0000-0000-0000-000000000006","PAUMELLE-3D","Paumelle 3D réglable",         12.00,20.0,"unité","Quincaillerie"),
    ("a0000001-0000-0000-0000-000000000007","POIGNEE-ALU-OB","Poignée aluminium olive",   28.00,20.0,"unité","Quincaillerie"),
    ("a0000001-0000-0000-0000-000000000008","POSE-FENETRE","Pose fenêtre standard",       150.00,20.0,"unité","Main d'œuvre"),
    ("a0000001-0000-0000-0000-000000000009","POSE-PORTE","Pose porte aluminium",          220.00,20.0,"unité","Main d'œuvre"),
    ("a0000001-0000-0000-0000-000000000010","CALFEUTREMENT","Calfeutrement et finition",    8.50,20.0,"ml","Finition"),
]

# (ref, name, price, tva, unit, category) — id generated at runtime
ALUM_PRODUCTS_DEF = [
    ("ALM-PRO-6060","Profilé alu T60 anodisé",          90.00,20.0,"ml","Profilés"),
    ("ALM-PRO-4545","Profilé alu T45 anodisé",          68.00,20.0,"ml","Profilés"),
    ("ALM-PRO-4030","Profilé alu 40×30 brut",           45.00,20.0,"ml","Profilés"),
    ("ALM-VIT-DVA", "Double vitrage 4/16/4 argon",      55.00,20.0,"m²","Vitrage"),
    ("ALM-VIT-SIM", "Vitrage simple 5mm",               25.00,20.0,"m²","Vitrage"),
    ("ALM-VIT-SEC", "Vitrage feuilleté sécurit",        75.00,20.0,"m²","Vitrage"),
    ("ALM-JNT-EPDM","Joint EPDM noir 10mm",             16.00,20.0,"ml","Quincaillerie"),
    ("ALM-PMLE-3D", "Paumelle aluminium 3D réglable",   14.00,20.0,"unité","Quincaillerie"),
    ("ALM-POSE-FEN","Pose fenêtre coulissante",         180.00,20.0,"unité","Main d'œuvre"),
    ("ALM-POSE-POR","Pose porte-fenêtre standard",      250.00,20.0,"unité","Main d'œuvre"),
]

VITR_PRODUCTS_DEF = [
    ("VIT-ALU-6080","Profilé alu 60×80 thermique",       98.00,20.0,"ml","Profilés"),
    ("VIT-ALU-5050","Profilé alu 50×50 anodisé",         72.00,20.0,"ml","Profilés"),
    ("VIT-DVR-531", "Double vitrage 5/16/4 basse émiss", 62.00,20.0,"m²","Vitrage"),
    ("VIT-TRP-442", "Triple vitrage 4/14/4/14/4",        95.00,20.0,"m²","Vitrage"),
    ("VIT-SIM-CLR", "Vitrage simple clair 4mm",          20.00,20.0,"m²","Vitrage"),
    ("VIT-LMN-TIT", "Vitrage laminé titanium",          110.00,20.0,"m²","Vitrage"),
    ("VIT-SEAL-BLK","Silicone structurel noir",          22.00,20.0,"ml","Étanchéité"),
    ("VIT-GASK-CLR","Bande d'étanchéité EPDM",          14.50,20.0,"ml","Étanchéité"),
    ("VIT-POSE-VER","Pose verrière atrium",             350.00,20.0,"unité","Main d'œuvre"),
    ("VIT-POSE-RID","Pose rideau de verre",             420.00,20.0,"unité","Main d'œuvre"),
]

# ─── Business data pools ──────────────────────────────────────────────────────

COMPANY_NAMES = [
    "Constructions Hajji SARL","Immobilier Saada","Société Bâtiment Atlas",
    "Résidences Anfa","Entreprise Benali Frères","Architecture & Bâtiment Maroc",
    "Promoteur Al-Farabi","Groupe Almaz Construction","BTP Cherkaoui & Associés",
    "Développement Immobilier Marrakech",
]
PARTICULIER_NAMES = [
    "M. Ahmed Benali","Mme. Fatima Cherkaoui","M. Youssef Alami",
    "Mme. Zineb Tahiri","M. Rachid Ouhssain","Mme. Nadia Boussaid",
    "M. Hamid Lekbiri","M. Omar Senhaji","Mme. Laila Marzouk","M. Khalid Fassi",
]
CITIES = ["Casablanca","Rabat","Marrakech","Fès","Agadir","Tanger","Meknès","Oujda"]
FOURNISSEUR_DATA = [
    ("Aluminium Extrusion Maroc","AEM-001","aem@example.ma","0522-123456"),
    ("Global Vitrage SARL",      "GVS-001","gvs@example.ma","0537-654321"),
    ("Quincaillerie Atlas",      "QAT-001","qat@example.ma","0524-987654"),
    ("Profilés Euro Import",     "PEI-001","pei@example.ma","0660-111222"),
    ("Fournitures Industrielles","FIM-001","fim@example.ma","0661-333444"),
]
PAYMENT_METHODS  = ["VIREMENT","CHEQUE","ESPECES","CB","PRELEVEMENT"]
PROJECT_TYPES    = ["FENETRE","PORTE","PORTE_FENETRE","BAIE_VITREE","VERANDAS","GARDE_CORPS","AUTRE"]
OPENING_TYPES    = ["FIXE","BATTANT","COULISSANT","OSCILLO_BATTANT","PIVOTANT"]
GLASS_TYPES      = ["SIMPLE_4","DV_4_16_4","DV_SECURITE","FEUILLETE","ARGON"]
COLORS           = ["RAL 9016 Blanc","RAL 7016 Anthracite","Bois","Anodisé naturel","RAL 6005 Vert"]
PROFILE_SERIES   = ["Série 40","Série 45","Série 60","Série 80","SERIES_II"]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def uid() -> str:
    return str(uuid.uuid4())

def rand_date(start: date = DATE_START, end: date = DATE_END) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))

def spread_dates(n: int, start: date = DATE_START, end: date = DATE_END) -> list[date]:
    """Evenly spread n dates across the range with ±10 day jitter."""
    total = (end - start).days
    step  = total / n
    result = []
    for i in range(n):
        base  = start + timedelta(days=int(i * step))
        jitter = random.randint(-10, 10)
        d = max(start, min(end, base + timedelta(days=jitter)))
        result.append(d)
    return sorted(result)

def calc(qty: float, price: float, disc: float = 0.0, tva: float = 20.0):
    ht  = round(qty * price * (1 - disc / 100), 2)
    tva_amt = round(ht * tva / 100, 2)
    ttc = round(ht + tva_amt, 2)
    return ht, tva_amt, ttc

def ts(d: date) -> datetime:
    h = random.randint(8, 17)
    m = random.choice([0, 15, 30, 45])
    return datetime(d.year, d.month, d.day, h, m, 0, tzinfo=timezone.utc)

def phone() -> str:
    p = random.choice(["0661","0662","0670","0671","0680","0522","0524","0537"])
    return f"{p}-{random.randint(100000, 999999)}"

def addr_json(city: str | None = None) -> str:
    c = city or random.choice(CITIES)
    street = f"{random.randint(1,200)} Rue {random.choice(['Hassan II','Mohammed V','Atlas','des Roses','du Commerce'])}"
    return json.dumps({"street": street, "city": c, "zip": str(random.randint(10000, 99999)), "country": "Maroc"})

def snap(ref: str, name: str, unit: str, tva: float) -> str:
    return json.dumps({"reference": ref, "name": name, "unit": unit, "tva_rate": tva})

# ─── Seed: tenants + users ────────────────────────────────────────────────────

async def seed_global(conn):
    # New tenants (demo already exists)
    for tid, slug, name in TENANT_META[1:]:
        await conn.execute(
            "INSERT INTO tenants(id,slug,name,active) VALUES($1,$2,$3,true) ON CONFLICT(slug) DO NOTHING",
            tid, slug, name,
        )

    # New users for demo-tenant (add warehouse, buyer, accountant)
    demo_new = [
        ("10000000-0000-0000-0000-000000000005", T_DEMO, "demo-warehouse-kc",
         "warehouse@demo.erp.local", "Demo Warehouse", "EMPLOYEE", "WAREHOUSE"),
        ("10000000-0000-0000-0000-000000000006", T_DEMO, "demo-buyer-kc",
         "buyer@demo.erp.local",     "Demo Buyer",     "EMPLOYEE", "BUYER"),
        ("10000000-0000-0000-0000-000000000007", T_DEMO, "demo-accountant-kc",
         "accountant@demo.erp.local","Demo Accountant","EMPLOYEE", "ACCOUNTANT"),
    ]
    for row in demo_new:
        await conn.execute(
            "INSERT INTO users(id,tenant_id,keycloak_id,email,display_name,role,active,employee_function) "
            "VALUES($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT(keycloak_id) DO NOTHING",
            *row,
        )

    # All users for aluminium-maroc
    alum_users = [
        (TENANT_USERS[T_ALUM]["employer"],   T_ALUM,"alum-employer-kc",  "employer@alum.erp.local",  "Alum Employer",  "EMPLOYER",  None),
        (TENANT_USERS[T_ALUM]["sales"],      T_ALUM,"alum-sales-kc",     "sales@alum.erp.local",     "Alum Sales",     "EMPLOYEE",  "SALES"),
        (TENANT_USERS[T_ALUM]["warehouse"],  T_ALUM,"alum-warehouse-kc", "warehouse@alum.erp.local", "Alum Warehouse", "EMPLOYEE",  "WAREHOUSE"),
        (TENANT_USERS[T_ALUM]["buyer"],      T_ALUM,"alum-buyer-kc",     "buyer@alum.erp.local",     "Alum Buyer",     "EMPLOYEE",  "BUYER"),
        (TENANT_USERS[T_ALUM]["accountant"], T_ALUM,"alum-accountant-kc","accountant@alum.erp.local","Alum Accountant","EMPLOYEE",  "ACCOUNTANT"),
    ]
    # All users for vitrerie-atlas
    vitr_users = [
        (TENANT_USERS[T_VITR]["employer"],   T_VITR,"vitr-employer-kc",  "employer@vitr.erp.local",  "Vitr Employer",  "EMPLOYER",  None),
        (TENANT_USERS[T_VITR]["sales"],      T_VITR,"vitr-sales-kc",     "sales@vitr.erp.local",     "Vitr Sales",     "EMPLOYEE",  "SALES"),
        (TENANT_USERS[T_VITR]["warehouse"],  T_VITR,"vitr-warehouse-kc", "warehouse@vitr.erp.local", "Vitr Warehouse", "EMPLOYEE",  "WAREHOUSE"),
        (TENANT_USERS[T_VITR]["buyer"],      T_VITR,"vitr-buyer-kc",     "buyer@vitr.erp.local",     "Vitr Buyer",     "EMPLOYEE",  "BUYER"),
        (TENANT_USERS[T_VITR]["accountant"], T_VITR,"vitr-accountant-kc","accountant@vitr.erp.local","Vitr Accountant","EMPLOYEE",  "ACCOUNTANT"),
    ]
    for row in alum_users + vitr_users:
        uid_, tid, kc, email, dname, role, fn = row
        await conn.execute(
            "INSERT INTO users(id,tenant_id,keycloak_id,email,display_name,role,active,employee_function) "
            "VALUES($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT(keycloak_id) DO NOTHING",
            uid_, tid, kc, email, dname, role, fn,
        )
    print("  ✓ tenants + users")

# ─── Seed: catalog products ───────────────────────────────────────────────────

async def seed_products(conn, tenant_id: str, products_def: list) -> list[tuple]:
    """Insert products; return list of (id, ref, name, price, tva, unit)."""
    result = []
    for row in products_def:
        if len(row) == 7:
            pid, ref, name, price, tva, unit, cat = row
        else:
            ref, name, price, tva, unit, cat = row
            pid = uid()
        await conn.execute(
            "INSERT INTO catalog_products(id,tenant_id,reference,name,unit_price,tva_rate,unit,category,active) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(id) DO NOTHING",
            pid, tenant_id, ref, name, price, tva, unit, cat,
        )
        result.append((pid, ref, name, price, tva, unit))
    return result

# ─── Seed: CRM ───────────────────────────────────────────────────────────────

async def seed_crm(conn, tenant_id: str, sales_uid: str, employer_uid: str) -> list[str]:
    """Seed prospects, clients, opportunities, devis_requests. Returns client UUIDs."""
    client_ids = []

    # 8 prospects (mix of statuses)
    prospect_statuses = ["QUALIFIE","QUALIFIE","QUALIFIE","CONVERTI","CONVERTI","CONVERTI","PERDU","NOUVEAU"]
    prospect_ids = []
    for i in range(8):
        pid = uid()
        name = random.choice(COMPANY_NAMES[:6]) if i < 5 else random.choice(PARTICULIER_NAMES[:3])
        d = rand_date(DATE_START, date(2026, 3, 31))
        await conn.execute(
            "INSERT INTO prospects(id,tenant_id,name,email,phone,company,source,status,notes,assigned_to,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)",
            pid, tenant_id, name,
            f"prospect{i+1}@{tenant_id[:8]}.ma",
            phone(),
            f"Entreprise {i+1}" if i < 5 else None,
            random.choice(["REFERRAL","WEBSITE","COLD_CALL","TRADE_SHOW"]),
            prospect_statuses[i],
            "Prospect identifié lors d'un salon professionnel.",
            sales_uid, ts(d),
        )
        prospect_ids.append(pid)

    # 10 clients (8 from prospects + 2 direct)
    for i in range(10):
        cid = uid()
        is_pro = i < 7
        name   = COMPANY_NAMES[i] if is_pro else PARTICULIER_NAMES[i - 7]
        city   = random.choice(CITIES)
        d = rand_date(DATE_START, date(2026, 2, 28))
        await conn.execute(
            "INSERT INTO clients(id,tenant_id,prospect_id,reference,name,email,phone,address,type,notes,active,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$11)",
            cid, tenant_id,
            prospect_ids[i] if i < 8 else None,
            f"CLI-{tenant_id[:3].upper()}-{1000+i}",
            name,
            f"client{i+1}@{tenant_id[:8]}.ma",
            phone(), addr_json(city),
            "PROFESSIONNEL" if is_pro else "PARTICULIER",
            "Client fidèle." if i % 3 == 0 else None,
            ts(d),
        )
        client_ids.append(cid)

    # 6 opportunities
    opp_statuses = ["GAGNEE","GAGNEE","GAGNEE","EN_COURS","EN_COURS","PERDUE"]
    for i in range(6):
        cid = client_ids[i]
        d   = rand_date(DATE_START, date(2026, 4, 30))
        val = round(random.uniform(15000, 250000), 2)
        await conn.execute(
            "INSERT INTO opportunities(id,tenant_id,client_id,title,description,status,estimated_value,probability,"
            "expected_close_date,assigned_to,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)",
            uid(), tenant_id, cid,
            f"Projet fenêtres {random.choice(['résidentiel','commercial','industriel'])} — lot {i+1}",
            "Remplacement complet des menuiseries.",
            opp_statuses[i], val,
            random.randint(20, 90),
            d + timedelta(days=random.randint(30, 120)),
            employer_uid, ts(d),
        )

    # 8 devis requests with 2-4 items each
    req_statuses = ["DEVIS_CREE","DEVIS_CREE","EN_ETUDE","EN_ETUDE","NOUVEAU","NOUVEAU","REFUSE","DEVIS_CREE"]
    for i in range(8):
        rid = uid()
        cid = client_ids[i % 10]
        d   = rand_date(date(2025, 6, 1), DATE_END)
        await conn.execute(
            "INSERT INTO devis_requests(id,tenant_id,client_id,client_name,client_email,client_phone,"
            "client_address,project_type,description,status,notes,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)",
            rid, tenant_id, cid,
            COMPANY_NAMES[i % 10],
            f"demandedevis{i+1}@mail.ma",
            phone(),
            f"{random.randint(1,200)} Avenue Hassan II, {random.choice(CITIES)}",
            random.choice(PROJECT_TYPES),
            "Remplacement des fenêtres et portes. Profil thermique souhaité.",
            req_statuses[i],
            "À traiter en priorité." if i < 3 else None,
            ts(d),
        )
        for pos in range(random.randint(2, 4)):
            await conn.execute(
                "INSERT INTO devis_request_items(id,request_id,quantity,width_mm,height_mm,"
                "profile_series,opening_type,glass_type,color,accessories,notes,position) "
                "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
                uid(), rid,
                random.randint(1, 6),
                round(random.uniform(600, 2400), 1),
                round(random.uniform(800, 2200), 1),
                random.choice(PROFILE_SERIES),
                random.choice(OPENING_TYPES),
                random.choice(GLASS_TYPES),
                random.choice(COLORS),
                random.choice(["Serrure multipoints", "Poignée dorée", None]),
                None, pos,
            )

    print(f"  ✓ CRM ({len(client_ids)} clients)")
    return client_ids

# ─── Seed: Sales ──────────────────────────────────────────────────────────────

async def seed_sales(conn, tenant_id: str, client_ids: list[str], products: list[tuple],
                     employer_uid: str, prefix: str) -> None:
    """
    Seed 44 devis (22 ACCEPTE, 13 REFUSE, 5 ENVOYE, 3 EXPIRE, 1 BROUILLON),
    22 commandes, 18 livraisons, 28 factures, and encaissements.
    """
    # ── Devis ──────────────────────────────────────────────────────────────────
    # 22 ACCEPTE spread across 18 months (for Prophet + XGBoost quote)
    accepte_dates = spread_dates(22)
    # 13 REFUSE spread randomly
    refuse_dates  = sorted(spread_dates(13, date(2025, 2, 1), date(2026, 4, 30)))

    devis_plan = (
        [(d, "ACCEPTE") for d in accepte_dates] +
        [(d, "REFUSE")  for d in refuse_dates ] +
        [(rand_date(date(2026, 1, 1), DATE_END), "ENVOYE")  for _ in range(5)] +
        [(rand_date(date(2025, 3, 1), date(2025, 12, 31)), "EXPIRE") for _ in range(3)] +
        [(rand_date(date(2026, 4, 1), DATE_END), "BROUILLON")]
    )
    random.shuffle(devis_plan)

    devis_ids    = {}   # status → list[(devis_id, total_ht, total_tva, total_ttc, client_id)]
    ref_ctr = {"devis": 2000, "cmd": 3000, "liv": 4000, "fac": 5000}

    for i, (d, status) in enumerate(devis_plan):
        did     = uid()
        cid     = client_ids[i % len(client_ids)]
        disc    = random.choice([0.0, 0.0, 2.5, 5.0, 10.0])
        valid   = d + timedelta(days=random.choice([30, 45, 60, 90]))
        ref_ctr["devis"] += 1
        devis_ref = f"DEV-{prefix}-{ref_ctr['devis']}"

        # 2-5 lines per devis
        lines = random.sample(products, k=min(random.randint(2, 5), len(products)))
        total_ht = total_tva = total_ttc = 0.0
        line_rows = []
        for pos, (pid, pref, pname, pprice, ptva, punit) in enumerate(lines):
            qty  = round(random.uniform(1, 20), 2) if punit in ("ml","m²") else random.randint(1, 10)
            lht, ltva, lttc = calc(qty, pprice, disc, ptva)
            total_ht  += lht
            total_tva += ltva
            total_ttc += lttc
            line_rows.append((uid(), did, pid, snap(pref, pname, punit, ptva), pname, qty, pprice, ptva, disc, lht, pos))

        total_ht  = round(total_ht, 2)
        total_tva = round(total_tva, 2)
        total_ttc = round(total_ttc, 2)

        await conn.execute(
            "INSERT INTO devis(id,tenant_id,client_id,reference,status,valid_until,discount_pct,"
            "total_ht,total_tva,total_ttc,notes,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)",
            did, tenant_id, cid, devis_ref, status, valid, disc,
            total_ht, total_tva, total_ttc,
            "Devis établi suite à visite chantier." if random.random() > 0.5 else None,
            ts(d),
        )
        for lr in line_rows:
            await conn.execute(
                "INSERT INTO devis_lines(id,devis_id,product_id,product_snapshot,description,"
                "quantity,unit_price,tva_rate,discount_pct,total_ht,position) "
                "VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)",
                *lr,
            )

        devis_ids.setdefault(status, []).append(
            (did, total_ht, total_tva, total_ttc, cid, d)
        )

    # ── Commandes (from ACCEPTE devis) ─────────────────────────────────────────
    cmd_statuses = (
        ["LIVREE"] * 10 + ["CONFIRMEE"] * 6 + ["EN_COURS"] * 4 + ["EN_ATTENTE"] * 2
    )
    random.shuffle(cmd_statuses)
    commandes = []  # list of (cmd_id, devis_total_ht, devis_total_tva, devis_total_ttc, client_id, cmd_date, cmd_status)

    for idx, (did, dht, dtva, dttc, cid, d_date) in enumerate(devis_ids.get("ACCEPTE", [])):
        cmd_id = uid()
        ref_ctr["cmd"] += 1
        cmd_ref    = f"CMD-{prefix}-{ref_ctr['cmd']}"
        cmd_status = cmd_statuses[idx % len(cmd_statuses)]
        cmd_date   = d_date + timedelta(days=random.randint(2, 14))
        exp_del    = cmd_date + timedelta(days=random.randint(14, 60))
        await conn.execute(
            "INSERT INTO commandes(id,tenant_id,devis_id,reference,status,delivery_address,"
            "expected_delivery_date,notes,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$9)",
            cmd_id, tenant_id, did, cmd_ref, cmd_status,
            addr_json(), exp_del,
            "Livraison chantier." if random.random() > 0.6 else None,
            ts(cmd_date),
        )
        commandes.append((cmd_id, dht, dtva, dttc, cid, cmd_date, cmd_status))

    # ── Livraisons (from LIVREE + EN_COURS commandes) ─────────────────────────
    liv_commandes = [c for c in commandes if c[6] in ("LIVREE", "EN_COURS", "CONFIRMEE")]
    for cmd_id, _, _, _, _, cmd_date, cmd_status in liv_commandes[:18]:
        liv_id  = uid()
        ref_ctr["liv"] += 1
        liv_ref    = f"LIV-{prefix}-{ref_ctr['liv']}"
        liv_status = "LIVREE" if cmd_status == "LIVREE" else "EN_COURS"
        liv_date   = cmd_date + timedelta(days=random.randint(7, 30))
        if liv_date > DATE_END:
            liv_date = DATE_END

        await conn.execute(
            "INSERT INTO livraisons(id,tenant_id,commande_id,reference,status,delivery_date,notes,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)",
            liv_id, tenant_id, cmd_id, liv_ref, liv_status, liv_date,
            "Livraison effectuée par notre équipe." if liv_status == "LIVREE" else None,
            ts(liv_date),
        )
        # 2-3 livraison lines
        for pos, (pid, pref, *_) in enumerate(random.sample(products, k=random.randint(2, 3))):
            qty_ord = round(random.uniform(5, 50), 2)
            qty_del = qty_ord if liv_status == "LIVREE" else round(qty_ord * random.uniform(0.6, 0.9), 2)
            await conn.execute(
                "INSERT INTO livraison_lines(id,livraison_id,product_id,product_reference,quantity_ordered,quantity_delivered) "
                "VALUES($1,$2,$3,$4,$5,$6)",
                uid(), liv_id, pid, pref, qty_ord, qty_del,
            )

    # ── Factures (28 per tenant, from commandes) ──────────────────────────────
    # Status distribution engineered for payment_risk XGBoost:
    #  12 PAYEE (ratio=1.0, label=0), 6 PARTIELLEMENT_PAYEE (ratio<1, label=1)
    #  5 EN_RETARD (ratio~0, label=1), 3 EMISE (ratio=0, label=1), 2 ANNULEE
    facture_spec = (
        [("PAYEE",              1.00)] * 12 +
        [("PARTIELLEMENT_PAYEE",round(random.uniform(0.3, 0.85), 2)) for _ in range(6)] +
        [("EN_RETARD",          round(random.uniform(0.0, 0.25), 2)) for _ in range(5)] +
        [("EMISE",              0.00)] * 3 +
        [("ANNULEE",            0.00)] * 2
    )
    random.shuffle(facture_spec)

    for idx, (cmd_id, dht, dtva, dttc, cid, cmd_date, _) in enumerate(commandes[:28]):
        fstatus, pay_ratio = facture_spec[idx % len(facture_spec)]
        fac_id  = uid()
        ref_ctr["fac"] += 1
        fac_ref    = f"FAC-{prefix}-{ref_ctr['fac']}"
        issue_date = cmd_date + timedelta(days=random.randint(1, 10))
        if issue_date > DATE_END:
            issue_date = DATE_END
        due_days   = random.choice([30, 45, 60, 90])
        due_date   = issue_date + timedelta(days=due_days)
        amount_paid = round(dttc * pay_ratio, 2)

        await conn.execute(
            "INSERT INTO factures(id,tenant_id,commande_id,client_id,reference,status,"
            "issue_date,due_date,total_ht,total_tva,total_ttc,amount_paid,notes,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)",
            fac_id, tenant_id, cmd_id, cid, fac_ref, fstatus,
            issue_date, due_date, dht, dtva, dttc, amount_paid,
            "Facture émise suite à livraison." if random.random() > 0.5 else None,
            ts(issue_date),
        )

        # 2-4 facture lines (mirror devis totals proportionally via random lines)
        n_lines = random.randint(2, 4)
        chosen  = random.sample(products, k=min(n_lines, len(products)))
        line_ht = line_tva = line_ttc = 0.0
        for pos, (pid, pref, pname, pprice, ptva, punit) in enumerate(chosen):
            qty  = round(random.uniform(2, 15), 2) if punit in ("ml","m²") else random.randint(1, 8)
            disc = random.choice([0.0, 0.0, 5.0])
            lht, ltva, lttc = calc(qty, pprice, disc, ptva)
            line_ht  += lht
            line_tva += ltva
            line_ttc += lttc
            await conn.execute(
                "INSERT INTO facture_lines(id,facture_id,product_id,description,"
                "quantity,unit_price,tva_rate,discount_pct,total_ht,total_tva,total_ttc) "
                "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
                uid(), fac_id, pid, pname, qty, pprice, ptva, disc,
                lht, ltva, lttc,
            )

        # Encaissements for paid/partially-paid invoices
        if pay_ratio > 0 and fstatus not in ("ANNULEE",):
            n_pmts = 2 if fstatus == "PARTIELLEMENT_PAYEE" and pay_ratio > 0.5 else 1
            remaining = amount_paid
            for p in range(n_pmts):
                pmt_amount = round(remaining / (n_pmts - p), 2)
                remaining -= pmt_amount
                pmt_date = issue_date + timedelta(days=random.randint(5, due_days - 1))
                if pmt_date > DATE_END:
                    pmt_date = DATE_END
                await conn.execute(
                    "INSERT INTO encaissements(id,tenant_id,facture_id,amount,payment_date,"
                    "payment_method,reference,notes,created_at) "
                    "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    uid(), tenant_id, fac_id, pmt_amount, pmt_date,
                    random.choice(PAYMENT_METHODS),
                    f"REG-{random.randint(10000,99999)}",
                    None, ts(pmt_date),
                )

    print(f"  ✓ Sales (44 devis, 22 commandes, 18 livraisons, 28 factures)")

# ─── Seed: Achat ──────────────────────────────────────────────────────────────

async def seed_achat(conn, tenant_id: str, products: list[tuple],
                     buyer_uid: str, location_ids: list[str], prefix: str) -> list[tuple]:
    """Seed fournisseurs, bons_commande, bons_réception. Returns bc_ligne data."""
    bc_lignes = []

    # 5 fournisseurs
    fourn_ids = []
    for nom, code, email, tel in FOURNISSEUR_DATA:
        fid = uid()
        city = random.choice(CITIES)
        await conn.execute(
            "INSERT INTO fournisseurs(id,tenant_id,nom,code,email,telephone,adresse,pays,actif,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,'MA',true,$8,$8) ON CONFLICT(tenant_id,code) DO NOTHING",
            fid, tenant_id,
            f"{nom} ({prefix})", f"{code}-{prefix[:3].upper()}",
            email, tel,
            f"Zone Industrielle, {city}",
            ts(rand_date(DATE_START, date(2025, 6, 1))),
        )
        fourn_ids.append(fid)

    # 10 bons_commande
    bc_statuses = ["RECU"]*4 + ["PARTIELLEMENT_RECU"]*3 + ["ENVOYE"]*2 + ["BROUILLON"]*1
    ref_ctr = {"bc": 6000, "br": 7000}

    for i in range(10):
        bc_id  = uid()
        ref_ctr["bc"] += 1
        bc_ref    = f"BC-{prefix}-{ref_ctr['bc']}"
        bc_status = bc_statuses[i]
        fid    = fourn_ids[i % len(fourn_ids)]
        d      = rand_date(DATE_START, date(2026, 3, 31))

        # 2-4 lignes
        chosen = random.sample(products, k=random.randint(2, 4))
        total_ht = total_tva = total_ttc = 0.0
        ligne_rows = []
        for pos, (pid, pref, pname, pprice, ptva, punit) in enumerate(chosen):
            qty  = round(random.uniform(10, 100), 1)
            lht, ltva, lttc = calc(qty, pprice * 0.85, 0.0, ptva)  # purchase price 15% less
            total_ht  += lht
            total_tva += ltva
            total_ttc += lttc
            bl_id = uid()
            ligne_rows.append((bl_id, bc_id, pid, pname, punit, qty,
                                round(pprice * 0.85, 2), ptva, lht, pos))
            bc_lignes.append((bl_id, pid, pref, qty, lht))

        await conn.execute(
            "INSERT INTO bons_commande(id,tenant_id,fournisseur_id,reference,status,"
            "date_commande,date_livraison_prevue,total_ht,total_tva,total_ttc,notes,created_by,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)",
            bc_id, tenant_id, fid, bc_ref, bc_status, d,
            d + timedelta(days=random.randint(14, 45)),
            round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2),
            None, buyer_uid, ts(d),
        )
        for lr in ligne_rows:
            await conn.execute(
                "INSERT INTO bons_commande_lignes(id,bon_commande_id,product_id,designation,unite,"
                "quantite,prix_unitaire_ht,tva_rate,total_ht,position) "
                "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
                *lr,
            )

        # Bon de réception for RECU / PARTIELLEMENT_RECU
        if bc_status in ("RECU", "PARTIELLEMENT_RECU"):
            br_id = uid()
            ref_ctr["br"] += 1
            br_ref  = f"BR-{prefix}-{ref_ctr['br']}"
            rec_date = d + timedelta(days=random.randint(10, 40))
            await conn.execute(
                "INSERT INTO bons_reception(id,tenant_id,bon_commande_id,reference,status,"
                "date_reception,notes,created_by,created_at,updated_at) "
                "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
                br_id, tenant_id, bc_id, br_ref,
                "CONFIRME" if bc_status == "RECU" else "EN_COURS",
                rec_date, None, buyer_uid, ts(rec_date),
            )
            # bl_id, pid, designation, qty, total_ht from ligne_rows
            for pos2, (bl_id, pid, pref2, qty2, lht2) in enumerate([(lr[0], lr[2], lr[3], lr[5], lr[8]) for lr in ligne_rows]):
                ratio    = 1.0 if bc_status == "RECU" else round(random.uniform(0.5, 0.9), 2)
                loc_id   = random.choice(location_ids) if location_ids else None
                await conn.execute(
                    "INSERT INTO bons_reception_lignes(id,bon_reception_id,bon_commande_ligne_id,"
                    "product_id,designation,quantite_commandee,quantite_recue,location_id,position) "
                    "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    uid(), br_id, bl_id, pid, pref2, qty2,
                    round(qty2 * ratio, 2), loc_id, pos2,
                )

    print(f"  ✓ Achat (5 fournisseurs, 10 bons_commande, bons_réception)")
    return bc_lignes

# ─── Seed: Inventory ─────────────────────────────────────────────────────────

async def seed_inventory(conn, tenant_id: str, products: list[tuple],
                         warehouse_uid: str) -> list[str]:
    """Seed stock_locations, stock_items, stock_movements. Returns location UUIDs."""
    # 3 locations
    locations = [
        (uid(), f"MAG-{tenant_id[:3].upper()}-01", "Magasin principal",   "WAREHOUSE"),
        (uid(), f"MAG-{tenant_id[:3].upper()}-02", "Zone expédition",     "ZONE"),
        (uid(), f"ETG-{tenant_id[:3].upper()}-01", "Étagère profilés A",  "SHELF"),
    ]
    loc_ids = []
    for lid, code, name, ltype in locations:
        d = rand_date(DATE_START, date(2025, 3, 1))
        await conn.execute(
            "INSERT INTO stock_locations(id,tenant_id,code,name,type,description,active,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,true,$7,$7) ON CONFLICT(tenant_id,code) DO NOTHING",
            lid, tenant_id, code, name, ltype,
            f"Emplacement {name.lower()} du dépôt.", ts(d),
        )
        loc_ids.append(lid)

    # 10 stock items (one per product)
    for pid, pref, pname, pprice, ptva, punit in products[:10]:
        loc_id = random.choice(loc_ids)
        qty    = round(random.uniform(10, 500), 2)
        min_q  = round(random.uniform(5, 30), 2)
        d      = rand_date(DATE_START, date(2025, 4, 1))
        await conn.execute(
            "INSERT INTO stock_items(id,tenant_id,product_id,product_reference,product_name,"
            "location_id,quantity,reserved_quantity,min_quantity,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) ON CONFLICT(tenant_id,product_id,location_id) DO NOTHING",
            uid(), tenant_id, pid, pref, pname,
            loc_id, qty, round(qty * 0.1, 2), min_q, ts(d),
        )

    # 60 stock movements over 18 months
    mv_types = ["ENTREE"]*25 + ["SORTIE"]*25 + ["INVENTAIRE"]*5 + ["RETOUR"]*5
    random.shuffle(mv_types)
    mv_dates = spread_dates(60)
    qty_before = {}   # product → running quantity

    for i, (d, mv_type) in enumerate(zip(mv_dates, mv_types)):
        pid, pref, *_ = random.choice(products)
        loc_id = random.choice(loc_ids)

        # Normal quantity; occasionally inject an anomaly
        if i % 15 == 0:   # ~4 anomalies per tenant
            qty = round(random.uniform(500, 2000), 2)  # unusually large
        else:
            qty = round(random.uniform(1, 80), 2)

        q_before = qty_before.get(pid, round(random.uniform(50, 300), 2))
        q_after  = (q_before + qty) if mv_type in ("ENTREE","RETOUR") else max(0.0, q_before - qty)
        qty_before[pid] = q_after

        await conn.execute(
            "INSERT INTO stock_movements(id,tenant_id,product_id,product_reference,location_id,"
            "movement_type,quantity,quantity_before,quantity_after,"
            "reference,source_type,notes,created_by,created_at,occurred_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$14)",
            uid(), tenant_id, pid, pref, loc_id,
            mv_type, qty, round(q_before, 2), round(q_after, 2),
            f"MV-{random.randint(10000,99999)}",
            random.choice(["LIVRAISON","RECEPTION","INVENTAIRE","MANUAL"]),
            "Mouvement automatique." if mv_type != "INVENTAIRE" else "Inventaire périodique.",
            warehouse_uid, ts(d),
        )

    print(f"  ✓ Inventory (3 locations, 10 items, 60 movements)")
    return loc_ids

# ─── Seed: CMS ────────────────────────────────────────────────────────────────

async def seed_cms(conn, tenant_id: str, company_name: str, primary_color: str) -> None:
    await conn.execute(
        "INSERT INTO tenant_branding(id,tenant_id,company_name,tagline,primary_color,"
        "secondary_color,font_family,created_at,updated_at) "
        "VALUES($1,$2,$3,$4,$5,'#424242','Inter, sans-serif',now(),now()) "
        "ON CONFLICT(tenant_id) DO NOTHING",
        uid(), tenant_id, company_name,
        "Votre partenaire en menuiserie aluminium de qualité",
        primary_color,
    )
    notices = [
        ("Fermeture annuelle", "Notre société sera fermée du 1er au 15 août.", "INFO"),
        ("Mise à jour tarifs","Les tarifs 2026 sont disponibles sur demande.","WARNING"),
        ("Nouveaux produits",  "Découvrez notre gamme de vitrages à triple isolation.", "INFO"),
    ]
    for title, body, severity in notices:
        d = rand_date(DATE_START, date(2026, 3, 1))
        await conn.execute(
            "INSERT INTO tenant_notices(id,tenant_id,title,body,severity,active,created_at,updated_at) "
            "VALUES($1,$2,$3,$4,$5,true,$6,$6)",
            uid(), tenant_id, title, body, severity, ts(d),
        )
    print(f"  ✓ CMS (branding + 3 notices)")

# ─── Orchestrator ─────────────────────────────────────────────────────────────

async def seed_tenant(conn, tenant_id: str, company_name: str,
                      key: str, products_def: list, fixed_products: list | None,
                      primary_color: str) -> None:
    print(f"\n── Tenant: {company_name} ({tenant_id[:8]}…)")
    users = TENANT_USERS[tenant_id]

    if fixed_products:
        products = fixed_products
        # still call seed_products to get the list (with ON CONFLICT DO NOTHING)
        await seed_products(conn, tenant_id, [(*p,) for p in DEMO_PRODUCTS])
    else:
        products = await seed_products(conn, tenant_id, products_def)
    print(f"  ✓ {len(products)} products")

    client_ids = await seed_crm(conn, tenant_id, users["sales"], users["employer"])

    loc_ids = await seed_inventory(conn, tenant_id, products, users["warehouse"])

    await seed_sales(conn, tenant_id, client_ids, products, users["employer"], key)

    await seed_achat(conn, tenant_id, products, users["buyer"], loc_ids, key)

    await seed_cms(conn, tenant_id, company_name, primary_color)

# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    print(f"Connecting to {DB_URL[:30]}…")
    conn = await asyncpg.connect(DB_URL)

    try:
        # Bypass RLS for seed (requires table-owner or superuser privileges)
        await conn.execute("SET row_security = OFF")

        print("\n=== Phase 1: Global tenants + users ===")
        await seed_global(conn)

        print("\n=== Phase 2: Demo tenant data ===")
        demo_products = [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in DEMO_PRODUCTS]
        await seed_tenant(conn, T_DEMO, "Demo Aluminum Joinery Co.", "DEM",
                          DEMO_PRODUCTS, demo_products, "#1976D2")

        print("\n=== Phase 3: Aluminium Maroc SARL ===")
        await seed_tenant(conn, T_ALUM, "Aluminium Maroc SARL", "ALM",
                          ALUM_PRODUCTS_DEF, None, "#FF6F00")

        print("\n=== Phase 4: Vitrerie Atlas SA ===")
        await seed_tenant(conn, T_VITR, "Vitrerie Atlas SA", "VIT",
                          VITR_PRODUCTS_DEF, None, "#2E7D32")

        await conn.execute("SET row_security = ON")

    finally:
        await conn.close()

    print("\n✓ Training data seed complete.")
    print("  Each tenant has:")
    print("    • 44 devis (22 ACCEPTE spread over 18 months) → Prophet + XGBoost quote")
    print("    • 28 factures with due_date → XGBoost payment risk")
    print("    • 60 stock movements with quantity_before/after → IForest anomaly")


if __name__ == "__main__":
    asyncio.run(main())
