import sys
from pathlib import Path

import pytest
from httpx import AsyncClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import main as app_module


@pytest.mark.asyncio
async def test_assistant_endpoint_persists_conversation(monkeypatch):
    async def fake_get_current_user(creds=None):
        return {"tenant_id": "tenant_a", "sub": "user-123"}

    async def fake_search_documents(query, tenant_id, k):
        assert tenant_id == "tenant_a"
        assert query == "Quelle est ma marge ?"
        return [
            {
                "document_id": "doc-1",
                "title": "Devis T60",
                "content": "Document de test pour la marge commerciale.",
                "distance": 0.12,
            }
        ]

    async def fake_chat(user_message, temperature=0.7, max_tokens=1024, model=None):
        assert "Document 1:" in user_message
        return {"message": {"content": "Votre marge est de 22 %."}, "model": "mistral"}

    async def fake_create_conversation(tenant_id, user_id, messages, metadata=None):
        assert tenant_id == "tenant_a"
        assert user_id == "user-123"
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        assert metadata is not None
        return "conv-789"

    monkeypatch.setattr(app_module.indexer_module, "search_documents", fake_search_documents)
    monkeypatch.setattr(app_module.ollama_client, "chat", fake_chat)
    monkeypatch.setattr(app_module.conversation_module, "create_conversation", fake_create_conversation)
    app_module.app.dependency_overrides[app_module.auth.get_current_user] = fake_get_current_user

    try:
        async with AsyncClient(app=app_module.app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/ai/assistant",
                json={
                    "message": "Quelle est ma marge ?",
                    "use_rag": True,
                    "top_k": 1,
                    "temperature": 0.2,
                },
                headers={"Authorization": "Bearer dummy"},
            )
    finally:
        app_module.app.dependency_overrides.clear()

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["conversation_id"] == "conv-789"
    assert body["reply"] == "Votre marge est de 22 %."
    assert body["sources"] and body["sources"][0]["title"] == "Devis T60"


@pytest.mark.asyncio
async def test_documents_search_endpoint_returns_results(monkeypatch):
    async def fake_get_current_user(creds=None):
        return {"tenant_id": "tenant_a"}

    async def fake_search_documents(query, tenant_id, k):
        return [
            {
                "document_id": "doc-2",
                "title": "Relevé de stock",
                "content": "Niveau de stock critique pour les profilés T60.",
                "distance": 0.05,
            }
        ]

    monkeypatch.setattr(app_module.indexer_module, "search_documents", fake_search_documents)
    app_module.app.dependency_overrides[app_module.auth.get_current_user] = fake_get_current_user

    try:
        async with AsyncClient(app=app_module.app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/ai/documents/search",
                json={"query": "stock critique", "k": 1},
                headers={"Authorization": "Bearer dummy"},
            )
    finally:
        app_module.app.dependency_overrides.clear()

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tenant_id"] == "tenant_a"
    assert body["results"][0]["document_id"] == "doc-2"
    assert body["results"][0]["title"] == "Relevé de stock"
