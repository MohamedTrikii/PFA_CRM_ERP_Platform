import sys
from pathlib import Path

import pytest
from httpx import AsyncClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import main as app_module


@pytest.mark.asyncio
async def test_train_forecast_endpoint_requires_training_dependencies(monkeypatch):
    monkeypatch.setattr(app_module, "TRAINING_FEATURES_AVAILABLE", False)

    async def fake_get_current_user(creds=None):
        return {"tenant_id": "tenant_a", "realm_access": {"roles": ["SUPER_ADMIN"]}}

    monkeypatch.setattr("app.auth.get_current_user", fake_get_current_user)

    async with AsyncClient(app=app_module.app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/ai/train/forecast",
            headers={"Authorization": "Bearer dummy"},
        )

    assert response.status_code == 503
    assert "dependencies" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_train_all_returns_task_ids_when_training_available(monkeypatch):
    monkeypatch.setattr(app_module, "TRAINING_FEATURES_AVAILABLE", True)

    async def fake_get_current_user(creds=None):
        return {"tenant_id": "tenant_a", "realm_access": {"roles": ["SUPER_ADMIN"]}}

    async def fake_train(*args, **kwargs):
        return {"status": "ok"}

    async def fake_run_training_task(task_id, coro):
        app_module.training_tasks[task_id]["status"] = "completed"
        app_module.training_tasks[task_id]["finished_at"] = "2026-06-07T00:00:00Z"
        app_module.training_tasks[task_id]["result"] = {"status": "fake"}

    monkeypatch.setattr("app.auth.get_current_user", fake_get_current_user)
    monkeypatch.setattr(app_module, "_run_training_task", fake_run_training_task)
    monkeypatch.setattr(app_module.prophet_trainer, "train_sales_forecast_model", fake_train)
    monkeypatch.setattr(app_module.xgboost_trainer, "train_quote_acceptance_model", fake_train)
    monkeypatch.setattr(app_module.xgboost_trainer, "train_payment_risk_model", fake_train)
    monkeypatch.setattr(app_module.anomaly_trainer, "train_stock_anomaly_model", fake_train)

    async with AsyncClient(app=app_module.app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/ai/train/all",
            json={"models": ["forecast", "quote"]},
            headers={"Authorization": "Bearer dummy"},
        )

    assert response.status_code == 200
    body = response.json()
    assert "jobs" in body
    assert "forecast" in body["jobs"]
    assert "quote" in body["jobs"]
    assert isinstance(body["jobs"]["forecast"], str)
    assert isinstance(body["jobs"]["quote"], str)
