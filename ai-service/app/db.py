"""Database helpers for ai-service.

Provides an asyncpg connection helper that ensures `app.tenant_id` is stamped
for each session using `set_config('app.tenant_id', ...)` when a tenant_id is
known. Exposes `connect()` and a context manager `connection()`.
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
import asyncpg
from typing import AsyncIterator, Optional

async def connect():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")
    return await asyncpg.connect(db_url)


@asynccontextmanager
async def connection(tenant_id: Optional[str] = None) -> AsyncIterator[asyncpg.Connection]:
    conn = await connect()
    try:
        if tenant_id:
            # stamp session so Postgres RLS policies that rely on current_setting('app.tenant_id') work
            await conn.execute("SELECT set_config('app.tenant_id', $1, FALSE)", tenant_id)
        yield conn
    finally:
        await conn.close()
