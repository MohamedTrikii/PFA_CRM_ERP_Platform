#!/usr/bin/env python3
"""Seed ERP demo fixtures for multiple tenants.

This script inserts realistic sample rows for sales, purchase, CRM and inventory:
- tenants + users
- clients
- catalog products
- suppliers
- purchase orders and reception notes
- quotes, orders, invoices, payments
- stock locations, stock items, stock movements

Usage:
  python scripts/seed_erp_fixtures.py --tenants 2 --users-per-tenant 2

Requirements:
  pip install -r scripts/requirements.txt

Warning:
  Run only on development or disposable test databases.
"""

import argparse
import datetime
import json
import os
import uuid

import psycopg2
import psycopg2.extras


def get_conn():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        user=os.getenv("PGUSER", os.getenv("POSTGRES_USER", "postgres")),
        password=os.getenv("PGPASSWORD", os.getenv("POSTGRES_PASSWORD", "")),
        dbname=os.getenv("PGDATABASE", os.getenv("POSTGRES_DB", "postgres")),
        port=os.getenv("PGPORT", 5432),
    )


def create_tenant(cur, slug, name):
    cur.execute(
        "INSERT INTO tenants (slug, name, active) VALUES (%s, %s, true) RETURNING id",
        (slug, name),
    )
    return cur.fetchone()[0]


def create_user(cur, tenant_id, email, display_name, role="EMPLOYER"):
    keycloak_id = str(uuid.uuid4())[:36]
    cur.execute(
        "INSERT INTO users (tenant_id, keycloak_id, email, display_name, role, active) VALUES (%s, %s, %s, %s, %s, true) RETURNING id",
        (tenant_id, keycloak_id, email, display_name, role),
    )
    return cur.fetchone()[0]


def set_tenant(cur, tenant_id):
    cur.execute("SELECT set_config('app.tenant_id', %s, false)", (str(tenant_id),))


def insert_products(cur, tenant_id):
    products = [
        {
            "reference": "ALU-PRO-6060",
            "name": "Profilé aluminium 60x60 mm",
            "description": "Profilé aluminium anodisé 6060 T6, longueur 6m",
            "unit_price": 85.00,
            "tva_rate": 20.00,
            "unit": "ml",
            "category": "Profilés",
        },
        {
            "reference": "VIT-DOUBLE-4",
            "name": "Vitrage double 4/16/4 mm",
            "description": "Vitrage double vitrage faiblement émissif",
            "unit_price": 45.00,
            "tva_rate": 20.00,
            "unit": "m²",
            "category": "Vitrage",
        },
        {
            "reference": "JOINT-EPDM-12",
            "name": "Joint EPDM 12 mm",
            "description": "Joint d'étanchéité EPDM noir, rouleau 50m",
            "unit_price": 18.50,
            "tva_rate": 20.00,
            "unit": "ml",
            "category": "Quincaillerie",
        },
        {
            "reference": "PAUMELLE-3D",
            "name": "Paumelle 3D réglable",
            "description": "Paumelle à réglage 3 dimensions pour fenêtre aluminium",
            "unit_price": 12.00,
            "tva_rate": 20.00,
            "unit": "unité",
            "category": "Quincaillerie",
        },
        {
            "reference": "POIGNEE-ALU-OB",
            "name": "Poignée aluminium olive bronze",
            "description": "Poignée crémone aluminium finition bronze",
            "unit_price": 28.00,
            "tva_rate": 20.00,
            "unit": "unité",
            "category": "Quincaillerie",
        },
        {
            "reference": "POSE-FENETRE",
            "name": "Pose fenêtre standard",
            "description": "Main d'œuvre pose fenêtre jusqu'à 1.5m²",
            "unit_price": 150.00,
            "tva_rate": 20.00,
            "unit": "unité",
            "category": "Main d'œuvre",
        },
        {
            "reference": "CALFEUTREMENT",
            "name": "Calfeutrement et finition",
            "description": "Calfeutrement mousse expansive + silicone, au ml",
            "unit_price": 8.50,
            "tva_rate": 20.00,
            "unit": "ml",
            "category": "Finition",
        },
    ]

    product_rows = []
    for item in products:
        product_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO catalog_products (id, tenant_id, reference, name, description, unit_price, tva_rate, unit, category, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, now(), now())",
            (
                product_id,
                tenant_id,
                item["reference"],
                item["name"],
                item["description"],
                item["unit_price"],
                item["tva_rate"],
                item["unit"],
                item["category"],
            ),
        )
        product_rows.append({"id": product_id, **item})
    return product_rows


def insert_clients(cur, tenant_id):
    clients = [
        {
            "reference": "CLT-1001",
            "name": "Société Alpha",
            "email": "contact@alpha.example",
            "phone": "+212 6 12 34 56 78",
            "address": {"street": "12 Boulevard Hassan II", "city": "Casablanca", "zip": "20000", "country": "MA"},
        },
        {
            "reference": "CLT-1002",
            "name": "Ateliers Beta SARL",
            "email": "info@beta.example",
            "phone": "+212 5 22 33 44 55",
            "address": {"street": "28 Rue Ibn Sina", "city": "Rabat", "zip": "10000", "country": "MA"},
        },
        {
            "reference": "CLT-1003",
            "name": "EURL Gamma",
            "email": "sales@gamma.example",
            "phone": "+212 6 98 76 54 32",
            "address": {"street": "3 Avenue Mohammed V", "city": "Fès", "zip": "30000", "country": "MA"},
        },
    ]

    client_rows = []
    for item in clients:
        client_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO clients (id, tenant_id, reference, name, email, phone, address, type, notes, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, 'PROFESSIONNEL', 'Client démo', true, now(), now())",
            (
                client_id,
                tenant_id,
                item["reference"],
                item["name"],
                item["email"],
                item["phone"],
                psycopg2.extras.Json(item["address"]),
            ),
        )
        client_rows.append({"id": client_id, **item})
    return client_rows


def insert_suppliers(cur, tenant_id):
    suppliers = [
        {
            "code": "FRS-ALU",
            "nom": "Aluminium Pro Distribution",
            "email": "contact@alupro.example",
            "telephone": "+212 5 22 77 88 99",
            "adresse": "Zone industrielle, Route d'El Jadida, Casablanca",
        },
        {
            "code": "FRS-VIT",
            "nom": "Vitrage Sud SARL",
            "email": "ventes@vitragesud.example",
            "telephone": "+212 5 24 45 67 89",
            "adresse": "Rue des Verriers, Tanger",
        },
    ]

    supplier_rows = []
    for item in suppliers:
        supplier_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO fournisseurs (id, tenant_id, nom, code, email, telephone, adresse, pays, actif, notes, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, 'MA', true, 'Fournisseur démo', now(), now())",
            (
                supplier_id,
                tenant_id,
                item["nom"],
                item["code"],
                item["email"],
                item["telephone"],
                item["adresse"],
            ),
        )
        supplier_rows.append({"id": supplier_id, **item})
    return supplier_rows


def insert_locations(cur, tenant_id):
    locations = [
        {"code": "WH-01", "name": "Entrepôt principal", "type": "WAREHOUSE", "description": "Stock principal de matières premières et profils."},
        {"code": "SHOP-01", "name": "Showroom", "type": "ZONE", "description": "Stock pièces détachées et présentation."},
    ]
    location_rows = []
    for loc in locations:
        loc_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO stock_locations (id, tenant_id, code, name, type, description, active, created_at) VALUES (%s, %s, %s, %s, %s, %s, true, now())",
            (loc_id, tenant_id, loc["code"], loc["name"], loc["type"], loc["description"]),
        )
        location_rows.append({"id": loc_id, **loc})
    return location_rows


def insert_stock_items(cur, tenant_id, products, locations):
    stock_rows = []
    for product in products:
        for location in locations:
            qty = 50 if location["code"] == "WH-01" else 10
            item_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO stock_items (id, tenant_id, product_id, product_reference, location_id, quantity, min_quantity, max_quantity, last_movement_at, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now(), now(), now())",
                (
                    item_id,
                    tenant_id,
                    product["id"],
                    product["reference"],
                    location["id"],
                    qty,
                    5,
                    200,
                ),
            )
            stock_rows.append({"id": item_id, "product_id": product["id"], "location_id": location["id"], "quantity": qty})
    return stock_rows


def insert_stock_movement(cur, tenant_id, product, location_id, user_id, reference, movement_type, quantity):
    cur.execute(
        "INSERT INTO stock_movements (id, tenant_id, product_id, product_reference, location_id, movement_type, quantity, quantity_before, quantity_after, reference, source_type, source_id, notes, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())",
        (
            str(uuid.uuid4()),
            tenant_id,
            product["id"],
            product["reference"],
            location_id,
            movement_type,
            quantity,
            0,
            quantity,
            reference,
            "RECEPTION",
            None,
            "Stock initial pour produit de démonstration.",
            user_id,
        ),
    )


def insert_purchase_order(cur, tenant_id, supplier, products, user_id, seq_num):
    reference = f"BC-{seq_num:03d}"
    total_ht = 0
    total_tva = 0
    total_ttc = 0

    cur.execute(
        "INSERT INTO bons_commande (id, tenant_id, fournisseur_id, reference, status, date_commande, date_livraison_prevue, notes, created_by, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now()) RETURNING id",
        (
            str(uuid.uuid4()),
            tenant_id,
            supplier["id"],
            reference,
            "EN_COURS",
            datetime.date.today() - datetime.timedelta(days=7),
            datetime.date.today() + datetime.timedelta(days=7),
            "Commande fournisseur de démonstration.",
            user_id,
        ),
    )
    bon_id = cur.fetchone()[0]

    lines = []
    for idx, product in enumerate(products[:2], start=1):
        quantite = 20 if idx == 1 else 10
        prix_unitaire_ht = float(product["unit_price"])
        total_line_ht = quantite * prix_unitaire_ht
        tva = round(total_line_ht * 0.20, 2)
        total_line_ttc = round(total_line_ht + tva, 2)
        cur.execute(
            "INSERT INTO bons_commande_lignes (id, bon_commande_id, product_id, designation, unite, quantite, prix_unitaire_ht, tva_rate, total_ht, position) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                str(uuid.uuid4()),
                bon_id,
                product["id"],
                product["name"],
                product["unit"],
                quantite,
                prix_unitaire_ht,
                product["tva_rate"],
                total_line_ht,
                idx,
            ),
        )
        total_ht += total_line_ht
        total_tva += tva
        total_ttc += total_line_ttc
        lines.append({"product": product, "quantity": quantite, "line_id": None})

    cur.execute(
        "UPDATE bons_commande SET total_ht = %s, total_tva = %s, total_ttc = %s WHERE id = %s",
        (round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2), bon_id),
    )
    return bon_id


def insert_reception(cur, tenant_id, bon_id, user_id, seq_num):
    reference = f"BR-{seq_num:03d}"
    cur.execute(
        "INSERT INTO bons_reception (id, tenant_id, bon_commande_id, reference, status, date_reception, notes, created_by, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now(), now()) RETURNING id",
        (
            str(uuid.uuid4()),
            tenant_id,
            bon_id,
            reference,
            "LIVRE",
            datetime.date.today() - datetime.timedelta(days=2),
            "Réception fournisseur complétée.",
            user_id,
        ),
    )
    reception_id = cur.fetchone()[0]

    cur.execute(
        "SELECT id, product_id, designation, quantite FROM bons_commande_lignes WHERE bon_commande_id = %s ORDER BY position",
        (bon_id,),
    )
    for idx, row in enumerate(cur.fetchall(), start=1):
        cur.execute(
            "INSERT INTO bons_reception_lignes (id, bon_reception_id, bon_commande_ligne_id, product_id, designation, quantite_commandee, quantite_recue, location_id, position) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                str(uuid.uuid4()),
                reception_id,
                row[0],
                row[1],
                row[2],
                float(row[3]),
                float(row[3]),
                None,
                idx,
            ),
        )
    return reception_id


def insert_quote(cur, tenant_id, client, products, seq_num):
    reference = f"DV-{seq_num:04d}"
    selected = products[0:3]
    total_ht = 0.0
    total_tva = 0.0
    cur.execute(
        "INSERT INTO devis (id, tenant_id, client_id, reference, status, valid_until, notes, discount_pct, total_ht, total_tva, total_ttc, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, 0, 0, 0, 0, now(), now()) RETURNING id",
        (
            str(uuid.uuid4()),
            tenant_id,
            client["id"],
            reference,
            "ENVOYE",
            datetime.date.today() + datetime.timedelta(days=15),
            "Devis de travaux de démonstration.",
        ),
    )
    devis_id = cur.fetchone()[0]

    for idx, product in enumerate(selected, start=1):
        quantity = 2 if product["unit"] == "unité" else 5
        unit_price = float(product["unit_price"])
        line_ht = round(quantity * unit_price, 2)
        line_tva = round(line_ht * product["tva_rate"] / 100.0, 2)
        cur.execute(
            "INSERT INTO devis_lines (id, devis_id, product_id, product_snapshot, description, quantity, unit_price, tva_rate, discount_pct, total_ht, position) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s)",
            (
                str(uuid.uuid4()),
                devis_id,
                product["id"],
                psycopg2.extras.Json({"reference": product["reference"], "name": product["name"], "unit": product["unit"], "tva_rate": float(product["tva_rate"]) }),
                product["description"],
                quantity,
                unit_price,
                float(product["tva_rate"]),
                line_ht,
                idx,
            ),
        )
        total_ht += line_ht
        total_tva += line_tva

    total_ht = round(total_ht, 2)
    total_tva = round(total_tva, 2)
    total_ttc = round(total_ht + total_tva, 2)
    cur.execute(
        "UPDATE devis SET total_ht = %s, total_tva = %s, total_ttc = %s WHERE id = %s",
        (total_ht, total_tva, total_ttc, devis_id),
    )
    return devis_id


def insert_order(cur, tenant_id, devis_id, seq_num):
    reference = f"CMD-{seq_num:04d}"
    cur.execute(
        "INSERT INTO commandes (id, tenant_id, devis_id, reference, status, delivery_address, expected_delivery_date, notes, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now(), now()) RETURNING id",
        (
            str(uuid.uuid4()),
            tenant_id,
            devis_id,
            reference,
            "CONFIRMEE",
            psycopg2.extras.Json({"street": "45 Rue du Commerce", "city": "Marrakech", "zip": "40000", "country": "MA"}),
            datetime.date.today() + datetime.timedelta(days=10),
            "Commande client liée au devis.",
        ),
    )
    return cur.fetchone()[0]


def insert_invoice(cur, tenant_id, commande_id, client_id, total_ht, total_tva, total_ttc, seq_num, paid):
    reference = f"FAC-{seq_num:04d}"
    issue_date = datetime.date.today() - datetime.timedelta(days=5)
    due_date = issue_date + datetime.timedelta(days=30)
    amount_paid = total_ttc if paid else 0.0
    status = "PAYEE" if paid else "BROUILLON"
    cur.execute(
        "INSERT INTO factures (id, tenant_id, commande_id, client_id, reference, status, issue_date, due_date, notes, total_ht, total_tva, total_ttc, amount_paid, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now()) RETURNING id",
        (
            str(uuid.uuid4()),
            tenant_id,
            commande_id,
            client_id,
            reference,
            status,
            issue_date,
            due_date,
            "Facture générée automatiquement.",
            total_ht,
            total_tva,
            total_ttc,
            amount_paid,
        ),
    )
    facture_id = cur.fetchone()[0]
    return facture_id


def insert_invoice_line(cur, facture_id, product, seq_num):
    quantity = 1 if product["unit"] == "unité" else 4
    unit_price = float(product["unit_price"])
    line_ht = round(quantity * unit_price, 2)
    line_tva = round(line_ht * product["tva_rate"] / 100.0, 2)
    line_ttc = round(line_ht + line_tva, 2)
    cur.execute(
        "INSERT INTO facture_lines (id, facture_id, product_id, description, quantity, unit_price, tva_rate, discount_pct, total_ht, total_tva, total_ttc) VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s)",
        (
            str(uuid.uuid4()),
            facture_id,
            product["id"],
            product["description"],
            quantity,
            unit_price,
            float(product["tva_rate"]),
            line_ht,
            line_tva,
            line_ttc,
        ),
    )
    return line_ttc


def insert_payment(cur, facture_id, total_ttc):
    cur.execute(
        "INSERT INTO encaissements (id, tenant_id, facture_id, amount, payment_date, payment_method, reference, notes, created_at) VALUES (%s, (SELECT tenant_id FROM factures WHERE id = %s), %s, %s, %s, %s, %s, %s, now())",
        (
            str(uuid.uuid4()),
            facture_id,
            facture_id,
            total_ttc,
            datetime.date.today() - datetime.timedelta(days=2),
            "VIREMENT",
            f"PAY-{facture_id[:8]}",
            "Paiement reçu en banque.",
        ),
    )


def seed_tenant(cur, tenant_id, tenant_idx, user_ids):
    set_tenant(cur, tenant_id)
    products = insert_products(cur, tenant_id)
    clients = insert_clients(cur, tenant_id)
    suppliers = insert_suppliers(cur, tenant_id)
    locations = insert_locations(cur, tenant_id)
    insert_stock_items(cur, tenant_id, products, locations)

    primary_user = user_ids[0] if user_ids else None
    if primary_user:
        for product in products[:3]:
            insert_stock_movement(cur, tenant_id, product, locations[0]["id"], primary_user, "INIT-INV", "ENTREE", 50.0)

    for idx, supplier in enumerate(suppliers, start=1):
        bon_id = insert_purchase_order(cur, tenant_id, supplier, products, primary_user, idx)
        insert_reception(cur, tenant_id, bon_id, primary_user, idx)

    for idx, client in enumerate(clients, start=1):
        devis_id = insert_quote(cur, tenant_id, client, products, idx)
        commande_id = insert_order(cur, tenant_id, devis_id, idx)
        total_ht = 0.0
        total_tva = 0.0
        for product in products[:2]:
            quantity = 1 if product["unit"] == "unité" else 4
            line_ht = round(quantity * float(product["unit_price"]), 2)
            line_tva = round(line_ht * float(product["tva_rate"]) / 100.0, 2)
            total_ht += line_ht
            total_tva += line_tva
        total_ht = round(total_ht, 2)
        total_tva = round(total_tva, 2)
        total_ttc = round(total_ht + total_tva, 2)
        facture_id = insert_invoice(cur, tenant_id, commande_id, client["id"], total_ht, total_tva, total_ttc, idx, paid=(idx % 2 == 0))
        insert_invoice_line(cur, facture_id, products[0], 1)
        insert_invoice_line(cur, facture_id, products[1], 2)
        if idx % 2 == 0:
            insert_payment(cur, facture_id, total_ttc)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenants", type=int, default=2, help="Number of demo tenants to create")
    parser.add_argument("--users-per-tenant", type=int, default=2, help="Number of users per tenant")
    args = parser.parse_args()

    conn = get_conn()
    try:
        cur = conn.cursor()
        created_tenants = []
        tenant_users = {}
        for t in range(args.tenants):
            slug = f"demo{t+1}"
            name = f"Demo Tenant {t+1}"
            tenant_id = create_tenant(cur, slug, name)
            created_tenants.append(tenant_id)
            tenant_users[str(tenant_id)] = []
            for u in range(args.users_per_tenant):
                email = f"user{u+1}@{slug}.example"
                display_name = f"User {u+1} ({slug})"
                role = "EMPLOYER" if u == 0 else "EMPLOYEE"
                user_id = create_user(cur, tenant_id, email, display_name, role)
                tenant_users[str(tenant_id)].append(user_id)
        conn.commit()

        for idx, tenant_id in enumerate(created_tenants, start=1):
            try:
                seed_tenant(cur, tenant_id, idx, tenant_users[str(tenant_id)])
                conn.commit()
                print(f"Tenant seeded: {tenant_id}")
            except Exception as exc:
                conn.rollback()
                print(f"Failed seeding tenant {tenant_id}: {exc}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
