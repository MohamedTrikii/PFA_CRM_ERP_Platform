import os
import asyncio
from .db import connection
from .embedder import deterministic_embedding


async def main():
    tenant = os.getenv("TEST_TENANT", "1")
    query = os.getenv("TEST_QUERY", "devis")
    k = int(os.getenv("TEST_K", "5"))

    vec = deterministic_embedding(query)
    vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"

    sql = (
        "SELECT d.id as document_id, d.title, d.content, "
        f"(e.embedding <-> '{vec_literal}'::vector) as distance "
        "FROM ai_embeddings e JOIN ai_documents d ON d.id = e.document_id "
        "WHERE e.tenant_id = $1 ORDER BY distance ASC LIMIT $2"
    )

    async with connection(tenant) as conn:
        rows = await conn.fetch(sql, tenant, k)
        if not rows:
            print('No results')
            return
        for r in rows:
            print(r['document_id'], r['title'], float(r['distance']))


if __name__ == '__main__':
    asyncio.run(main())
