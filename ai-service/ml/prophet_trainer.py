from __future__ import annotations
from datetime import datetime
from typing import Optional

import pandas as pd
from prophet import Prophet

from app import db
from .model_store import register_model


async def train_sales_forecast_model(tenant_id: str) -> dict[str, object]:
    query = (
        "SELECT created_at, total_ttc FROM devis "
        "WHERE status = 'ACCEPTE' AND total_ttc IS NOT NULL "
        "ORDER BY created_at"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query)

    records = [
        {"ds": r["created_at"], "y": float(r["total_ttc"]) }
        for r in rows
        if r["created_at"] is not None and r["total_ttc"] is not None
    ]
    if len(records) < 6:
        raise ValueError("Not enough accepted quotes to train a sales forecast model")

    df = pd.DataFrame(records)
    model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    model.fit(df)

    version = datetime.utcnow().strftime("prophet-v%s" % datetime.utcnow().strftime("%Y%m%d%H%M%S"))
    metadata = {
        "trained_rows": len(records),
        "source": "devis",
        "model_type": "prophet",
        "trained_at": datetime.utcnow().isoformat(),
    }
    artifact_path = await register_model(tenant_id, "sales_forecast_prophet", version, model, metadata)
    return {"name": "sales_forecast_prophet", "version": version, "artifact_path": artifact_path, "metadata": metadata}
