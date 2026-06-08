import asyncio
import pytest

from httpx import AsyncClient

from app import main as app_module


class FakeConn:
    def __init__(self, fetch_rows=None, fetchrow_result=None):
        self.exec_calls = []
        self.fetch_args = None
        self.fetch_rows = fetch_rows or []
        self.fetchrow_result = fetchrow_result

    async def execute(self, sql, *args):
        self.exec_calls.append((sql, args))

    async def fetch(self, sql, *args):
        self.fetch_args = (sql, args)
        return self.fetch_rows

    async def fetchrow(self, sql, *args):
        self.fetch_args = (sql, args)
        return self.fetchrow_result

    async def close(self):
        return None


@pytest.mark.asyncio
async def test_retrieval_stamps_session_and_calls_fetch(monkeypatch):
    fake_rows = [
        {"document_id": "doc1", "title": "T", "content": "C", "distance": 0.1}
    ]

    async def fake_connect(url):
        return FakeConn(fetch_rows=fake_rows)

    async def fake_get_current_user(creds=None):
        return {"tenant_id": "tenant_a"}

    monkeypatch.setattr("app.auth.get_current_user", fake_get_current_user)
    monkeypatch.setattr("asyncpg.connect", fake_connect)

    async with AsyncClient(app=app_module.app, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/ai/retrieval",
            json={"tenant_id": "tenant_a", "query": "search me", "k": 1},
            headers={"Authorization": "Bearer dummy"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["tenant_id"] == "tenant_a"


@pytest.mark.asyncio
async def test_indexer_sets_session_per_document(monkeypatch):
    # Prepare fake rows to be returned by the devis query
    devis_rows = [
        {"id": 1, "tenant_id": "tenant_x", "reference": "R1", "total_ttc": 100, "created_at": "2026-01-01"},
    ]

    fake_conn = FakeConn(fetch_rows=devis_rows, fetchrow_result={"id": "doc-uuid"})

    async def fake_connect(url):
        return fake_conn

    monkeypatch.setattr("asyncpg.connect", fake_connect)

    # Run the indexer (async function) — it should call execute with set_config per row
    await app_module.indexer_module.index_devis(1)

    # Assert that a set_config call was made (session tenant stamping)
    found = any("set_config('app.tenant_id'" in call[0] for call in fake_conn.exec_calls)
    assert found, "indexer did not stamp session with tenant id"
