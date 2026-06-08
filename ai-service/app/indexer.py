"""Simple RAG indexer POC for ai-service.

This script extracts recent `devis` rows and creates `ai_documents` + `ai_embeddings` entries.
Embedding generation is deterministic pseudo-random (hash seeded) for POC; replace with real embedder later.
"""
from __future__ import annotations
import os
import asyncio
import hashlib
import numpy as np
from typing import List
import json

from . import db
from . import ollama

EMBED_DIM = 1536


def deterministic_embedding(text: str, dim: int = EMBED_DIM) -> List[float]:
    # Derive a deterministic seed from sha256 of the text
    h = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(h[:8], "big") & 0xFFFFFFFF
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(dim).astype(float)
    # Normalize to unit vector
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


async def get_query_embedding(text: str) -> List[float]:
    if not text:
        return deterministic_embedding(text)
    try:
        emb = await ollama.embed(text)
        if emb and isinstance(emb, list):
            return [float(x) for x in emb]
    except Exception:
        pass
    return deterministic_embedding(text)


async def search_documents(query: str, tenant_id: str, k: int = 5) -> list[dict[str, object]]:
    embedding = await get_query_embedding(query)
    vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in embedding) + "]"
    sql = (
        "SELECT d.id as document_id, d.title, d.content, "
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
            "distance": float(r["distance"]),
        }
        for r in rows
    ]


async def index_devis(limit: int = 100):
    async with db.connection() as conn:
        rows = await conn.fetch(
            "SELECT id, tenant_id, reference, total_ttc, created_at FROM devis ORDER BY created_at DESC LIMIT $1",
            limit,
        )

        for r in rows:
            doc_content = f"Reference: {r['reference']}\nTotal: {r['total_ttc']}\nCreated: {r['created_at']}"
            tenant = r["tenant_id"] or ""

            # Use Ollama embedding when available, fallback to deterministic
            emb = None
            try:
                emb = await ollama.embed(doc_content)
            except Exception:
                emb = None

            if not emb:
                emb = deterministic_embedding(doc_content)
                model_name = "poc-deterministic"
            else:
                model_name = f"ollama-{ollama.OLLAMA_MODEL}"

            # Insert document with session stamped (db.connection stamps when tenant passed)
            async with db.connection(tenant) as write_conn:
                doc_row = await write_conn.fetchrow(
                    "INSERT INTO ai_documents(id, tenant_id, source_type, source_id, title, content, metadata) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id",
                    tenant,
                    "DEVIS",
                    r["id"],
                    f"Devis {r['reference']}",
                    doc_content,
                    json.dumps({"source_ref": r["reference"]}),
                )
                document_id = doc_row["id"]

                # Prepare vector literal for insertion into Postgres vector type
                vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in emb) + "]"

                await write_conn.execute(
                    "INSERT INTO ai_embeddings(id, document_id, tenant_id, embedding, model_name) VALUES (gen_random_uuid(), $1, $2, $3::vector, $4)",
                    document_id,
                    tenant,
                    vec_literal,
                    model_name,
                )


if __name__ == "__main__":
    asyncio.run(index_devis(100))


if __name__ == "__main__":
    asyncio.run(index_devis(100))
