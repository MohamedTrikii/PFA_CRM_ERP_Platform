from __future__ import annotations
from datetime import datetime
from typing import Optional

import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app import db
from .model_store import register_model


async def train_quote_acceptance_model(tenant_id: str) -> dict[str, object]:
    query = (
        "SELECT d.total_ttc::float as total_ttc, d.discount_pct::float as discount_pct, "
        "d.total_ht::float as total_ht, d.status as status, "
        "date_part('day', COALESCE(d.valid_until, d.created_at) - d.created_at) as valid_days, "
        "COUNT(dl.id) as line_count "
        "FROM devis d "
        "LEFT JOIN devis_lines dl ON dl.devis_id = d.id "
        "WHERE d.status IN ('ACCEPTE', 'REFUSE') "
        "GROUP BY d.id"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query)

    X = []
    y = []
    for r in rows:
        if r["total_ttc"] is None or r["discount_pct"] is None or r["total_ht"] is None:
            continue
        X.append([
            float(r["total_ttc"]),
            float(r["discount_pct"]),
            float(r["total_ht"]),
            float(r["valid_days"] or 0),
            float(r["line_count"] or 0),
        ])
        y.append(1 if r["status"] == "ACCEPTE" else 0)

    if len(X) < 20:
        raise ValueError("Not enough labeled quotes to train acceptance classifier")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = XGBClassifier(use_label_encoder=False, eval_metric="logloss", n_estimators=100, random_state=42)
    model.fit(np.array(X_train), np.array(y_train))
    preds = model.predict(np.array(X_test))
    accuracy = float(accuracy_score(np.array(y_test), preds))

    version = datetime.utcnow().strftime("xgboost-quote-%Y%m%d%H%M%S")
    metadata = {
        "trained_rows": len(X),
        "accuracy": accuracy,
        "model_type": "xgboost",
        "problem": "quote_acceptance",
        "trained_at": datetime.utcnow().isoformat(),
    }
    artifact_path = await register_model(tenant_id, "quote_acceptance_xgboost", version, model, metadata)
    return {"name": "quote_acceptance_xgboost", "version": version, "artifact_path": artifact_path, "metadata": metadata}


async def train_payment_risk_model(tenant_id: str) -> dict[str, object]:
    query = (
        "SELECT f.total_ttc::float as total_ttc, f.amount_paid::float as amount_paid, "
        "f.issue_date as issue_date, f.due_date as due_date, f.status as status "
        "FROM factures f "
        "WHERE f.due_date IS NOT NULL AND f.total_ttc > 0"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query)

    X = []
    y = []
    for r in rows:
        if r["total_ttc"] is None or r["due_date"] is None:
            continue
        days_to_due = (r["due_date"] - r["issue_date"]).days if r["issue_date"] else 0
        payment_ratio = float(r["amount_paid"] or 0) / float(r["total_ttc"])
        label = 1 if r["status"] in ("EN_RETARD", "BROUILLON") or payment_ratio < 1.0 else 0
        X.append([
            float(r["total_ttc"]),
            payment_ratio,
            float(days_to_due),
        ])
        y.append(label)

    if len(X) < 20:
        raise ValueError("Not enough invoice records to train payment risk classifier")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = XGBClassifier(use_label_encoder=False, eval_metric="logloss", n_estimators=100, random_state=42)
    model.fit(np.array(X_train), np.array(y_train))
    preds = model.predict(np.array(X_test))
    accuracy = float(accuracy_score(np.array(y_test), preds))

    version = datetime.utcnow().strftime("xgboost-payment-%Y%m%d%H%M%S")
    metadata = {
        "trained_rows": len(X),
        "accuracy": accuracy,
        "model_type": "xgboost",
        "problem": "payment_risk",
        "trained_at": datetime.utcnow().isoformat(),
    }
    artifact_path = await register_model(tenant_id, "payment_risk_xgboost", version, model, metadata)
    return {"name": "payment_risk_xgboost", "version": version, "artifact_path": artifact_path, "metadata": metadata}
