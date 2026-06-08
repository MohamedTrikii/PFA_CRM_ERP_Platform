from __future__ import annotations
from datetime import datetime
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest

from app import db
from .model_store import register_model

MOVEMENT_TYPE_MAPPING = {
    "ENTREE": 0,
    "SORTIE": 1,
    "INVENTAIRE": 2,
    "TRANSFERT_SORTIE": 3,
    "TRANSFERT_ENTREE": 4,
    "RETOUR": 5,
}


async def train_stock_anomaly_model(tenant_id: str) -> dict[str, object]:
    query = (
        "SELECT quantity::float as quantity, quantity_before::float as quantity_before, "
        "quantity_after::float as quantity_after, movement_type, created_at "
        "FROM stock_movements "
        "ORDER BY created_at"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query)

    X = []
    for r in rows:
        if r["quantity"] is None or r["quantity_before"] is None or r["quantity_after"] is None:
            continue
        movement_type = MOVEMENT_TYPE_MAPPING.get(r["movement_type"], -1)
        created_day = r["created_at"].weekday() if r["created_at"] else 0
        X.append([
            float(r["quantity"]),
            float(r["quantity_before"]),
            float(r["quantity_after"]),
            float(movement_type),
            float(created_day),
        ])

    if len(X) < 50:
        raise ValueError("Not enough stock movements to train anomaly detection")

    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    model.fit(np.array(X))

    version = datetime.utcnow().strftime("iforest-stock-%Y%m%d%H%M%S")
    metadata = {
        "trained_rows": len(X),
        "model_type": "isolation_forest",
        "problem": "stock_anomaly",
        "trained_at": datetime.utcnow().isoformat(),
    }
    artifact_path = await register_model(tenant_id, "stock_anomaly_iforest", version, model, metadata)
    return {"name": "stock_anomaly_iforest", "version": version, "artifact_path": artifact_path, "metadata": metadata}
