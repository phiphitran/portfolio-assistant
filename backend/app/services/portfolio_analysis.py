import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

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


def compute_sector_diversity(sector_exposure: dict[str, float]) -> float:
    """Return 1 - HHI of sector weights (higher = more diverse)."""
    weights = list(sector_exposure.values())
    hhi = sum(w**2 for w in weights)
    return round(1.0 - hhi, 4)


def compute_volatility(
    portfolio: list[dict[str, Any]], period: str = "3y"
) -> float:
    """
    Fetch price history for all tickers, compute weighted portfolio volatility.
    Returns annualised volatility (0-1 scale, capped at 1.0).
    """
    tickers = [item["ticker"].upper() for item in portfolio]
    weights = np.array([item["weight"] for item in portfolio])

    try:
        raw = yf.download(tickers, period=period, auto_adjust=True, progress=False, group_by='column')

        if raw.empty:
            return 0.0

        # Extract flat Close DataFrame (tickers as columns)
        if len(tickers) == 1:
            prices = raw[["Close"]].rename(columns={"Close": tickers[0]}) if "Close" in raw.columns else None
        elif isinstance(raw.columns, pd.MultiIndex) and "Close" in raw.columns.get_level_values(0):
            prices = raw["Close"]
        else:
            prices = None

        if prices is None or prices.empty:
            return 0.0

        # Drop tickers that yfinance couldn't fetch or returned all-NaN data
        available = [t for t in tickers if t in prices.columns]
        available = [t for t in available if prices[t].notna().any()]
        if not available:
            return 0.0

        prices = prices[available].dropna()
        daily_returns = prices.pct_change().dropna()

        # Align weights to available tickers
        ticker_idx = {t: i for i, t in enumerate(tickers)}
        aligned_weights = np.array([weights[ticker_idx[t]] for t in available])

        # Re-normalise in case some tickers are missing
        aligned_weights = aligned_weights / aligned_weights.sum()

        portfolio_returns = daily_returns.values @ aligned_weights
        annual_vol = float(np.std(portfolio_returns) * math.sqrt(252))

        # Normalise: 0.5 → 1.0, cap at 1.0
        return round(min(annual_vol / 0.5, 1.0), 4)

    except Exception:
        return 0.0


def build_risk_radar(
    exposures: dict[str, Any],
    concentration: float,
    volatility: float,
) -> dict[str, float]:
    """Build the radar chart data structure."""
    sector_exposure = exposures["sector_exposure"]
    country_exposure = exposures["country_exposure"]

    tech_exposure = sector_exposure.get("tech", 0.0)
    us_exposure = country_exposure.get("US", 0.0)
    sector_diversity = compute_sector_diversity(sector_exposure)

    return {
        "tech_exposure": round(tech_exposure, 4),
        "us_exposure": round(us_exposure, 4),
        "concentration": round(concentration, 4),
        "sector_diversity": round(sector_diversity, 4),
        "volatility": round(volatility, 4),
    }
