"""Database helpers for ai-service.

asyncpg connection pool with RLS tenant stamping.
Pool is initialised once at FastAPI startup (lifespan event) and reused.
Falls back to per-request connections when pool is not yet ready.
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import asyncpg

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")
    _pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def connect() -> asyncpg.Connection:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")
    return await asyncpg.connect(db_url)


@asynccontextmanager
async def connection(tenant_id: Optional[str] = None) -> AsyncIterator[asyncpg.Connection]:
    if _pool is not None:
        async with _pool.acquire() as conn:
            if tenant_id:
                await conn.execute("SELECT set_config('app.tenant_id', $1, FALSE)", tenant_id)
            yield conn
    else:
        conn = await connect()
        try:
            if tenant_id:
                await conn.execute("SELECT set_config('app.tenant_id', $1, FALSE)", tenant_id)
            yield conn
        finally:
            await conn.close()
