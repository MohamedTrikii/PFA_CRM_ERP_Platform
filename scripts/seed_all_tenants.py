#!/usr/bin/env python3
"""Seed all public tables with test data for multiple tenants and users.

This script discovers public tables, skips identity/serial columns, disables
foreign key checks for the session, and inserts simple test rows per tenant
and user. Use with care on non-development databases.

Usage:
  python scripts/seed_all_tenants.py --tenants 3 --users-per-tenant 2

It reads DATABASE_URL from the environment (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT).
"""

import argparse
import datetime
import json
import os
import random
import uuid
from typing import List, Dict

import psycopg2
import psycopg2.extras


def get_db_conn():
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


def list_tables(cur) -> List[str]:
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


def get_columns(cur, table: str) -> List[Dict]:
    cur.execute(
        """
        SELECT column_name, data_type, is_nullable, column_default, is_identity
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,)
    )
    cols = []
    for name, data_type, is_nullable, default, is_identity in cur.fetchall():
        cols.append({
            "name": name,
            "type": data_type,
            "nullable": is_nullable == 'YES',
            "default": default,
            "is_identity": is_identity == 'YES',
        })
    return cols


def gen_value(col: Dict, table: str, tenant_id: str, user_id: str, t_idx: int, u_idx: int):
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
        return f"test_{table}_{t_idx}_{u_idx}_{name[:10]}"

    if dtype in ('integer', 'bigint', 'smallint'):
        return (1000 * (t_idx + 1)) + (u_idx + 1)

    if dtype in ('boolean',):
        return False

    if dtype in ('json', 'jsonb'):
        return json.dumps({})

    if dtype in ('numeric', 'double precision', 'real'):
        return 1.0

    # fallback to text
    return f"test_{table}_{t_idx}_{u_idx}_{name[:10]}"


def seed(conn, tenants: int, users_per_tenant: int, rows_per_table_per_user: int = 1):
    cur = conn.cursor()

    tables = list_tables(cur)
    print(f"Found {len(tables)} tables: {tables}")

    # disable FK checks in this session (postgres-specific)
    cur.execute("SET session_replication_role = 'replica'")

    created = 0
    for t_idx in range(tenants):
        tenant_id = str(uuid.uuid4())
        for u_idx in range(users_per_tenant):
            user_id = str(uuid.uuid4())

            for table in tables:
                cols = get_columns(cur, table)
                insert_cols = []
                values = []
                for col in cols:
                    v = gen_value(col, table, tenant_id, user_id, t_idx, u_idx)
                    if v is None:
                        continue
                    insert_cols.append(f'"{col["name"]}"')
                    # psycopg2 will adapt python types
                    values.append(v)

                if not insert_cols:
                    continue

                placeholders = ','.join(['%s'] * len(insert_cols))
                sql = f'INSERT INTO "{table}" ({",".join(insert_cols)}) VALUES ({placeholders})'
                try:
                    for _ in range(rows_per_table_per_user):
                        cur.execute(sql, values)
                        created += 1
                except Exception as e:
                    # skip errors for complex schema constraints
                    print(f"Skipping insert into {table}: {e}")

    # restore FK checks
    cur.execute("SET session_replication_role = 'origin'")
    conn.commit()
    cur.close()
    print(f"Seeding complete — inserted approximately {created} rows.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tenants', type=int, default=2, help='Number of tenants to create')
    parser.add_argument('--users-per-tenant', type=int, default=2, help='Number of users per tenant')
    parser.add_argument('--rows-per-table-per-user', type=int, default=1, help='Rows per table per user')
    args = parser.parse_args()

    conn = get_db_conn()
    try:
        seed(conn, args.tenants, args.users_per_tenant, args.rows_per_table_per_user)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
