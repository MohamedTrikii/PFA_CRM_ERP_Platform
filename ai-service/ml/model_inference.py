from __future__ import annotations
import asyncio
from typing import Any

import joblib
import numpy as np
import pandas as pd
from app import db
from .model_store import get_latest_model


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


async def _load_model(path: str) -> Any:
    return await asyncio.to_thread(joblib.load, path)


async def load_latest_model(tenant_id: str, model_name: str) -> tuple[Any, dict[str, Any]]:
    model_row = await get_latest_model(tenant_id, model_name)
    if model_row is None:
        raise ValueError(f"No trained model found for '{model_name}'")

    model = await _load_model(model_row["artifact_path"])
    return model, model_row


async def predict_sales_forecast(tenant_id: str, horizon_days: int = 90) -> list[dict[str, Any]]:
    model, model_row = await load_latest_model(tenant_id, "sales_forecast_prophet")
    future = model.make_future_dataframe(periods=horizon_days, freq="D")
    forecast = model.predict(future)
    points = forecast[["ds", "yhat"]].tail(horizon_days)

    return [
        {"date": row["ds"].isoformat(), "predicted_amount": float(row["yhat"])}
        for _, row in points.iterrows()
    ]


async def predict_quote_acceptance(tenant_id: str, features: dict[str, Any]) -> dict[str, Any]:
    model, model_row = await load_latest_model(tenant_id, "quote_acceptance_xgboost")
    feature_vector = [
        _to_float(features.get("total_ttc")),
        _to_float(features.get("discount_pct")),
        _to_float(features.get("total_ht")),
        _to_float(features.get("valid_days")),
        _to_float(features.get("line_count")),
    ]
    array = np.array([feature_vector])
    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(array)[0][1])
    else:
        probability = float(model.predict(array)[0])
    return {
        "probability": probability,
        "score": probability,
        "explanation": f"Predicted by {model_row['name']}@{model_row['version']}",
    }


async def predict_payment_risk(tenant_id: str, features: dict[str, Any]) -> dict[str, Any]:
    model, model_row = await load_latest_model(tenant_id, "payment_risk_xgboost")
    feature_vector = [
        _to_float(features.get("total_ttc")),
        _to_float(features.get("payment_ratio")),
        _to_float(features.get("days_to_due")),
    ]
    array = np.array([feature_vector])
    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(array)[0][1])
    else:
        probability = float(model.predict(array)[0])
    return {
        "probability": probability,
        "score": probability,
        "explanation": f"Predicted by {model_row['name']}@{model_row['version']}",
    }


async def detect_stock_anomalies(tenant_id: str, since_days: int = 30) -> list[dict[str, Any]]:
    model, model_row = await load_latest_model(tenant_id, "stock_anomaly_iforest")
    query = (
        "SELECT id::text as entity_id, quantity::float as quantity, quantity_before::float as quantity_before, "
        "quantity_after::float as quantity_after, movement_type, created_at "
        "FROM stock_movements "
        "WHERE created_at >= now() - ($1 * INTERVAL '1 day') "
        "ORDER BY created_at DESC"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query, since_days)

    X = []
    details = []
    for r in rows:
        movement_type = r["movement_type"] or ""
        created_day = r["created_at"].weekday() if r["created_at"] else 0
        X.append([
            _to_float(r["quantity"]),
            _to_float(r["quantity_before"]),
            _to_float(r["quantity_after"]),
            float({"ENTREE": 0, "SORTIE": 1, "INVENTAIRE": 2, "TRANSFERT_SORTIE": 3, "TRANSFERT_ENTREE": 4, "RETOUR": 5}.get(movement_type, -1)),
            float(created_day),
        ])
        details.append({
            "entity_id": r["entity_id"],
            "movement_type": movement_type,
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })

    if not X:
        return []

    array = np.array(X)
    predictions = model.predict(array)
    scores = model.decision_function(array) if hasattr(model, "decision_function") else np.zeros(len(X))

    anomalies = []
    for idx, pred in enumerate(predictions):
        if pred == -1:
            anomalies.append({
                "entity": "stock_movement",
                "entity_id": details[idx]["entity_id"],
                "score": float(-scores[idx]) if scores is not None else 1.0,
                "details": {
                    "movement_type": details[idx]["movement_type"],
                    "created_at": details[idx]["created_at"],
                },
            })

    anomalies.sort(key=lambda i: i["score"], reverse=True)
    return anomalies[:20]
