"""
Stock-out risk forecasting using exponential moving average on movement history.
Returns days-to-stockout estimate and a 0-1 risk score.
"""
from __future__ import annotations
from dataclasses import dataclass
import math


@dataclass
class StockForecast:
    product_id: str
    product_reference: str
    current_quantity: float
    avg_daily_consumption: float
    estimated_days_to_stockout: int | None
    risk_score: float
    risk_level: str


def _ema(values: list[float], alpha: float = 0.3) -> float:
    """Exponential moving average — most recent window weight."""
    if not values:
        return 0.0
    result = values[0]
    for v in values[1:]:
        result = alpha * v + (1 - alpha) * result
    return result


def forecast_item(
    product_id: str,
    product_reference: str,
    current_quantity: float,
    daily_consumptions: list[float],
    reorder_point: float = 0.0,
) -> StockForecast:
    """
    daily_consumptions: list of daily SORTIE quantities ordered oldest → newest.
    """
    avg_consumption = _ema(daily_consumptions) if daily_consumptions else 0.0

    if avg_consumption <= 0:
        days_to_stockout = None
        risk_score = 0.05
    else:
        effective_qty = max(current_quantity - reorder_point, 0.0)
        days_to_stockout = max(int(effective_qty / avg_consumption), 0)
        # Risk sigmoid: risk → 1 as days_to_stockout → 0; risk → 0 as → infinity
        risk_score = round(1 / (1 + math.exp(0.15 * (days_to_stockout - 14))), 3)

    if risk_score >= 0.75:
        level = "CRITICAL"
    elif risk_score >= 0.45:
        level = "HIGH"
    elif risk_score >= 0.20:
        level = "MEDIUM"
    else:
        level = "LOW"

    return StockForecast(
        product_id=product_id,
        product_reference=product_reference,
        current_quantity=current_quantity,
        avg_daily_consumption=round(avg_consumption, 4),
        estimated_days_to_stockout=days_to_stockout,
        risk_score=risk_score,
        risk_level=level,
    )
