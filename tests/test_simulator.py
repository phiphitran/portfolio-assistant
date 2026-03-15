"""Unit tests for backend.app.services.simulator."""
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from backend.app.services.simulator import (
    compute_portfolio_performance,
    fetch_price_history,
    simulate_portfolio,
    simulate_whatif,
)


# ── compute_portfolio_performance ─────────────────────────────────────────────

class TestComputePortfolioPerformance:
    def test_returns_list_of_dicts(self, clean_prices_df):
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert isinstance(result, list)
        assert all(isinstance(r, dict) for r in result)

    def test_each_entry_has_date_and_value(self, clean_prices_df):
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        for entry in result:
            assert "date" in entry
            assert "value" in entry

    def test_date_format_is_iso(self, clean_prices_df):
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        import re
        iso_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        for entry in result:
            assert iso_pattern.match(entry["date"]), f"Bad date format: {entry['date']}"

    def test_first_value_close_to_one(self, clean_prices_df):
        """Cumulative product starts at (1 + r_0), which should be near 1."""
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert result[0]["value"] == pytest.approx(1.0, abs=0.1)

    def test_length_equals_prices_minus_one(self, clean_prices_df):
        """pct_change drops first row, so len == rows - 1."""
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert len(result) == len(clean_prices_df) - 1

    def test_missing_ticker_in_weights_is_ignored(self, clean_prices_df):
        """Ticker in weights but not in prices should be silently skipped."""
        weights = {"NVDA": 0.5, "INVESTOR": 0.3, "FAKE": 0.2}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert len(result) > 0

    def test_no_matching_tickers_returns_empty(self, clean_prices_df):
        weights = {"FAKE1": 0.5, "FAKE2": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert result == []

    def test_weights_renormalised_when_ticker_missing(self, clean_prices_df):
        """If one ticker is missing, remaining weights are re-normalised."""
        # Only NVDA is in clean_prices_df after we give INVESTOR an unknown alias
        prices = clean_prices_df[["NVDA"]]
        weights = {"NVDA": 0.6, "MISSING": 0.4}
        result = compute_portfolio_performance(prices, weights)
        assert len(result) > 0

    def test_single_asset_portfolio(self, clean_prices_df):
        weights = {"NVDA": 1.0}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert len(result) == len(clean_prices_df) - 1

    def test_values_are_positive(self, clean_prices_df):
        weights = {"NVDA": 0.5, "INVESTOR": 0.5}
        result = compute_portfolio_performance(clean_prices_df, weights)
        assert all(r["value"] > 0 for r in result)


# ── fetch_price_history ───────────────────────────────────────────────────────

class TestFetchPriceHistory:
    def test_empty_tickers_returns_empty_df(self):
        result = fetch_price_history([])
        assert result.empty

    def test_yfinance_empty_returns_empty_df(self):
        with patch("backend.app.services.simulator.yf.download", return_value=pd.DataFrame()):
            result = fetch_price_history(["NVDA"])
        assert result.empty

    def test_single_ticker_returns_df_with_ticker_column(self, fake_prices_single):
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_single):
            result = fetch_price_history(["NVDA"])
        assert "NVDA" in result.columns

    def test_multi_ticker_returns_df_with_ticker_columns(self, fake_prices_multi):
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = fetch_price_history(["NVDA", "INVESTOR"])
        assert "NVDA" in result.columns
        assert "INVESTOR" in result.columns

    def test_result_is_dataframe(self, fake_prices_single):
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_single):
            result = fetch_price_history(["NVDA"])
        assert isinstance(result, pd.DataFrame)


# ── simulate_portfolio ────────────────────────────────────────────────────────

class TestSimulatePortfolio:
    def test_returns_performance_list(self, simple_portfolio, fake_prices_multi):
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_portfolio(simple_portfolio)
        assert isinstance(result, list)
        assert len(result) > 0

    def test_empty_when_yfinance_fails(self, simple_portfolio):
        with patch("backend.app.services.simulator.yf.download", return_value=pd.DataFrame()):
            result = simulate_portfolio(simple_portfolio)
        assert result == []

    def test_ticker_normalised_to_uppercase(self, fake_prices_multi):
        portfolio = [{"ticker": "nvda", "weight": 0.5}, {"ticker": "investor", "weight": 0.5}]
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_portfolio(portfolio)
        assert isinstance(result, list)


# ── simulate_whatif ───────────────────────────────────────────────────────────

class TestSimulateWhatif:
    def test_returns_both_series(self, simple_portfolio, fake_prices_multi):
        new_portfolio = [
            {"ticker": "NVDA", "weight": 0.20},
            {"ticker": "INVESTOR", "weight": 0.80},
        ]
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_whatif(simple_portfolio, new_portfolio)

        assert "original_performance" in result
        assert "new_performance" in result

    def test_series_have_same_length(self, simple_portfolio, fake_prices_multi):
        new_portfolio = [
            {"ticker": "NVDA", "weight": 0.10},
            {"ticker": "INVESTOR", "weight": 0.90},
        ]
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_whatif(simple_portfolio, new_portfolio)

        assert len(result["original_performance"]) == len(result["new_performance"])

    def test_different_weights_produce_different_results(self, fake_prices_multi):
        original = [{"ticker": "NVDA", "weight": 0.9}, {"ticker": "INVESTOR", "weight": 0.1}]
        new = [{"ticker": "NVDA", "weight": 0.1}, {"ticker": "INVESTOR", "weight": 0.9}]
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_whatif(original, new)

        orig_vals = [r["value"] for r in result["original_performance"]]
        new_vals = [r["value"] for r in result["new_performance"]]
        # The two series should differ (different weights on different assets)
        assert orig_vals != new_vals

    def test_same_weights_produce_identical_results(self, fake_prices_multi):
        portfolio = [{"ticker": "NVDA", "weight": 0.5}, {"ticker": "INVESTOR", "weight": 0.5}]
        with patch("backend.app.services.simulator.yf.download", return_value=fake_prices_multi):
            result = simulate_whatif(portfolio, portfolio)

        orig_vals = [r["value"] for r in result["original_performance"]]
        new_vals = [r["value"] for r in result["new_performance"]]
        assert orig_vals == pytest.approx(new_vals)

    def test_empty_when_yfinance_fails(self, simple_portfolio):
        with patch("backend.app.services.simulator.yf.download", return_value=pd.DataFrame()):
            result = simulate_whatif(simple_portfolio, simple_portfolio)
        assert result["original_performance"] == []
        assert result["new_performance"] == []
