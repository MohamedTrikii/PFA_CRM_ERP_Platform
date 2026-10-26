"""Embedding helper for ai-service.

Uses nomic-embed-text via Ollama when available; falls back to a deterministic
SHA-256-seeded unit vector so indexing never hard-fails in dev.

Configure via env:
  OLLAMA_EMBED_MODEL  — Ollama model for embeddings (default: nomic-embed-text)
  EMBED_DIM           — expected vector dimension (default: 768)
  OLLAMA_URL          — Ollama base URL (default: http://ollama:11434)
"""
from __future__ import annotations
import hashlib
import os
from typing import List

import httpx
import numpy as np

OLLAMA_URL        = os.getenv("OLLAMA_URL",        "http://ollama:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
EMBED_DIM         = int(os.getenv("EMBED_DIM",     "1536"))  # matches existing vector(1536) column


def deterministic_embedding(text: str, dim: int = EMBED_DIM) -> List[float]:
    """Consistent, normalised pseudo-random unit vector derived from SHA-256 of text."""
    h    = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(h[:8], "big") & 0xFFFFFFFF
    rng  = np.random.default_rng(seed)
    vec  = rng.standard_normal(dim).astype(float)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


async def embed(text: str) -> tuple[List[float], str]:
    """Return (embedding_vector, model_name).

    Tries nomic-embed-text via Ollama; falls back to deterministic SHA-256.
    Guarantees output has exactly EMBED_DIM dimensions.
    """
    if text:
        vec = await _ollama_embed(text)
        if vec is not None and len(vec) == EMBED_DIM:
            return [float(x) for x in vec], f"ollama-{OLLAMA_EMBED_MODEL}"
    return deterministic_embedding(text), "deterministic-sha256"


async def _ollama_embed(text: str) -> List[float] | None:
    payload = {"model": OLLAMA_EMBED_MODEL, "input": text}
    async with httpx.AsyncClient(timeout=60.0) as client:
        for endpoint in ("/api/embed", "/api/embeddings"):
            try:
                resp = await client.post(f"{OLLAMA_URL}{endpoint}", json=payload)
                resp.raise_for_status()
                data = resp.json()
                emb  = _extract_embedding(data)
                if emb:
                    return emb
            except Exception:
                continue
    return None


def _extract_embedding(data: dict) -> List[float] | None:
    for key in ("embedding", "embeddings", "data"):
        val = data.get(key)
        if isinstance(val, list) and val:
            first = val[0]
            if isinstance(first, dict):
                emb = first.get("embedding")
                if isinstance(emb, list):
                    return emb
            elif isinstance(first, (int, float)):
                return val
    return None
