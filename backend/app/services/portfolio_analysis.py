import json
from pathlib import Path
from typing import Any

_SECTOR_MAP_PATH = Path(__file__).parent.parent / "data" / "sector_mapping.json"
_UNKNOWN_INFO = {"sector": "unknown", "country": "unknown"}


def load_sector_map() -> dict[str, dict[str, str]]:
    with open(_SECTOR_MAP_PATH) as f:
        return json.load(f)


def compute_exposures(
    portfolio: list[dict[str, Any]],
    sector_map: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Return sector and country exposure dicts from portfolio weights."""
    sector_exposure: dict[str, float] = {}
    country_exposure: dict[str, float] = {}

    for item in portfolio:
        ticker = item["ticker"].upper()
        weight = item["weight"]
        info = sector_map.get(ticker, _UNKNOWN_INFO)

        sector = info["sector"]
        country = info["country"]

        sector_exposure[sector] = sector_exposure.get(sector, 0.0) + weight
        country_exposure[country] = country_exposure.get(country, 0.0) + weight

    return {
        "sector_exposure": sector_exposure,
        "country_exposure": country_exposure,
    }


def compute_concentration(portfolio: list[dict[str, Any]]) -> float:
    """Return the max single-asset weight (Herfindahl-style concentration)."""
    if not portfolio:
        return 0.0
    return max(item["weight"] for item in portfolio)
