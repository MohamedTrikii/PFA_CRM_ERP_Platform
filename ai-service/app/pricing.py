"""
Aluminum joinery price suggestion engine.
Uses domain-knowledge heuristics (TND pricing per m² by profile series + glass markup).
No ML training required — suitable until real quote history is accumulated.
"""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal

# Base price per m² (HT, TND) by profile series
_PROFILE_BASE: dict[str, float] = {
    "T45":  850.0,
    "T60": 1050.0,
    "T70": 1200.0,
    "T80": 1400.0,
    "DEFAULT": 950.0,
}

# Glass type markup factor applied on top of base price
_GLASS_FACTOR: dict[str, float] = {
    "SIMPLE_4":      1.00,
    "DV_4_16_4":     1.35,
    "DV_SECURITE":   1.55,
    "FEUILLETE":     1.65,
    "ARGON":         1.45,
    "DEFAULT":       1.30,
}

# Opening type complexity surcharge (absolute TND per unit)
_OPENING_SURCHARGE: dict[str, float] = {
    "FIXE":            0.0,
    "BATTANT":       120.0,
    "COULISSANT":    180.0,
    "OSCILLO_BATTANT": 280.0,
    "PIVOTANT":      350.0,
    "DEFAULT":       100.0,
}

# Minimum surface m² to avoid very small units being priced unrealistically
_MIN_SURFACE_M2 = 0.25


@dataclass
class PriceBreakdown:
    surface_m2: float
    base_price_per_m2: float
    glass_factor: float
    opening_surcharge: float
    unit_price_ht: float
    total_ht: float
    confidence: float


def suggest_price(
    width_mm: int,
    height_mm: int,
    profile_series: str | None,
    glass_type: str | None,
    opening_type: str | None,
    quantity: int,
) -> PriceBreakdown:
    surface = max((width_mm / 1000) * (height_mm / 1000), _MIN_SURFACE_M2)

    base = _PROFILE_BASE.get(profile_series or "", _PROFILE_BASE["DEFAULT"])
    glass_f = _GLASS_FACTOR.get(glass_type or "", _GLASS_FACTOR["DEFAULT"])
    surcharge = _OPENING_SURCHARGE.get(opening_type or "", _OPENING_SURCHARGE["DEFAULT"])

    unit_ht = round(surface * base * glass_f + surcharge, 2)
    total_ht = round(unit_ht * quantity, 2)

    # Confidence is lower for unknown profile/glass types
    known = sum([
        profile_series in _PROFILE_BASE,
        glass_type in _GLASS_FACTOR,
        opening_type in _OPENING_SURCHARGE,
    ])
    confidence = round(0.60 + 0.13 * known, 2)

    return PriceBreakdown(
        surface_m2=round(surface, 4),
        base_price_per_m2=base,
        glass_factor=glass_f,
        opening_surcharge=surcharge,
        unit_price_ht=unit_ht,
        total_ht=total_ht,
        confidence=confidence,
    )
