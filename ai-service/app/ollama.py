"""Thin async client for the Ollama REST API (OpenAI-compatible)."""

import os
from typing import Optional

import httpx

OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

_SYSTEM_PROMPT = (
    "You are an AI assistant embedded in an ERP system for an aluminum joinery company "
    "(menuiserie aluminium). You help with:\n"
    "- Drafting professional quotes (devis) and customer communications in French\n"
    "- Summarizing purchase orders (bons de commande) and reception notes\n"
    "- Explaining ERP data: invoices, stock levels, CRM prospects\n"
    "- Answering business questions about the Moroccan aluminum joinery market\n\n"
    "Always reply in the same language as the user's message. "
    "Be concise and professional. Never invent prices or quantities."
)


async def chat(
    user_message: str,
    system_override: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    model: Optional[str] = None,
) -> dict:
    """Send a message to Ollama and return the parsed response."""
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_override or _SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()


async def stream_chat(
    user_message: str,
    system_override: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    model: Optional[str] = None,
):
    """Stream a chat response from Ollama."""
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_override or _SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data:"):
                        yield line[5:].strip()
                    else:
                        yield line
        except (httpx.HTTPStatusError, httpx.RequestError):
            # Fallback to non-streaming chat if Ollama does not support streaming.
            result = await chat(user_message, system_override, temperature, max_tokens, model)
            msg = result.get("message", {})
            yield msg.get("content", "")


async def stream_chat_messages(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    model: Optional[str] = None,
):
    """Stream a response from Ollama given a full messages array (system + history + user).

    Each yielded value is a raw text chunk (content token). Callers should
    accumulate and persist the full reply after the generator is exhausted.
    """
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                import json as _json
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        obj = _json.loads(line)
                    except Exception:
                        continue
                    token = obj.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if obj.get("done"):
                        return
        except (httpx.HTTPStatusError, httpx.RequestError):
            # Fallback: non-streaming
            result = await chat_messages(messages, temperature, max_tokens, model)
            msg = result.get("message", {})
            yield msg.get("content", "")


async def chat_messages(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    model: Optional[str] = None,
) -> dict:
    """Non-streaming chat with a full messages array."""
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()


async def list_models() -> list[dict]:
    """Return models currently available in this Ollama instance."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{OLLAMA_URL}/api/tags")
        resp.raise_for_status()
        return resp.json().get("models", [])


async def is_model_available(model: str = OLLAMA_MODEL) -> bool:
    try:
        models = await list_models()
        return any(m.get("name", "").startswith(model) for m in models)
    except Exception:
        return False


async def embed(text: str, model: str | None = None) -> list[float] | None:
    """Return an embedding for `text` using Ollama if available.

    Tries common Ollama embedding endpoints; returns None on failure so callers
    can fallback to a local embedder.
    """
    payload = {
        "model": model or OLLAMA_MODEL,
        "input": text,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Try /api/embeddings (commonly used)
        try:
            resp = await client.post(f"{OLLAMA_URL}/api/embeddings", json=payload)
            resp.raise_for_status()
            data = resp.json()
            # Expecting {'data': [{'embedding': [...]}, ...]} or similar
            if isinstance(data, dict):
                d = data.get("data") or data.get("embeddings") or data.get("embedding")
                if isinstance(d, list) and len(d) > 0:
                    emb = d[0].get("embedding") if isinstance(d[0], dict) else d[0]
                    return emb
        except Exception:
            pass

        # Fallback attempt: /api/embed
        try:
            resp = await client.post(f"{OLLAMA_URL}/api/embed", json=payload)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                emb = data.get("embedding") or data.get("data")
                if isinstance(emb, list):
                    return emb
        except Exception:
            pass

    return None
