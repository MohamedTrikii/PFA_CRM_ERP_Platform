from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd

from app import db
from .model_store import register_model


class _LinearSeasonalForecast:
    """
    Lightweight Prophet-API-compatible forecasting model using scikit-learn.
    Fits trend + annual Fourier seasonality on daily aggregated revenue.
    Used as a fallback when the full Prophet/Stan backend is not available
    (e.g. in the Docker slim image without build tools).
    """

    def __init__(self):
        from sklearn.linear_model import Ridge
        self.model = Ridge(alpha=1.0)
        self._last_ds: Optional[pd.Timestamp] = None
        self._t0: Optional[pd.Timestamp] = None

    def _features(self, df: pd.DataFrame) -> np.ndarray:
        ds = pd.to_datetime(df["ds"])
        days = (ds - self._t0).dt.days.values.astype(float)
        doy  = ds.dt.dayofyear.values.astype(float)
        return np.column_stack([
            np.ones(len(days)),           # intercept
            days,                          # linear trend
            np.sin(2 * np.pi * doy / 365.25),
            np.cos(2 * np.pi * doy / 365.25),
            np.sin(4 * np.pi * doy / 365.25),
            np.cos(4 * np.pi * doy / 365.25),
        ])

    def fit(self, df: pd.DataFrame) -> "_LinearSeasonalForecast":
        self._t0 = pd.to_datetime(df["ds"]).min()
        self._last_ds = pd.to_datetime(df["ds"]).max()
        X = self._features(df)
        y = df["y"].values.astype(float)
        self.model.fit(X, y)
        return self

    def make_future_dataframe(self, periods: int, freq: str = "D") -> pd.DataFrame:
        future_dates = pd.date_range(
            start=self._last_ds + pd.Timedelta(days=1),
            periods=periods,
            freq=freq,
        )
        return pd.DataFrame({"ds": future_dates})

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        X = self._features(df)
        yhat = self.model.predict(X)
        result = df.copy()
        result["yhat"] = yhat
        return result


def _make_model() -> object:
    """Return a Prophet instance if Stan is available, else the scikit-learn fallback."""
    try:
        from prophet import Prophet
        m = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
        # Probe Stan backend; raises AttributeError when cmdstan is not installed.
        _ = m.stan_backend  # noqa: F841
        return m
    except Exception:
        return _LinearSeasonalForecast()


async def train_sales_forecast_model(tenant_id: str) -> dict[str, object]:
    query = (
        "SELECT created_at, total_ttc FROM devis "
        "WHERE status = 'ACCEPTE' AND total_ttc IS NOT NULL "
        "ORDER BY created_at"
    )
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(query)

    records = [
        {"ds": r["created_at"], "y": float(r["total_ttc"])}
        for r in rows
        if r["created_at"] is not None and r["total_ttc"] is not None
    ]
    if len(records) < 6:
        raise ValueError("Not enough accepted quotes to train a sales forecast model")

    df = pd.DataFrame(records)
    df["ds"] = pd.to_datetime(df["ds"]).dt.tz_localize(None)   # Prophet requires tz-naive

    model = _make_model()
    model.fit(df)

    model_type = (
        "prophet"
        if model.__class__.__name__ == "Prophet"
        else "linear_seasonal"
    )
    version = datetime.now(timezone.utc).strftime(f"{model_type}-v%Y%m%d%H%M%S")
    metadata = {
        "trained_rows": len(records),
        "source": "devis",
        "model_type": model_type,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    artifact_path = await register_model(tenant_id, "sales_forecast_prophet", version, model, metadata)
    return {
        "name": "sales_forecast_prophet",
        "version": version,
        "artifact_path": artifact_path,
        "metadata": metadata,
    }
