#!/usr/bin/env python3
"""Seed tenants, users and per-tenant data while respecting RLS.

This script:
- creates N tenants (rows in `tenants`)
- creates M users per tenant (rows in `users`)
- for each tenant, sets Postgres session `app.tenant_id` via `set_config`
  and attempts to insert lightweight test rows into public tables.

Usage:
  python scripts/seed_with_tenants.py --tenants 2 --users-per-tenant 3

Notes:
- Requires `psycopg2`.
- Run only on development/test DBs.
"""

import argparse
import datetime
import json
import os
import uuid
from typing import List, Dict, Any

import psycopg2
import psycopg2.extras


def get_conn():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)

    params = dict(
        host=os.getenv("PGHOST", "localhost"),
        user=os.getenv("PGUSER", os.getenv("POSTGRES_USER", "postgres")),
        password=os.getenv("PGPASSWORD", os.getenv("POSTGRES_PASSWORD", "")),
        dbname=os.getenv("PGDATABASE", os.getenv("POSTGRES_DB", "postgres")),
        port=os.getenv("PGPORT", 5432),
    )
    return psycopg2.connect(**params)


def create_tenants_and_users(cur, tenants: int, users_per_tenant: int):
    tenant_rows = []
    user_rows = []
    for t in range(tenants):
        slug = f"demo_t{t+1}"
        name = f"Demo Tenant {t+1}"
        cur.execute(
            "INSERT INTO tenants (slug, name, active) VALUES (%s, %s, true) RETURNING id",
            (slug, name),
        )
        tenant_id = cur.fetchone()[0]
        tenant_rows.append({'id': str(tenant_id), 'slug': slug, 'name': name})

        for u in range(users_per_tenant):
            keycloak_id = str(uuid.uuid4())[:36]
            email = f"user{u+1}@{slug}.example"
            display = f"User {u+1} {t+1}"
            role = 'CLIENT' if u > 0 else 'EMPLOYER'
            try:
                cur.execute(
                    "INSERT INTO users (tenant_id, keycloak_id, email, display_name, role, active) VALUES (%s, %s, %s, %s, %s, true) RETURNING id",
                    (tenant_id, keycloak_id, email, display, role),
                )
                user_id = cur.fetchone()[0]
            except Exception as e:
                cur.connection.rollback()
                print(f"Warning: failed to insert user {email}: {e}")
                continue
            user_rows.append({'id': str(user_id), 'tenant_id': str(tenant_id), 'email': email, 'role': role})

    return tenant_rows, user_rows


def list_public_tables(cur) -> List[str]:
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('alembic_version','flyway_schema_history')
        ORDER BY table_name
        """
    )
    return [r[0] for r in cur.fetchall()]


def get_columns(cur, table: str) -> List[Dict[str, Any]]:
    cur.execute(
        """
        SELECT column_name, data_type, is_nullable, column_default, is_identity
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    cols = []
    for name, data_type, is_nullable, default, is_identity in cur.fetchall():
        cols.append({
            'name': name,
            'type': data_type,
            'nullable': is_nullable == 'YES',
            'default': default,
            'is_identity': is_identity == 'YES',
        })
    return cols


def gen_value(col: Dict[str, Any], table: str, tenant_id: str, user_id: str, t_idx: int, u_idx: int):
    name = col['name']
    dtype = col['type'] or ''

    if col['is_identity'] or (col['default'] and 'nextval' in (col['default'] or '')):
        return None

    if name.lower() in ('tenant_id', 'tenant'):
        return tenant_id
    if name.lower() in ('user_id', 'created_by', 'owner_id'):
        return user_id
    if dtype == 'uuid':
        return str(uuid.uuid4())
    if 'timestamp' in dtype:
        return datetime.datetime.utcnow()
    if dtype in ('character varying', 'varchar', 'text'):
        return f"seed_{table}_{t_idx}_{u_idx}_{name[:10]}"
    if dtype in ('integer', 'bigint', 'smallint'):
        return (1000 * (t_idx + 1)) + (u_idx + 1)
    if dtype in ('boolean',):
        return True
    if dtype in ('json', 'jsonb'):
        return json.dumps({})
    if dtype in ('numeric', 'double precision', 'real'):
        return 1.0
    return f"seed_{table}_{t_idx}_{u_idx}_{name[:10]}"


def seed_for_tenant(cur, tables: List[str], tenant_id: str, users: List[Dict[str, Any]], t_idx: int, rows_per_table: int = 1):
    # set session tenant for RLS
    cur.execute("SELECT set_config('app.tenant_id', %s, false)", (tenant_id,))
    print(f"Seeding for tenant {tenant_id} (users: {len(users)})")

    for table in tables:
        if table in ('tenants', 'users', 'audit_log'):
            continue
        cols = get_columns(cur, table)
        if not cols:
            continue
        for u_idx, user in enumerate(users):
            values = []
            insert_cols = []
            for col in cols:
                v = gen_value(col, table, tenant_id, user['id'], t_idx, u_idx)
                if v is None:
                    continue
                insert_cols.append(f'"{col["name"]}"')
                values.append(v)
            if not insert_cols:
                continue
            placeholders = ','.join(['%s'] * len(insert_cols))
            sql = f'INSERT INTO "{table}" ({",".join(insert_cols)}) VALUES ({placeholders})'
            try:
                for _ in range(rows_per_table):
                    cur.execute(sql, values)
            except Exception as e:
                cur.connection.rollback()
                print(f"Skipped {table} for tenant {tenant_id}: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tenants', type=int, default=2)
    parser.add_argument('--users-per-tenant', type=int, default=2)
    parser.add_argument('--rows-per-table', type=int, default=1)
    args = parser.parse_args()

    conn = get_conn()
    conn.autocommit = False
    try:
        cur = conn.cursor()
        tenants, users = create_tenants_and_users(cur, args.tenants, args.users_per_tenant)
        conn.commit()

        tables = list_public_tables(cur)

        # group users by tenant
        users_by_tenant = {}
        for u in users:
            users_by_tenant.setdefault(u['tenant_id'], []).append(u)

        for t_idx, t in enumerate(tenants):
            t_id = t['id']
            ulist = users_by_tenant.get(t_id, [])
            try:
                seed_for_tenant(cur, tables, t_id, ulist, t_idx, args.rows_per_table)
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"Error seeding tenant {t_id}: {e}")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
