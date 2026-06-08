#!/usr/bin/env python3
"""Seed AI tables with sample documents and conversations for local development."""

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import asyncpg
from app.indexer import deterministic_embedding, EMBED_DIM
from app.ollama import embed, OLLAMA_MODEL

DB_URL = os.getenv("DATABASE_URL")

SAMPLE_USER_ID = os.getenv("AI_SAMPLE_USER_ID", "00000000-0000-0000-0000-000000000001")
SAMPLE_TENANT_ID = os.getenv("AI_SAMPLE_TENANT_ID", "00000000-0000-0000-0000-000000000000")


async def table_exists(conn, table_name: str) -> bool:
    row = await conn.fetchval("SELECT to_regclass($1)", table_name)
    return row is not None


async def fetch_rows(conn, sql: str, limit: int = 20):
    return await conn.fetch(sql, limit)


async def to_embedding(text: str):
    if not text:
        return deterministic_embedding(text)

    try:
        emb = await embed(text)
        if emb and isinstance(emb, list):
            return [float(x) for x in emb]
    except Exception:
        pass

    return deterministic_embedding(text)


def vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{float(x):.6f}" for x in embedding) + "]"


async def insert_document(conn, tenant_id, source_type, source_id, title, content, metadata):
    row = await conn.fetchrow(
        "INSERT INTO ai_documents(id, tenant_id, source_type, source_id, title, content, metadata) "
        "VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb) RETURNING id",
        tenant_id,
        source_type,
        source_id,
        title,
        content,
        json.dumps(metadata) if metadata is not None else None,
    )
    return row["id"]


async def insert_embedding(conn, document_id, tenant_id, embedding, model_name):
    vec = vector_literal(embedding)
    await conn.execute(
        "INSERT INTO ai_embeddings(id, document_id, tenant_id, embedding, model_name) "
        "VALUES (gen_random_uuid(), $1, $2, $3::vector, $4)",
        document_id,
        tenant_id,
        vec,
        model_name,
    )


async def insert_conversation(conn, tenant_id, user_id, messages, metadata=None):
    await conn.execute(
        "INSERT INTO ai_conversations(id, tenant_id, user_id, messages, metadata, created_at) "
        "VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4::jsonb, now())",
        tenant_id,
        user_id,
        json.dumps(messages),
        json.dumps(metadata) if metadata is not None else None,
    )


async def build_devis_documents(conn, limit: int = 20):
    if not await table_exists(conn, "devis"):
        return []

    rows = await fetch_rows(
        conn,
        "SELECT id, tenant_id, reference, status, total_ht, total_tva, total_ttc, created_at, notes FROM devis ORDER BY created_at DESC LIMIT $1",
        limit,
    )
    result = []
    for row in rows:
        tenant_id = str(row["tenant_id"]) if row["tenant_id"] else SAMPLE_TENANT_ID
        title = f"Devis {row['reference']}"
        content = (
            f"Devis {row['reference']}\n"
            f"Statut: {row['status']}\n"
            f"Total HT: {row['total_ht']} / TVA: {row['total_tva']} / TTC: {row['total_ttc']}\n"
            f"Créé le: {row['created_at']}\n"
            f"Notes: {row.get('notes') or 'Aucune note.'}"
        )
        metadata = {"reference": row["reference"], "status": row["status"]}
        result.append((tenant_id, "DEVIS", row["id"], title, content, metadata))
    return result


async def build_commande_documents(conn, limit: int = 20):
    if not await table_exists(conn, "commandes"):
        return []

    rows = await fetch_rows(
        conn,
        "SELECT id, tenant_id, reference, status, expected_delivery_date, notes, created_at FROM commandes ORDER BY created_at DESC LIMIT $1",
        limit,
    )
    result = []
    for row in rows:
        tenant_id = str(row["tenant_id"]) if row["tenant_id"] else SAMPLE_TENANT_ID
        title = f"Commande {row['reference']}"
        content = (
            f"Commande {row['reference']}\n"
            f"Statut: {row['status']}\n"
            f"Date attendue: {row.get('expected_delivery_date') or 'Non renseignée'}\n"
            f"Créé le: {row['created_at']}\n"
            f"Notes: {row.get('notes') or 'Aucune note.'}"
        )
        metadata = {"reference": row["reference"], "status": row["status"]}
        result.append((tenant_id, "COMMANDE", row["id"], title, content, metadata))
    return result


async def build_facture_documents(conn, limit: int = 20):
    if not await table_exists(conn, "factures"):
        return []

    rows = await fetch_rows(
        conn,
        "SELECT id, tenant_id, reference, status, total_ht, total_tva, total_ttc, issue_date, due_date, amount_paid FROM factures ORDER BY issue_date DESC LIMIT $1",
        limit,
    )
    result = []
    for row in rows:
        tenant_id = str(row["tenant_id"]) if row["tenant_id"] else SAMPLE_TENANT_ID
        title = f"Facture {row['reference']}"
        content = (
            f"Facture {row['reference']}\n"
            f"Statut: {row['status']}\n"
            f"Total HT: {row['total_ht']} / TVA: {row['total_tva']} / TTC: {row['total_ttc']}\n"
            f"Payé: {row['amount_paid']}\n"
            f"Émise le: {row['issue_date']} - Échéance: {row.get('due_date') or 'Non renseignée'}"
        )
        metadata = {"reference": row["reference"], "status": row["status"]}
        result.append((tenant_id, "FACTURE", row["id"], title, content, metadata))
    return result


async def build_client_documents(conn, limit: int = 20):
    if not await table_exists(conn, "clients"):
        return []

    rows = await fetch_rows(
        conn,
        "SELECT id, tenant_id, reference, name, email, phone, address, notes FROM clients ORDER BY created_at DESC LIMIT $1",
        limit,
    )
    result = []
    for row in rows:
        tenant_id = str(row["tenant_id"]) if row["tenant_id"] else SAMPLE_TENANT_ID
        address = row.get("address") or {}
        address_text = ", ".join(str(address.get(k, "")) for k in ["street", "city", "zip", "country"] if address.get(k))
        title = f"Client {row['name']}"
        content = (
            f"Client {row['name']}\n"
            f"Référence: {row.get('reference') or 'N/A'}\n"
            f"Email: {row.get('email') or 'Non renseigné'}\n"
            f"Téléphone: {row.get('phone') or 'Non renseigné'}\n"
            f"Adresse: {address_text or 'Non renseignée'}\n"
            f"Notes: {row.get('notes') or 'Aucune note.'}"
        )
        metadata = {"reference": row.get("reference"), "type": "client"}
        result.append((tenant_id, "CLIENT", row["id"], title, content, metadata))
    return result


async def seed_default_documents(conn):
    tenant_id = SAMPLE_TENANT_ID
    docs = [
        (
            "Profil de client aluminium",
            "Les clients industriels demandent des fenêtres coulissantes en profilé T60 et T90.",
            {"source": "sample", "kind": "client_profile"},
        ),
        (
            "Stock critique aluminium",
            "Le stock de profilés T60 est inférieur au seuil de réapprovisionnement.",
            {"source": "sample", "kind": "inventory"},
        ),
        (
            "Conditions de paiement",
            "Les délais de paiement habituels sont 30 à 60 jours, avec 5 % d'escompte pour paiement anticipé.",
            {"source": "sample", "kind": "payment_terms"},
        ),
    ]

    for idx, (title, content, metadata) in enumerate(docs):
        document_id = await insert_document(
            conn,
            tenant_id,
            "DOC",
            f"sample-{idx}",
            title,
            content,
            metadata,
        )
        embedding = await to_embedding(content)
        await insert_embedding(conn, document_id, tenant_id, embedding, f"ollama-{OLLAMA_MODEL}")

    await insert_conversation(
        conn,
        tenant_id,
        SAMPLE_USER_ID,
        [
            {"role": "user", "content": "Quel est le stock critique pour T60 ?"},
            {"role": "assistant", "content": "Le stock de T60 est critique, il faut réapprovisionner immédiatement."},
        ],
        {"sample": True},
    )


async def seed_documents(conn, limit: int = 20):
    docs = []
    docs.extend(await build_devis_documents(conn, limit))
    docs.extend(await build_commande_documents(conn, limit))
    docs.extend(await build_facture_documents(conn, limit))
    docs.extend(await build_client_documents(conn, limit))

    if not docs:
        await seed_default_documents(conn)
        return [SAMPLE_TENANT_ID]

    tenant_ids = set()
    for tenant_id, source_type, source_id, title, content, metadata in docs:
        tenant_ids.add(tenant_id)
        document_id = await insert_document(conn, tenant_id, source_type, source_id, title, content, metadata)
        embedding = await to_embedding(content)
        await insert_embedding(conn, document_id, tenant_id, embedding, f"ollama-{OLLAMA_MODEL}")

    return list(tenant_ids)


async def seed_conversations(conn, tenant_ids):
    for tenant_id in tenant_ids:
        await insert_conversation(
            conn,
            tenant_id,
            SAMPLE_USER_ID,
            [
                {"role": "user", "content": "Quel est l'état de mes devis et commandes ?"},
                {"role": "assistant", "content": "Vos devis récents et commandes en cours sont indexés pour analyse rapide."},
            ],
            {"seeded": True},
        )


async def main():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL must be set to seed AI data.")

    conn = await asyncpg.connect(DB_URL)
    try:
        tenant_ids = await seed_documents(conn, limit=20)
        await seed_conversations(conn, tenant_ids)
    finally:
        await conn.close()

    print("AI seed data generation complete.")


if __name__ == "__main__":
    asyncio.run(main())
