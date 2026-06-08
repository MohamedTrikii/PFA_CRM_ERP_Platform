#!/usr/bin/env python3
"""Seed realistic fixtures for tenants: devis, commandes, factures, clients.

This script creates demo tenants and users, then for each tenant inserts a
small set of realistic `devis`, `commandes`, `factures` and `clients` rows.
It sets the Postgres session `app.tenant_id` before per-tenant writes so RLS
policies allow the inserts.

Usage:
  python scripts/seed_realistic_fixtures.py --tenants 2 --users-per-tenant 2
"""

import argparse
import datetime
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
    cur.execute("INSERT INTO tenants (slug, name, active) VALUES (%s,%s,true) RETURNING id", (slug, name))
    return cur.fetchone()[0]


def create_user_for_tenant(cur, tenant_id, email, display_name, role="EMPLOYER"):
    keycloak_id = str(uuid.uuid4())[:36]
    cur.execute(
        "INSERT INTO users (tenant_id, keycloak_id, email, display_name, role, active) VALUES (%s,%s,%s,%s,%s,true) RETURNING id",
        (tenant_id, keycloak_id, email, display_name, role),
    )
    return cur.fetchone()[0]


def seed_tenant_data(cur, tenant_id, tenant_idx):
    # stamp tenant for RLS
    cur.execute("SELECT set_config('app.tenant_id', %s, false)", (str(tenant_id),))

    now = datetime.datetime.utcnow()

    # clients
    clients = []
    for i in range(2):
        ref = f"C-{tenant_idx+1}-{i+1}"
        name = f"Client {tenant_idx+1}-{i+1} SARL"
        email = f"client{i+1}@tenant{tenant_idx+1}.example"
        phone = f"+33 6 12 34 56 {10+i}"
        address = {
            "street": f"{10+i} Rue Demo",
            "city": "Paris",
            "zip": "75001",
            "country": "FR",
        }
        cur.execute(
            "INSERT INTO clients (tenant_id, reference, name, email, phone, address, notes, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (tenant_id, ref, name, email, phone, psycopg2.extras.Json(address), "Client example", now),
        )
        clients.append(cur.fetchone()[0])

    # devis (quotes)
    for i in range(3):
        ref = f"DV-{tenant_idx+1}-{100+i}"
        status = "DRAFT" if i == 0 else ("SENT" if i == 1 else "ACCEPTED")
        total_ht = 1000 + i * 250
        total_tva = round(total_ht * 0.2, 2)
        total_ttc = total_ht + total_tva
        notes = "Devis généré automatiquement" if i == 0 else "Client confirmé"
        cur.execute(
            "INSERT INTO devis (tenant_id, reference, status, total_ht, total_tva, total_ttc, created_at, notes) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (tenant_id, ref, status, total_ht, total_tva, total_ttc, now - datetime.timedelta(days=i*3), notes),
        )

    # commandes (orders)
    for i in range(2):
        ref = f"CMD-{tenant_idx+1}-{200+i}"
        status = "PENDING" if i == 0 else "SHIPPED"
        expected = now + datetime.timedelta(days=7 + i * 3)
        cur.execute(
            "INSERT INTO commandes (tenant_id, reference, status, expected_delivery_date, notes, created_at) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
            (tenant_id, ref, status, expected, "Commande de test", now - datetime.timedelta(days=i)),
        )

    # factures (invoices)
    for i in range(2):
        ref = f"FAC-{tenant_idx+1}-{300+i}"
        status = "UNPAID" if i == 0 else "PAID"
        total_ht = 500 + i * 750
        total_tva = round(total_ht * 0.2, 2)
        total_ttc = total_ht + total_tva
        issue = now - datetime.timedelta(days=30 - i*10)
        due = issue + datetime.timedelta(days=30)
        amount_paid = 0 if status == "UNPAID" else total_ttc
        cur.execute(
            "INSERT INTO factures (tenant_id, reference, status, total_ht, total_tva, total_ttc, issue_date, due_date, amount_paid) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (tenant_id, ref, status, total_ht, total_tva, total_ttc, issue, due, amount_paid),
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tenants', type=int, default=2)
    parser.add_argument('--users-per-tenant', type=int, default=2)
    args = parser.parse_args()

    conn = get_conn()
    try:
        cur = conn.cursor()
        created_tenants = []
        created_users = []
        for t in range(args.tenants):
            slug = f"demo{t+1}"
            name = f"Demo Tenant {t+1}"
            tenant_id = create_tenant(cur, slug, name)
            created_tenants.append(str(tenant_id))

            # set tenant for user creation
            cur.execute("SELECT set_config('app.tenant_id', %s, false)", (str(tenant_id),))

            for u in range(args.users_per_tenant):
                email = f"user{u+1}@{slug}.example"
                display = f"User {u+1} ({slug})"
                role = 'EMPLOYER' if u == 0 else 'EMPLOYEE'
                try:
                    user_id = create_user_for_tenant(cur, tenant_id, email, display, role)
                    created_users.append({'id': str(user_id), 'tenant_id': str(tenant_id)})
                except Exception as e:
                    conn.rollback()
                    print(f"Warning: couldn't create user {email}: {e}")

        conn.commit()

        # seed per-tenant tables
        cur = conn.cursor()
        for idx, t_id in enumerate(created_tenants):
            try:
                seed_tenant_data(cur, t_id, idx)
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"Error seeding tenant {t_id}: {e}")

        print(f"Created {len(created_tenants)} tenants and {len(created_users)} users. Fixtures inserted.")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
