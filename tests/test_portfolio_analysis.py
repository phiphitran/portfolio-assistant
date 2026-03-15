"""Unit tests for backend.app.services.portfolio_analysis."""
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from backend.app.services.portfolio_analysis import (
    build_risk_radar,
    compute_concentration,
    compute_exposures,
    compute_sector_diversity,
    compute_volatility,
    load_sector_map,
)


# ── load_sector_map ───────────────────────────────────────────────────────────

class TestLoadSectorMap:
    def test_returns_dict(self):
        result = load_sector_map()
        assert isinstance(result, dict)

    def test_contains_known_tickers(self):
        result = load_sector_map()
        for ticker in ("NVDA", "TSLA", "INVESTOR", "ETF"):
            assert ticker in result

    def test_each_entry_has_sector_and_country(self):
        result = load_sector_map()
        for ticker, info in result.items():
            assert "sector" in info, f"{ticker} missing 'sector'"
            assert "country" in info, f"{ticker} missing 'country'"


# ── compute_exposures ─────────────────────────────────────────────────────────

class TestComputeExposures:
    def test_sector_aggregation(self, simple_portfolio, sector_map):
        result = compute_exposures(simple_portfolio, sector_map)
        assert result["sector_exposure"]["tech"] == pytest.approx(0.50)
        assert result["sector_exposure"]["industrial"] == pytest.approx(0.50)

    def test_country_aggregation(self, simple_portfolio, sector_map):
        result = compute_exposures(simple_portfolio, sector_map)
        assert result["country_exposure"]["US"] == pytest.approx(0.50)
        assert result["country_exposure"]["SE"] == pytest.approx(0.50)

    def test_spec_portfolio_exposures(self, spec_portfolio, sector_map):
        result = compute_exposures(spec_portfolio, sector_map)
        # NVDA + TSLA are both tech → 0.50
        assert result["sector_exposure"]["tech"] == pytest.approx(0.50)
        # industrial: INVESTOR 25%
        assert result["sector_exposure"]["industrial"] == pytest.approx(0.25)
        # mixed: ETF 25%
        assert result["sector_exposure"]["mixed"] == pytest.approx(0.25)

    def test_unknown_ticker_falls_back_to_unknown(self, sector_map):
        portfolio = [{"ticker": "XYZFAKE", "weight": 1.0}]
        result = compute_exposures(portfolio, sector_map)
        assert result["sector_exposure"]["unknown"] == pytest.approx(1.0)
        assert result["country_exposure"]["unknown"] == pytest.approx(1.0)

    def test_ticker_normalised_to_uppercase(self, sector_map):
        portfolio = [{"ticker": "nvda", "weight": 1.0}]
        result = compute_exposures(portfolio, sector_map)
        assert "tech" in result["sector_exposure"]

    def test_returns_correct_keys(self, simple_portfolio, sector_map):
        result = compute_exposures(simple_portfolio, sector_map)
        assert set(result.keys()) == {"sector_exposure", "country_exposure"}


# ── compute_concentration ─────────────────────────────────────────────────────

class TestComputeConcentration:
    def test_returns_max_weight(self, spec_portfolio):
        result = compute_concentration(spec_portfolio)
        assert result == pytest.approx(0.30)

    def test_single_asset(self):
        portfolio = [{"ticker": "NVDA", "weight": 1.0}]
        assert compute_concentration(portfolio) == pytest.approx(1.0)

    def test_equal_weights(self):
        portfolio = [{"ticker": t, "weight": 0.25} for t in ["A", "B", "C", "D"]]
        assert compute_concentration(portfolio) == pytest.approx(0.25)

    def test_empty_portfolio_returns_zero(self):
        assert compute_concentration([]) == pytest.approx(0.0)


# ── compute_sector_diversity ──────────────────────────────────────────────────

class TestComputeSectorDiversity:
    def test_single_sector_fully_concentrated(self):
        # HHI = 1.0, diversity = 0.0
        result = compute_sector_diversity({"tech": 1.0})
        assert result == pytest.approx(0.0)

    def test_two_equal_sectors(self):
        # HHI = 0.25 + 0.25 = 0.5, diversity = 0.5
        result = compute_sector_diversity({"tech": 0.5, "industrial": 0.5})
        assert result == pytest.approx(0.5)

    def test_four_equal_sectors(self):
        # HHI = 4 * 0.0625 = 0.25, diversity = 0.75
        sectors = {s: 0.25 for s in ["tech", "industrial", "healthcare", "finance"]}
        result = compute_sector_diversity(sectors)
        assert result == pytest.approx(0.75)

    def test_higher_diversity_for_more_sectors(self):
        two = compute_sector_diversity({"a": 0.5, "b": 0.5})
        four = compute_sector_diversity({s: 0.25 for s in "abcd"})
        assert four > two


# ── build_risk_radar ──────────────────────────────────────────────────────────

class TestBuildRiskRadar:
    def test_returns_all_radar_keys(self, spec_portfolio, sector_map):
        exposures = compute_exposures(spec_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.30, volatility=0.4)
        expected_keys = {"tech_exposure", "us_exposure", "concentration", "sector_diversity", "volatility"}
        assert set(radar.keys()) == expected_keys

    def test_tech_exposure_correct(self, spec_portfolio, sector_map):
        exposures = compute_exposures(spec_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.30, volatility=0.0)
        assert radar["tech_exposure"] == pytest.approx(0.50)

    def test_us_exposure_correct(self, spec_portfolio, sector_map):
        exposures = compute_exposures(spec_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.30, volatility=0.0)
        # NVDA (US 30%) + TSLA (US 20%) = 50%
        assert radar["us_exposure"] == pytest.approx(0.50)

    def test_concentration_passed_through(self, simple_portfolio, sector_map):
        exposures = compute_exposures(simple_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.70, volatility=0.0)
        assert radar["concentration"] == pytest.approx(0.70)

    def test_volatility_passed_through(self, simple_portfolio, sector_map):
        exposures = compute_exposures(simple_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.5, volatility=0.55)
        assert radar["volatility"] == pytest.approx(0.55)

    def test_all_values_between_zero_and_one(self, spec_portfolio, sector_map):
        exposures = compute_exposures(spec_portfolio, sector_map)
        radar = build_risk_radar(exposures, concentration=0.30, volatility=0.3)
        for key, val in radar.items():
            assert 0.0 <= val <= 1.0, f"{key}={val} out of [0, 1]"


# ── compute_volatility ────────────────────────────────────────────────────────

class TestComputeVolatility:
    def _make_yf_response(self, tickers: list[str], n: int = 100) -> pd.DataFrame:
        """Build a synthetic yfinance-shaped DataFrame."""
        rng = np.random.default_rng(1)
        dates = pd.bdate_range("2022-01-01", periods=n)

        if len(tickers) == 1:
            prices = 100 * (1 + np.cumsum(rng.normal(0.0005, 0.015, n)))
            return pd.DataFrame({"Close": prices}, index=dates)

        data = {}
        for t in tickers:
            data[("Close", t)] = 100 * (1 + np.cumsum(rng.normal(0.0005, 0.015, n)))
        df = pd.DataFrame(data, index=dates)
        df.columns = pd.MultiIndex.from_tuples(df.columns)
        return df

    def test_returns_float_between_zero_and_one(self, simple_portfolio):
        fake_df = self._make_yf_response(["NVDA", "INVESTOR"])
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=fake_df):
            result = compute_volatility(simple_portfolio)
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0

    def test_returns_zero_on_empty_dataframe(self, simple_portfolio):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=pd.DataFrame()):
            result = compute_volatility(simple_portfolio)
        assert result == 0.0

    def test_returns_zero_on_exception(self, simple_portfolio):
        with patch("backend.app.services.portfolio_analysis.yf.download", side_effect=Exception("network error")):
            result = compute_volatility(simple_portfolio)
        assert result == 0.0

    def test_single_ticker(self):
        portfolio = [{"ticker": "NVDA", "weight": 1.0}]
        fake_df = self._make_yf_response(["NVDA"])
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=fake_df):
            result = compute_volatility(portfolio)
        assert 0.0 <= result <= 1.0

    def test_higher_volatility_for_noisier_data(self, simple_portfolio):
        rng = np.random.default_rng(7)
        dates = pd.bdate_range("2022-01-01", periods=100)
        n = 100

        def make_multi(scale):
            data = {}
            for t in ["NVDA", "INVESTOR"]:
                data[("Close", t)] = 100 * (1 + np.cumsum(rng.normal(0.0005, scale, n)))
            df = pd.DataFrame(data, index=dates)
            df.columns = pd.MultiIndex.from_tuples(df.columns)
            return df

        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=make_multi(0.005)):
            low_vol = compute_volatility(simple_portfolio)
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=make_multi(0.04)):
            high_vol = compute_volatility(simple_portfolio)

        assert high_vol >= low_vol
