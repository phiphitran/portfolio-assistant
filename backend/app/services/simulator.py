from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf


def _extract_close(raw: pd.DataFrame, tickers: list[str]) -> pd.DataFrame:
    """Extract closing prices into a flat DataFrame (tickers as columns)."""
    if raw.empty:
        return pd.DataFrame()
    if len(tickers) == 1:
        if "Close" in raw.columns:
            return raw[["Close"]].rename(columns={"Close": tickers[0]})
        return pd.DataFrame()
    # Multiple tickers: yfinance returns MultiIndex (field, ticker) with group_by='column'
    if isinstance(raw.columns, pd.MultiIndex) and "Close" in raw.columns.get_level_values(0):
        return raw["Close"]
    return pd.DataFrame()


def fetch_price_history(tickers: list[str], period: str = "3y") -> pd.DataFrame:
    """
    Download adjusted close prices for the given tickers.
    Returns a DataFrame indexed by date with tickers as columns.
    Missing tickers are silently dropped.
    """
    if not tickers:
        return pd.DataFrame()

    raw = yf.download(tickers, period=period, auto_adjust=True, progress=False, group_by='column')
    prices = _extract_close(raw, tickers)
    return prices.dropna(how="all")


def compute_portfolio_performance(
    prices: pd.DataFrame,
    weights: dict[str, float],
) -> list[dict[str, Any]]:
    """
    Given a price DataFrame and weight dict, return cumulative portfolio
    value as a list of {date, value} records (starting at 1.0).
    """
    available = [t for t in weights if t in prices.columns]
    if not available:
        return []

    # Drop tickers that have no data at all (all-NaN columns from failed fetches)
    sub = prices[available]
    available = [t for t in available if sub[t].notna().any()]
    if not available:
        return []

    sub = sub[available].dropna()
    w = np.array([weights[t] for t in available])
    w = w / w.sum()

    daily_returns = sub.pct_change().dropna()
    portfolio_returns = daily_returns.values @ w
    cumulative = (1 + portfolio_returns).cumprod()

    dates = daily_returns.index.strftime("%Y-%m-%d").tolist()
    return [{"date": d, "value": round(float(v), 6)} for d, v in zip(dates, cumulative)]


def simulate_portfolio(portfolio: list[dict[str, Any]], period: str = "3y") -> list[dict[str, Any]]:
    """Simulate a single portfolio and return its performance time series."""
    tickers = [item["ticker"].upper() for item in portfolio]
    weights = {item["ticker"].upper(): item["weight"] for item in portfolio}

    prices = fetch_price_history(tickers, period=period)
    return compute_portfolio_performance(prices, weights)


def simulate_whatif(
    original: list[dict[str, Any]],
    new: list[dict[str, Any]],
    period: str = "3y",
) -> dict[str, Any]:
    """
    Simulate both the original and new portfolios over the same price history.
    Returns a dict with original_performance and new_performance lists.
    """
    all_tickers = list(
        {item["ticker"].upper() for item in original + new}
    )
    prices = fetch_price_history(all_tickers, period=period)

    original_weights = {item["ticker"].upper(): item["weight"] for item in original}
    new_weights = {item["ticker"].upper(): item["weight"] for item in new}

    return {
        "original_performance": compute_portfolio_performance(prices, original_weights),
        "new_performance": compute_portfolio_performance(prices, new_weights),
    }
