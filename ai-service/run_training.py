#!/usr/bin/env python3
"""
run_training.py — Lance l'entraînement des 4 modèles ML pour tous les tenants.
Usage: python run_training.py
"""
import asyncio
import os
import sys

T_DEMO = "00000000-0000-0000-0000-000000000002"
T_ALUM = "00000000-0000-0000-0000-000000000003"
T_VITR = "00000000-0000-0000-0000-000000000004"

TENANTS = [
    (T_DEMO, "demo-tenant"),
    (T_ALUM, "aluminium-maroc"),
    (T_VITR, "vitrerie-atlas"),
]

MODELS = [
    ("forecast",      "sales_forecast_prophet"),
    ("quote",         "quote_acceptance_xgboost"),
    ("payment-risk",  "payment_risk_xgboost"),
    ("stock",         "stock_anomaly_iforest"),
]


async def main():
    from ml import prophet_trainer, xgboost_trainer, anomaly_trainer

    results = {}
    errors  = []

    for tenant_id, tenant_name in TENANTS:
        print(f"\n── Tenant: {tenant_name}")
        results[tenant_name] = {}

        trainers = [
            ("forecast",     prophet_trainer.train_sales_forecast_model(tenant_id)),
            ("quote",        xgboost_trainer.train_quote_acceptance_model(tenant_id)),
            ("payment-risk", xgboost_trainer.train_payment_risk_model(tenant_id)),
            ("stock",        anomaly_trainer.train_stock_anomaly_model(tenant_id)),
        ]

        for name, coro in trainers:
            try:
                result = await coro
                acc = result.get("metadata", {}).get("accuracy")
                rows = result.get("metadata", {}).get("trained_rows")
                acc_str = f"  accuracy={acc:.4f}" if acc is not None else ""
                print(f"  ✓ {name:<14} rows={rows}{acc_str}")
                results[tenant_name][name] = "ok"
            except Exception as exc:
                print(f"  ✗ {name:<14} ERREUR: {exc}")
                errors.append(f"{tenant_name}/{name}: {exc}")
                results[tenant_name][name] = "failed"

    print("\n══════════════════════════════════════")
    total = sum(1 for t in results.values() for v in t.values() if v == "ok")
    print(f"✓ {total} modèles entraînés avec succès")
    if errors:
        print(f"✗ {len(errors)} échec(s):")
        for e in errors:
            print(f"  · {e}")


if __name__ == "__main__":
    asyncio.run(main())
