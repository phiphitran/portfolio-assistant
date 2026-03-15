"""Integration tests for the FastAPI routes via TestClient."""
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


# ── Shared payloads ───────────────────────────────────────────────────────────

SPEC_PAYLOAD = {
    "portfolio": [
        {"ticker": "NVDA", "weight": 0.30},
        {"ticker": "TSLA", "weight": 0.20},
        {"ticker": "INVESTOR", "weight": 0.25},
        {"ticker": "ETF", "weight": 0.25},
    ]
}

SIMPLE_PAYLOAD = {
    "portfolio": [
        {"ticker": "NVDA", "weight": 0.50},
        {"ticker": "INVESTOR", "weight": 0.50},
    ]
}

WHATIF_PAYLOAD = {
    "original": [
        {"ticker": "NVDA", "weight": 0.50},
        {"ticker": "INVESTOR", "weight": 0.50},
    ],
    "new": [
        {"ticker": "NVDA", "weight": 0.20},
        {"ticker": "INVESTOR", "weight": 0.80},
    ],
}


def _fake_multi_prices():
    """Return a synthetic multi-ticker price DataFrame shaped like yfinance output."""
    import numpy as np
    rng = np.random.default_rng(42)
    dates = pd.bdate_range("2023-01-01", periods=30)
    tickers = ["NVDA", "TSLA", "INVESTOR", "ETF"]
    data = {}
    for t in tickers:
        data[("Close", t)] = 100 * (1 + rng.normal(0.001, 0.01, 30).cumsum())
    df = pd.DataFrame(data, index=dates)
    df.columns = pd.MultiIndex.from_tuples(df.columns)
    return df


# ── POST /portfolio/analyze ───────────────────────────────────────────────────

class TestAnalyzeEndpoint:
    def test_200_with_valid_portfolio(self):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=SPEC_PAYLOAD)
        assert resp.status_code == 200

    def test_response_has_required_keys(self):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=SPEC_PAYLOAD)
        body = resp.json()
        assert "exposures" in body
        assert "concentration" in body
        assert "risk_radar" in body

    def test_radar_has_all_fields(self):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=SPEC_PAYLOAD)
        radar = resp.json()["risk_radar"]
        for key in ("tech_exposure", "us_exposure", "concentration", "sector_diversity", "volatility"):
            assert key in radar, f"Missing radar key: {key}"

    def test_exposures_keys(self):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=SPEC_PAYLOAD)
        exposures = resp.json()["exposures"]
        assert "sector_exposure" in exposures
        assert "country_exposure" in exposures

    def test_ticker_case_insensitive(self):
        payload = {"portfolio": [{"ticker": "nvda", "weight": 0.5}, {"ticker": "tsla", "weight": 0.5}]}
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=payload)
        assert resp.status_code == 200

    def test_422_when_weights_dont_sum_to_one(self):
        bad = {
            "portfolio": [
                {"ticker": "NVDA", "weight": 0.30},
                {"ticker": "TSLA", "weight": 0.30},  # sum = 0.60
            ]
        }
        resp = client.post("/portfolio/analyze", json=bad)
        assert resp.status_code == 422

    def test_422_when_more_than_20_assets(self):
        many = {
            "portfolio": [{"ticker": f"TICK{i}", "weight": 1 / 21} for i in range(21)]
        }
        resp = client.post("/portfolio/analyze", json=many)
        assert resp.status_code == 422

    def test_422_when_weight_is_zero(self):
        bad = {"portfolio": [{"ticker": "NVDA", "weight": 0.0}, {"ticker": "TSLA", "weight": 1.0}]}
        resp = client.post("/portfolio/analyze", json=bad)
        assert resp.status_code == 422

    def test_422_when_weight_exceeds_one(self):
        bad = {"portfolio": [{"ticker": "NVDA", "weight": 1.5}]}
        resp = client.post("/portfolio/analyze", json=bad)
        assert resp.status_code == 422

    def test_422_when_portfolio_is_empty(self):
        resp = client.post("/portfolio/analyze", json={"portfolio": []})
        # Empty portfolio sums to 0, not 1 → validation error
        assert resp.status_code == 422

    def test_concentration_equals_max_weight(self):
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=SPEC_PAYLOAD)
        assert resp.json()["concentration"] == pytest.approx(0.30)

    def test_weights_within_tolerance_accepted(self):
        """Weights summing to 0.999 (within 0.01 tolerance) should pass."""
        payload = {
            "portfolio": [
                {"ticker": "NVDA", "weight": 0.499},
                {"ticker": "TSLA", "weight": 0.500},
            ]
        }
        with patch("backend.app.services.portfolio_analysis.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/analyze", json=payload)
        assert resp.status_code == 200


# ── POST /portfolio/explain ───────────────────────────────────────────────────

class TestExplainEndpoint:
    def _mock_openai(self, text: str = "• Risk: high tech exposure\n• Diversification: low"):
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=text))]
        )
        return mock_client

    def test_200_with_valid_portfolio(self):
        mock_client = self._mock_openai()
        with patch("backend.app.services.ai_explainer._client", mock_client):
            resp = client.post("/portfolio/explain", json=SIMPLE_PAYLOAD)
        assert resp.status_code == 200

    def test_response_contains_explanation_key(self):
        mock_client = self._mock_openai()
        with patch("backend.app.services.ai_explainer._client", mock_client):
            resp = client.post("/portfolio/explain", json=SIMPLE_PAYLOAD)
        assert "explanation" in resp.json()

    def test_explanation_is_string(self):
        expected = "• Main risk: tech concentration\n• Diversification: low"
        mock_client = self._mock_openai(expected)
        with patch("backend.app.services.ai_explainer._client", mock_client):
            resp = client.post("/portfolio/explain", json=SIMPLE_PAYLOAD)
        assert isinstance(resp.json()["explanation"], str)
        assert resp.json()["explanation"] == expected

    def test_503_when_no_api_key(self):
        with patch("backend.app.services.ai_explainer._client", None), \
             patch("backend.app.services.ai_explainer.os.environ.get", return_value=None):
            resp = client.post("/portfolio/explain", json=SIMPLE_PAYLOAD)
        assert resp.status_code == 503

    def test_422_invalid_portfolio(self):
        bad = {"portfolio": [{"ticker": "NVDA", "weight": 0.6}]}  # doesn't sum to 1
        resp = client.post("/portfolio/explain", json=bad)
        assert resp.status_code == 422


# ── POST /portfolio/simulate ──────────────────────────────────────────────────

class TestSimulateEndpoint:
    def test_200_with_valid_portfolio(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/simulate", json=SPEC_PAYLOAD)
        assert resp.status_code == 200

    def test_response_has_performance_key(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/simulate", json=SPEC_PAYLOAD)
        assert "performance" in resp.json()

    def test_performance_is_list(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/simulate", json=SPEC_PAYLOAD)
        assert isinstance(resp.json()["performance"], list)

    def test_each_entry_has_date_and_value(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/simulate", json=SPEC_PAYLOAD)
        for entry in resp.json()["performance"]:
            assert "date" in entry
            assert "value" in entry

    def test_422_when_yfinance_returns_nothing(self):
        with patch("backend.app.services.simulator.yf.download", return_value=pd.DataFrame()):
            resp = client.post("/portfolio/simulate", json=SIMPLE_PAYLOAD)
        assert resp.status_code == 422

    def test_422_invalid_weights(self):
        bad = {"portfolio": [{"ticker": "NVDA", "weight": 0.99}]}
        resp = client.post("/portfolio/simulate", json=bad)
        assert resp.status_code == 422


# ── POST /portfolio/whatif ────────────────────────────────────────────────────

class TestWhatifEndpoint:
    def test_200_with_valid_request(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        assert resp.status_code == 200

    def test_response_has_both_performance_keys(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        body = resp.json()
        assert "original_performance" in body
        assert "new_performance" in body

    def test_both_series_are_lists(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        body = resp.json()
        assert isinstance(body["original_performance"], list)
        assert isinstance(body["new_performance"], list)

    def test_series_same_length(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        body = resp.json()
        assert len(body["original_performance"]) == len(body["new_performance"])

    def test_422_when_original_weights_invalid(self):
        bad = {
            "original": [{"ticker": "NVDA", "weight": 0.3}],  # doesn't sum to 1
            "new": [{"ticker": "NVDA", "weight": 1.0}],
        }
        resp = client.post("/portfolio/whatif", json=bad)
        assert resp.status_code == 422

    def test_422_when_new_weights_invalid(self):
        bad = {
            "original": [{"ticker": "NVDA", "weight": 1.0}],
            "new": [{"ticker": "NVDA", "weight": 0.4}],  # doesn't sum to 1
        }
        resp = client.post("/portfolio/whatif", json=bad)
        assert resp.status_code == 422

    def test_422_when_yfinance_returns_nothing(self):
        with patch("backend.app.services.simulator.yf.download", return_value=pd.DataFrame()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        assert resp.status_code == 422

    def test_different_weights_produce_different_series(self):
        with patch("backend.app.services.simulator.yf.download", return_value=_fake_multi_prices()):
            resp = client.post("/portfolio/whatif", json=WHATIF_PAYLOAD)
        body = resp.json()
        orig = [r["value"] for r in body["original_performance"]]
        new = [r["value"] for r in body["new_performance"]]
        assert orig != new


# ── GET / (health check) ──────────────────────────────────────────────────────

class TestRootEndpoint:
    def test_root_returns_ok(self):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
