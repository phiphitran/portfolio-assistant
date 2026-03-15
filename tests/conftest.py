"""Shared fixtures for savr_portfolio tests."""
import numpy as np
import pandas as pd
import pytest


# ── Sample portfolios ─────────────────────────────────────────────────────────

@pytest.fixture
def simple_portfolio():
    """50/50 NVDA + INVESTOR portfolio (well-known tickers in sector map)."""
    return [
        {"ticker": "NVDA", "weight": 0.50},
        {"ticker": "INVESTOR", "weight": 0.50},
    ]


@pytest.fixture
def spec_portfolio():
    """The four-asset portfolio from the spec document."""
    return [
        {"ticker": "NVDA", "weight": 0.30},
        {"ticker": "TSLA", "weight": 0.20},
        {"ticker": "INVESTOR", "weight": 0.25},
        {"ticker": "ETF", "weight": 0.25},
    ]


@pytest.fixture
def sector_map():
    """Minimal sector map for unit tests (no file I/O needed)."""
    return {
        "NVDA": {"sector": "tech", "country": "US"},
        "TSLA": {"sector": "tech", "country": "US"},
        "INVESTOR": {"sector": "industrial", "country": "SE"},
        "ETF": {"sector": "mixed", "country": "global"},
        "AAPL": {"sector": "tech", "country": "US"},
    }


# ── Synthetic price data ──────────────────────────────────────────────────────

def _make_prices(tickers: list[str], n: int = 30, seed: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic price DataFrame for testing.
    Multi-ticker: MultiIndex columns (field, ticker), matching yfinance format.
    Single-ticker: single-level columns.
    """
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2023-01-01", periods=n)

    if len(tickers) == 1:
        # Single ticker — yfinance returns flat columns
        prices = 100 * np.exp(np.cumsum(rng.normal(0.0005, 0.015, n)))
        return pd.DataFrame({"Close": prices}, index=dates)

    # Multiple tickers — yfinance returns MultiIndex (field, ticker)
    data = {}
    for t in tickers:
        prices = 100 * np.exp(np.cumsum(rng.normal(0.0005, 0.015, n)))
        data[("Close", t)] = prices

    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns)
    return df


@pytest.fixture
def fake_prices_multi():
    """Synthetic multi-ticker price DataFrame (NVDA + INVESTOR)."""
    return _make_prices(["NVDA", "INVESTOR"])


@pytest.fixture
def fake_prices_single():
    """Synthetic single-ticker price DataFrame (NVDA only)."""
    return _make_prices(["NVDA"])


@pytest.fixture
def clean_prices_df():
    """
    A simple flat DataFrame of closing prices for use with
    compute_portfolio_performance (already processed — tickers as columns).
    """
    rng = np.random.default_rng(0)
    dates = pd.bdate_range("2023-01-01", periods=20)
    return pd.DataFrame(
        {
            "NVDA": 100 * np.exp(np.cumsum(rng.normal(0.001, 0.01, 20))),
            "INVESTOR": 50 * np.exp(np.cumsum(rng.normal(0.001, 0.01, 20))),
        },
        index=dates,
    )
