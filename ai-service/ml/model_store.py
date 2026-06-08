from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import joblib
from app import db

ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _artifact_path(name: str, version: str, tenant_id: str) -> Path:
    safe_name = name.replace(" ", "_").lower()
    safe_tenant = tenant_id.replace("-", "_")
    return MODEL_DIR / f"{safe_name}_{safe_tenant}_{version}.joblib"


async def save_model_artifact(name: str, version: str, tenant_id: str, model: Any) -> str:
    artifact = _artifact_path(name, version, tenant_id)
    artifact.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, artifact)
    return str(artifact)


async def register_model(
    tenant_id: str,
    name: str,
    version: str,
    model: Any,
    metadata: dict[str, Any],
) -> str:
    artifact_path = await save_model_artifact(name, version, tenant_id, model)
    async with db.connection(tenant_id) as conn:
        await conn.execute(
            "INSERT INTO ai_models(tenant_id, name, version, artifact_path, metadata) "
            "VALUES ($1, $2, $3, $4, $5::jsonb)",
            tenant_id,
            name,
            version,
            artifact_path,
            json.dumps(metadata, default=str),
        )
    return artifact_path


async def get_latest_model(tenant_id: str, name: str) -> Optional[dict[str, Any]]:
    async with db.connection(tenant_id) as conn:
        row = await conn.fetchrow(
            "SELECT id, tenant_id, name, version, artifact_path, metadata, created_at "
            "FROM ai_models WHERE tenant_id = $1 AND name = $2 "
            "ORDER BY created_at DESC LIMIT 1",
            tenant_id,
            name,
        )
    return dict(row) if row else None


async def list_models(tenant_id: str, name: Optional[str] = None) -> list[dict[str, Any]]:
    query = (
        "SELECT id, tenant_id, name, version, artifact_path, metadata, created_at "
        "FROM ai_models WHERE tenant_id = $1 "
    )
    params = [tenant_id]
    if name:
        query += "AND name = $2 "
        params.append(name)
    query += "ORDER BY created_at DESC"

    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query, *params)
    return [dict(row) for row in rows]


async def load_model_from_path(path: str) -> Any:
    return joblib.load(path)
