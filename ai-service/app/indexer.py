"""RAG indexer for ai-service.

Extracts business data (devis, factures, stock items, clients) from PostgreSQL,
generates embeddings (Ollama when available, deterministic fallback otherwise),
and upserts into ai_documents + ai_embeddings tables for pgvector similarity search.
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import List, Optional

from . import db
from . import embedder as embedder_module
from .embedder import EMBED_DIM, deterministic_embedding  # noqa: F401 — re-exported for tests

logger = logging.getLogger(__name__)

_TENANT_FILTER = "AND tenant_id = $2"


# ── Embedding helpers ──────────────────────────────────────────────────────────

async def get_embedding(text: str) -> tuple[List[float], str]:
    """Return (embedding_vector, model_name). Uses embedder module (nomic-embed-text or fallback)."""
    return await embedder_module.embed(text)


async def get_query_embedding(text: str) -> List[float]:
    vec, _ = await get_embedding(text)
    return vec


# ── Core upsert ───────────────────────────────────────────────────────────────

async def _upsert_doc_embedding(
    conn,
    tenant_id: str,
    source_type: str,
    source_id: str,
    title: str,
    content: str,
    metadata: dict,
    embedding: List[float],
    model_name: str,
) -> None:
    """Delete existing doc+embedding for (tenant, source_type, source_id), then insert fresh."""
    source_id_str = str(source_id)
    # Perform delete+insert inside a transaction to avoid race conditions
    # where an embedding could be inserted before its document exists.
    async with conn.transaction():
        old_id = await conn.fetchval(
            "SELECT id FROM ai_documents WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3",
            tenant_id, source_type, source_id_str,
        )
        if old_id:
            await conn.execute("DELETE FROM ai_embeddings WHERE document_id = $1", old_id)
            await conn.execute("DELETE FROM ai_documents WHERE id = $1", old_id)

        doc_id = await conn.fetchval(
            "INSERT INTO ai_documents(id, tenant_id, source_type, source_id, title, content, metadata) "
            "VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id",
            tenant_id, source_type, source_id_str, title, content, json.dumps(metadata),
        )
        vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in embedding) + "]"
        await conn.execute(
            "INSERT INTO ai_embeddings(id, document_id, tenant_id, embedding, model_name) "
            "VALUES (gen_random_uuid(), $1, $2, $3::vector, $4)",
            doc_id, tenant_id, vec_literal, model_name,
        )


# ── Per-type indexers ──────────────────────────────────────────────────────────

async def index_devis(limit: int = 200, tenant_id: Optional[str] = None) -> int:
    """Index accepted + open devis. Returns number of docs indexed."""
    count = 0
    try:
        async with db.connection(tenant_id) as conn:
            where = _TENANT_FILTER if tenant_id else ""
            params = [limit, tenant_id] if tenant_id else [limit]
            rows = await conn.fetch(
                f"""SELECT id, tenant_id, reference, total_ht, total_ttc, status,
                           created_at, valid_until
                    FROM devis
                    WHERE total_ttc IS NOT NULL {where}
                    ORDER BY created_at DESC LIMIT $1""",
                *params,
            )

        for r in rows:
            tid = str(r["tenant_id"] or "")
            if not tid:
                continue
            content = (
                f"Devis {r['reference']} | Statut: {r['status']}\n"
                f"Montant HT: {r['total_ht']} TND | TTC: {r['total_ttc']} TND\n"
                f"Créé le: {r['created_at']} | Valide jusqu'au: {r['valid_until']}"
            )
            emb, model_name = await get_embedding(content)
            async with db.connection(tid) as wconn:
                await _upsert_doc_embedding(
                    wconn, tid, "DEVIS", str(r["id"]),
                    f"Devis {r['reference']}",
                    content,
                    {"reference": r["reference"], "status": r["status"],
                     "total_ttc": float(r["total_ttc"] or 0)},
                    emb, model_name,
                )
            count += 1
    except Exception as exc:
        logger.warning("index_devis error: %s", exc)
    return count


async def index_factures(limit: int = 200, tenant_id: Optional[str] = None) -> int:
    """Index invoices (factures). Returns number of docs indexed."""
    count = 0
    try:
        async with db.connection(tenant_id) as conn:
            where = _TENANT_FILTER if tenant_id else ""
            params = [limit, tenant_id] if tenant_id else [limit]
            rows = await conn.fetch(
                f"""SELECT id, tenant_id, reference, total_ttc, status,
                           created_at, due_date
                    FROM factures
                    WHERE total_ttc IS NOT NULL {where}
                    ORDER BY created_at DESC LIMIT $1""",
                *params,
            )

        for r in rows:
            tid = str(r["tenant_id"] or "")
            if not tid:
                continue
            content = (
                f"Facture {r['reference']} | Statut: {r['status']}\n"
                f"Montant TTC: {r['total_ttc']} TND\n"
                f"Créée le: {r['created_at']} | Échéance: {r['due_date']}"
            )
            emb, model_name = await get_embedding(content)
            async with db.connection(tid) as wconn:
                await _upsert_doc_embedding(
                    wconn, tid, "FACTURE", str(r["id"]),
                    f"Facture {r['reference']}",
                    content,
                    {"reference": r["reference"], "status": r["status"],
                     "total_ttc": float(r["total_ttc"] or 0)},
                    emb, model_name,
                )
            count += 1
    except Exception as exc:
        logger.warning("index_factures error: %s", exc)
    return count


async def index_stock_items(tenant_id: Optional[str] = None) -> int:
    """Index stock items for RAG context. Returns number of docs indexed."""
    count = 0
    try:
        async with db.connection(tenant_id) as conn:
            where = "AND tenant_id = $1" if tenant_id else ""
            params = [tenant_id] if tenant_id else []
            rows = await conn.fetch(
                f"""SELECT id, tenant_id, product_reference, quantity,
                           COALESCE(reorder_point, 0) as reorder_point,
                           unit_of_measure
                    FROM stock_items
                    WHERE product_reference IS NOT NULL {where}
                    LIMIT 500""",
                *params,
            )

        for r in rows:
            tid = str(r["tenant_id"] or "")
            if not tid:
                continue
            ref = r["product_reference"]
            qty = float(r["quantity"] or 0)
            reorder = float(r["reorder_point"] or 0)
            status = "Critique" if qty == 0 else ("Bas" if qty <= reorder else "OK")
            content = (
                f"Stock article: {ref}\n"
                f"Quantité disponible: {qty} {r['unit_of_measure'] or 'unités'}\n"
                f"Point de réapprovisionnement: {reorder}\n"
                f"Statut stock: {status}"
            )
            emb, model_name = await get_embedding(content)
            async with db.connection(tid) as wconn:
                await _upsert_doc_embedding(
                    wconn, tid, "STOCK_ITEM", str(r["id"]),
                    f"Stock {ref}",
                    content,
                    {"product_reference": ref, "quantity": qty, "status": status},
                    emb, model_name,
                )
            count += 1
    except Exception as exc:
        logger.warning("index_stock_items error: %s", exc)
    return count


async def index_commandes(limit: int = 200, tenant_id: Optional[str] = None) -> int:
    """Index purchase orders (bons_commande). Returns number of docs indexed."""
    count = 0
    try:
        async with db.connection(tenant_id) as conn:
            where = _TENANT_FILTER if tenant_id else ""
            params = [limit, tenant_id] if tenant_id else [limit]
            rows = await conn.fetch(
                f"""SELECT id, tenant_id, reference, total_ttc, status,
                           created_at, expected_delivery_date
                    FROM bons_commande
                    WHERE total_ttc IS NOT NULL {where}
                    ORDER BY created_at DESC LIMIT $1""",
                *params,
            )

        for r in rows:
            tid = str(r["tenant_id"] or "")
            if not tid:
                continue
            content = (
                f"Bon de commande {r['reference']} | Statut: {r['status']}\n"
                f"Montant TTC: {r['total_ttc']} TND\n"
                f"Créé le: {r['created_at']} | Livraison prévue: {r.get('expected_delivery_date', 'N/A')}"
            )
            emb, model_name = await get_embedding(content)
            async with db.connection(tid) as wconn:
                await _upsert_doc_embedding(
                    wconn, tid, "BON_COMMANDE", str(r["id"]),
                    f"Bon commande {r['reference']}",
                    content,
                    {"reference": r["reference"], "status": r["status"],
                     "total_ttc": float(r["total_ttc"] or 0)},
                    emb, model_name,
                )
            count += 1
    except Exception as exc:
        logger.warning("index_commandes error: %s", exc)
    return count


async def index_clients(tenant_id: Optional[str] = None) -> int:
    """Index CRM clients/prospects. Returns number of docs indexed."""
    count = 0
    try:
        async with db.connection(tenant_id) as conn:
            where = "AND tenant_id = $1" if tenant_id else ""
            params = [tenant_id] if tenant_id else []
            rows = await conn.fetch(
                f"""SELECT id, tenant_id, name, email, phone, status, city
                    FROM clients
                    WHERE name IS NOT NULL {where}
                    LIMIT 500""",
                *params,
            )

        for r in rows:
            tid = str(r["tenant_id"] or "")
            if not tid:
                continue
            content = (
                f"Client: {r['name']}\n"
                f"Email: {r['email'] or 'N/A'} | Tél: {r['phone'] or 'N/A'}\n"
                f"Ville: {r['city'] or 'N/A'} | Statut: {r['status'] or 'N/A'}"
            )
            emb, model_name = await get_embedding(content)
            async with db.connection(tid) as wconn:
                await _upsert_doc_embedding(
                    wconn, tid, "CLIENT", str(r["id"]),
                    f"Client {r['name']}",
                    content,
                    {"name": r["name"], "status": r["status"]},
                    emb, model_name,
                )
            count += 1
    except Exception as exc:
        logger.warning("index_clients error: %s", exc)
    return count


# ── Full index pass ────────────────────────────────────────────────────────────

async def index_all(tenant_id: Optional[str] = None, limit: int = 200) -> dict:
    """Run a full indexing pass for all document types. Returns stats."""
    results = await asyncio.gather(
        index_devis(limit, tenant_id),
        index_factures(limit, tenant_id),
        index_stock_items(tenant_id),
        index_clients(tenant_id),
        return_exceptions=True,
    )
    devis_n, factures_n, stock_n, clients_n = (
        r if isinstance(r, int) else 0 for r in results
    )
    logger.info(
        "index_all complete: devis=%d factures=%d stock=%d clients=%d",
        devis_n, factures_n, stock_n, clients_n,
    )
    return {
        "devis": devis_n,
        "factures": factures_n,
        "stock_items": stock_n,
        "clients": clients_n,
        "total": devis_n + factures_n + stock_n + clients_n,
    }


# ── Background periodic indexer ────────────────────────────────────────────────

_indexer_task: asyncio.Task | None = None


async def _periodic_index_loop(interval_seconds: int = 300):
    """Re-index all data every `interval_seconds`. Runs forever."""
    await asyncio.sleep(30)  # initial delay — let the app finish startup
    while True:
        try:
            stats = await index_all()
            logger.info("Periodic indexing done: %s", stats)
        except Exception as exc:
            logger.warning("Periodic indexing error: %s", exc)
        await asyncio.sleep(interval_seconds)


def start_background_indexer(interval_seconds: int = 300) -> None:
    """Start the background periodic indexer (call once from app lifespan)."""
    global _indexer_task
    if _indexer_task is None or _indexer_task.done():
        _indexer_task = asyncio.create_task(_periodic_index_loop(interval_seconds))
        logger.info("Background indexer started (interval=%ds)", interval_seconds)


# ── Vector search ──────────────────────────────────────────────────────────────

async def search_documents(query: str, tenant_id: str, k: int = 5) -> list[dict]:
    embedding = await get_query_embedding(query)
    vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in embedding) + "]"
    sql = (
        "SELECT d.id as document_id, d.title, d.content, d.source_type, "
        f"(e.embedding <-> '{vec_literal}'::vector) as distance "
        "FROM ai_embeddings e JOIN ai_documents d ON d.id = e.document_id "
        "WHERE e.tenant_id = $1 ORDER BY distance ASC LIMIT $2"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(sql, tenant_id, k)
    return [
        {
            "document_id": str(r["document_id"]),
            "title": r["title"],
            "content": r["content"],
            "source_type": r["source_type"],
            "distance": float(r["distance"]),
        }
        for r in rows
    ]
