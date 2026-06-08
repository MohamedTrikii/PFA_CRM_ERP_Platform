"""Conversation persistence helpers for ai-service."""
from __future__ import annotations
import json
from typing import Any

from . import db


async def create_conversation(
    tenant_id: str,
    user_id: str | None,
    messages: list[dict[str, Any]],
    metadata: dict | None = None,
) -> str:
    async with db.connection(tenant_id) as conn:
        row = await conn.fetchrow(
            "INSERT INTO ai_conversations(tenant_id, user_id, messages, metadata) "
            "VALUES ($1, $2, $3::jsonb, $4::jsonb) RETURNING id",
            tenant_id,
            user_id,
            json.dumps(messages),
            json.dumps(metadata) if metadata is not None else None,
        )
        return str(row["id"])


async def get_conversation(tenant_id: str, conversation_id: str) -> dict[str, Any] | None:
    async with db.connection(tenant_id) as conn:
        row = await conn.fetchrow(
            "SELECT id, tenant_id, user_id, messages, metadata, created_at "
            "FROM ai_conversations WHERE id = $1",
            conversation_id,
        )
        return dict(row) if row else None


async def append_message(tenant_id: str, conversation_id: str, message: dict[str, Any]) -> list[dict[str, Any]]:
    async with db.connection(tenant_id) as conn:
        row = await conn.fetchrow(
            "SELECT messages FROM ai_conversations WHERE id = $1",
            conversation_id,
        )
        if not row:
            raise ValueError("Conversation not found")
        messages = row["messages"] or []
        messages.append(message)
        await conn.execute(
            "UPDATE ai_conversations SET messages = $1::jsonb WHERE id = $2",
            json.dumps(messages),
            conversation_id,
        )
        return messages
