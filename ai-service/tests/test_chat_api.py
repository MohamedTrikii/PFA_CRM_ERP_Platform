import sys
from pathlib import Path

import pytest
import asyncio

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import main as app_module


@pytest.mark.asyncio
async def test_chat_alias_persists_conversation(monkeypatch):
    async def fake_is_model_available():
        await asyncio.sleep(0)
        return True

    async def fake_chat(user_message, temperature=0.7, model=None):
        await asyncio.sleep(0)
        return {"message": {"content": "Bonjour depuis Ollama"}, "model": "mistral"}

    async def fake_create_conversation(tenant_id, user_id, messages, metadata=None):
        assert tenant_id == "tenant_a"
        assert user_id == "user-123"
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        await asyncio.sleep(0)
        return "conv-123"

    monkeypatch.setattr(app_module.ollama_client, "is_model_available", fake_is_model_available)
    monkeypatch.setattr(app_module.ollama_client, "chat", fake_chat)
    monkeypatch.setattr(app_module.conversation_module, "create_conversation", fake_create_conversation)

    response = await app_module.chat_endpoint(
        app_module.ChatRequest(message="Bonjour"),
        {"tenant_id": "tenant_a", "sub": "user-123"},
    )

    assert response.conversation_id == "conv-123"
    assert response.reply == "Bonjour depuis Ollama"


@pytest.mark.asyncio
async def test_chat_stream_alias_returns_sse(monkeypatch):
    async def fake_is_model_available():
        await asyncio.sleep(0)
        return True

    async def fake_stream_chat(user_message, system_override=None, temperature=0.7, max_tokens=1024, model=None):
        await asyncio.sleep(0)
        yield "Bonjour"
        yield " depuis"
        yield " Ollama"

    async def fake_create_conversation(tenant_id, user_id, messages, metadata=None):
        await asyncio.sleep(0)
        return "conv-stream-456"

    monkeypatch.setattr(app_module.ollama_client, "is_model_available", fake_is_model_available)
    monkeypatch.setattr(app_module.ollama_client, "stream_chat", fake_stream_chat)
    monkeypatch.setattr(app_module.conversation_module, "create_conversation", fake_create_conversation)

    response = await app_module.chat_stream_endpoint(
        app_module.ChatRequest(message="Bonjour"),
        {"tenant_id": "tenant_a", "sub": "user-123"},
    )

    assert response.media_type == "text/event-stream"
    body = b"".join([
        chunk.encode("utf-8") if isinstance(chunk, str) else chunk
        async for chunk in response.body_iterator
    ])
    text = body.decode("utf-8")
    assert "data: Bonjour" in text
    assert "event: conversation_id" in text
    assert "conv-stream-456" in text
