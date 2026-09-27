"""
Alert Disaster Restoration — Deterministic Pricing Engine & Tier Snapper
Enforces non-hallucinated, code-backed pricing for restoration field scopes.
"""

import json
import math
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, List, Tuple


def calculate_psychrometrics(temp_f: float, rh_percent: float) -> Dict[str, float]:
    """
    IICRC S500 Standard Psychrometric Conversion.
    Calculates Dew Point (°F) and Specific Humidity / GPP (Grains Per Pound)
    from ambient Temp (°F) and RH (%).
    """
    temp_c = (temp_f - 32.0) * 5.0 / 9.0
    # Magnus-Tetens approximation for saturation vapor pressure (hPa)
    e_s = 6.112 * math.exp((17.67 * temp_c) / (temp_c + 243.5))
    # Actual vapor pressure (hPa)
    rh_clamped = max(0.01, min(100.0, rh_percent))
    e = e_s * (rh_clamped / 100.0)
    # Atmospheric pressure at standard sea level (hPa)
    p_atm = 1013.25
    # Humidity ratio (mass of water vapor per mass of dry air in lbs/lb)
    humidity_ratio = 0.62198 * e / (p_atm - e)
    # Grains per pound (7000 grains = 1 lb)
    gpp = round(humidity_ratio * 7000.0, 1)
    # Dew point calculation
    alpha = ((17.67 * temp_c) / (temp_c + 243.5)) + math.log(rh_clamped / 100.0)
    dew_point_c = (243.5 * alpha) / (17.67 - alpha)
    dew_point_f = round(dew_point_c * 9.0 / 5.0 + 32.0, 1)

    return {
        "tempF": float(temp_f),
        "rhPercent": float(rh_percent),
        "dewPointF": dew_point_f,
        "humidityRatioGPP": gpp,
    }


def calculate_grain_depression(inlet_gpp: float, exhaust_gpp: float) -> Dict[str, Any]:
    """
    Calculates dehumidifier grain depression (drying efficiency).
    Depression = Inlet GPP - Exhaust GPP.
    Efficiency tiers:
      - >= 15 GPP: Optimal drying rate
      - 5 to 15 GPP: Active drying
      - < 5 GPP: Sub-optimal / restricted airflow or equilibrium reached
    """
    depression = round(inlet_gpp - exhaust_gpp, 1)
    if depression >= 15.0:
        efficiency = "Optimal"
    elif depression >= 5.0:
        efficiency = "Active"
    else:
        efficiency = "Sub-optimal / Check Airflow"

    return {
        "inletGPP": inlet_gpp,
        "exhaustGPP": exhaust_gpp,
        "grainDepression": depression,
        "efficiency": efficiency,
    }


# ADR Standard Rate Schedule (IICRC S500 / California Restoration Benchmark)
RATE_SCHEDULE: Dict[str, Dict[str, Any]] = {
    "standard_service_call": {
        "description": "Standard Service Call / Field Inspection",
        "unit": "EA",
        "rate": Decimal("350.00"),
    },
    "after_hours_service_call": {
        "description": "After-Hours Emergency Service Call",
        "unit": "EA",
        "rate": Decimal("525.00"),
    },
    "two_ft_flood_cut": {
        "description": "2-ft Flood Cut (Drywall + Batt Insulation Removal)",
        "unit": "LF",
        "rate": Decimal("14.50"),
    },
    "four_ft_flood_cut": {
        "description": "4-ft Flood Cut (Drywall + Batt Insulation Removal)",
        "unit": "LF",
        "rate": Decimal("22.00"),
    },
    "baseboard_removal": {
        "description": "Baseboard Removal & Debris Disposal",
        "unit": "LF",
        "rate": Decimal("2.85"),
    },
    "tile_flooring_demo": {
        "description": "Ceramic / Porcelain Tile Flooring Demolition to Slab",
        "unit": "SF",
        "rate": Decimal("8.50"),
    },
    "carpet_pad_pull": {
        "description": "Carpet & Wet Pad Extraction, Cut & Pull",
        "unit": "SF",
        "rate": Decimal("1.65"),
    },
    "vanity_detach_reset": {
        "description": "Vanity Cabinet Detach & Reset (with Collateral Waiver)",
        "unit": "EA",
        "rate": Decimal("285.00"),
    },
    "lgr_dehumidifier_day": {
        "description": "Low Grain Refrigerant (LGR) Dehumidifier Rental",
        "unit": "Day",
        "rate": Decimal("145.00"),
    },
    "air_mover_day": {
        "description": "Centrifugal Air Mover Rental (Floor / Cavity)",
        "unit": "Day",
        "rate": Decimal("38.00"),
    },
    "antimicrobial_spray": {
        "description": "Antimicrobial Botanical Spray Application (EPA Reg.)",
        "unit": "SF",
        "rate": Decimal("0.42"),
    },
    "vinyl_flooring_demo": {
        "description": "Vinyl / Linoleum Sheet Flooring Demolition to Subfloor",
        "unit": "SF",
        "rate": Decimal("3.50"),
    },
}

# Alert Flat Fee Tiers
TIER_TABLE: List[Tuple[Decimal, Decimal, str, str]] = [
    (
        Decimal("0.00"),
        Decimal("1499.00"),
        "Tier 1 - Minor Chamber Containment & Drying",
        "Minor single-room containment and light drying",
    ),
    (
        Decimal("1499.01"),
        Decimal("1999.00"),
        "Tier 2 - Standard Room Mitigation",
        "Standard room mitigation with 2-ft cuts and 3-day drying",
    ),
    (
        Decimal("1999.01"),
        Decimal("2499.00"),
        "Tier 3 - Multi-Room Loss & Heavy Demo",
        "Multi-room loss, vanity detach, tile demolition",
    ),
    (
        Decimal("2499.01"),
        Decimal("2799.00"),
        "Tier 4 - Extensive Structural Mitigation",
        "Extensive structural mitigation, heavy demo, Category 3 containment",
    ),
    (
        Decimal("2799.01"),
        Decimal("3999.00"),
        "Tier 5 - Heavy Multi-Chamber Mitigation",
        "Heavy multi-chamber mitigation, whole-structure drying, extensive demo",
    ),
]


def snap_to_tier(subtotal: Decimal) -> Dict[str, Any]:
    """Snaps calculated line item subtotal to Alert Disaster Restoration Flat Fee Tier."""
    if subtotal <= Decimal("1499.00"):
        return {
            "snappedTier": 1499.00,
            "tierName": "Tier 1 - Minor Chamber Containment & Drying",
            "tierDescription": "Minor single-room containment and light drying",
            "isCustomLargeLoss": False,
        }
    elif subtotal <= Decimal("1999.00"):
        return {
            "snappedTier": 1999.00,
            "tierName": "Tier 2 - Standard Room Mitigation",
            "tierDescription": "Standard room mitigation with 2-ft cuts and 3-day drying",
            "isCustomLargeLoss": False,
        }
    elif subtotal <= Decimal("2499.00"):
        return {
            "snappedTier": 2499.00,
            "tierName": "Tier 3 - Multi-Room Loss & Heavy Demo",
            "tierDescription": "Multi-room loss, vanity detach, tile demolition",
            "isCustomLargeLoss": False,
        }
    elif subtotal <= Decimal("2799.00"):
        return {
            "snappedTier": 2799.00,
            "tierName": "Tier 4 - Extensive Structural Mitigation",
            "tierDescription": "Extensive structural mitigation, heavy demo, Category 3 containment",
            "isCustomLargeLoss": False,
        }
    elif subtotal <= Decimal("3999.00"):
        return {
            "snappedTier": 3999.00,
            "tierName": "Tier 5 - Heavy Multi-Chamber Mitigation",
            "tierDescription": "Heavy multi-chamber mitigation, whole-structure drying, extensive demo",
            "isCustomLargeLoss": False,
        }
    else:
        # Large loss conversion
        subtotal_float = float(subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        return {
            "snappedTier": subtotal_float,
            "tierName": "Custom Large-Loss Itemized Contract",
            "tierDescription": "Loss scope exceeds Tier 5 standard flat-fee threshold; itemized billing applies",
            "isCustomLargeLoss": True,
        }


def calculate_pricing(scope_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses scope items, evaluates quantities against rate schedule,
    and returns deterministic line-item totals and snapped tier.
    """
    items = scope_payload.get("items", [])
    line_item_breakdown = []
    subtotal = Decimal("0.00")

    for item in items:
        item_key = item.get("key")
        qty_val = item.get("qty") if item.get("qty") is not None else item.get("quantity", 0)
        qty = Decimal(str(qty_val))
        days = Decimal(str(item.get("days", 1))) if ("days" in item and item.get("days") is not None) else Decimal("1")
        notes = item.get("notes", "")

        rate_info = RATE_SCHEDULE.get(item_key)
        if not rate_info:
            # Fallback for dynamic/custom rate if provided
            unit_rate = Decimal(str(item.get("unit_rate", 0)))
            unit = item.get("unit", "EA")
            desc = item.get("description", item_key)
        else:
            unit_rate = rate_info["rate"]
            unit = rate_info["unit"]
            desc = item.get("description") or rate_info["description"]

        # Multiply days if day-based equipment
        if unit == "Day":
            line_total = (qty * unit_rate * days).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            qty_display = f"{qty} units x {days} days"
        else:
            line_total = (qty * unit_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            qty_display = f"{qty} {unit}"

        subtotal += line_total
        line_item_breakdown.append({
            "key": item_key,
            "description": desc,
            "quantity": float(qty),
            "qty": float(qty),
            "days": int(days) if unit == "Day" else None,
            "unit": unit,
            "unitRate": float(unit_rate),
            "lineTotal": float(line_total),
            "notes": notes,
        })

    subtotal_rounded = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tier_info = snap_to_tier(subtotal_rounded)

    return {
        "lineItems": line_item_breakdown,
        "subtotal": float(subtotal_rounded),
        "financialTier": {
            "subtotal": float(subtotal_rounded),
            "snappedTier": tier_info["snappedTier"],
            "tierName": tier_info["tierName"],
            "tierDescription": tier_info["tierDescription"],
            "isCustomLargeLoss": tier_info["isCustomLargeLoss"],
        },
    }


def main():
    """CLI Entrypoint: Reads current_scope.json or specified path, outputs JSON."""
    input_file = Path("current_scope.json")
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])

    if not input_file.exists():
        empty_payload = {
            "items": [
                {"key": "standard_service_call", "qty": 1}
            ]
        }
        input_file.write_text(json.dumps(empty_payload, indent=2))

    with open(input_file, "r", encoding="utf-8") as f:
        scope_data = json.load(f)

    result = calculate_pricing(scope_data)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
