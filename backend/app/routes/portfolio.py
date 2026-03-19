from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from ..services import ai_explainer, portfolio_analysis, simulator

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class PortfolioItem(BaseModel):
    ticker: str
    weight: float

    @field_validator("ticker")
    @classmethod
    def ticker_must_be_string(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("ticker must be a non-empty string")
        return v.strip().upper()

    @field_validator("weight")
    @classmethod
    def weight_must_be_positive(cls, v: float) -> float:
        if v <= 0 or v > 1:
            raise ValueError("weight must be between 0 (exclusive) and 1 (inclusive)")
        return v


class PortfolioRequest(BaseModel):
    portfolio: list[PortfolioItem]

    @model_validator(mode="after")
    def validate_portfolio(self) -> "PortfolioRequest":
        if len(self.portfolio) > 20:
            raise ValueError("Portfolio may contain at most 20 assets")
        total = sum(item.weight for item in self.portfolio)
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0 (got {total:.4f})")
        return self


class WhatIfRequest(BaseModel):
    original: list[PortfolioItem]
    new: list[PortfolioItem]

    @model_validator(mode="after")
    def validate_both(self) -> "WhatIfRequest":
        for name, portfolio in [("original", self.original), ("new", self.new)]:
            if len(portfolio) > 20:
                raise ValueError(f"'{name}' portfolio may contain at most 20 assets")
            total = sum(item.weight for item in portfolio)
            if abs(total - 1.0) > 0.01:
                raise ValueError(f"'{name}' weights must sum to 1.0 (got {total:.4f})")
        return self


# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_raw(portfolio: list[PortfolioItem]) -> list[dict[str, Any]]:
    return [{"ticker": item.ticker, "weight": item.weight} for item in portfolio]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/analyze")
def analyze_portfolio(request: PortfolioRequest) -> dict[str, Any]:
    """
    Compute sector/country exposures, concentration, volatility and radar data.
    """
    raw = _to_raw(request.portfolio)
    sector_map = portfolio_analysis.load_sector_map()

    exposures = portfolio_analysis.compute_exposures(raw, sector_map)

    return {"exposures": exposures}


@router.post("/explain")
def explain_portfolio(request: PortfolioRequest) -> dict[str, Any]:
    """
    Generate an AI explanation of the portfolio using OpenAI.
    """
    raw = _to_raw(request.portfolio)
    sector_map = portfolio_analysis.load_sector_map()

    exposures = portfolio_analysis.compute_exposures(raw, sector_map)
    concentration = portfolio_analysis.compute_concentration(raw)

    try:
        explanation = ai_explainer.explain_portfolio(raw, exposures, concentration, sector_map)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    return {"explanation": explanation}


@router.post("/simulate")
def simulate_portfolio(request: PortfolioRequest) -> dict[str, Any]:
    """
    Simulate historical portfolio performance and return a time series.
    """
    raw = _to_raw(request.portfolio)
    performance = simulator.simulate_portfolio(raw)

    if not performance:
        raise HTTPException(
            status_code=422,
            detail="Could not fetch price history for the provided tickers.",
        )

    return {"performance": performance}


@router.post("/whatif")
def whatif_simulation(request: WhatIfRequest) -> dict[str, Any]:
    """
    Compare original vs new portfolio weights on historical data.
    """
    original_raw = _to_raw(request.original)
    new_raw = _to_raw(request.new)

    result = simulator.simulate_whatif(original_raw, new_raw)

    if not result["original_performance"] and not result["new_performance"]:
        raise HTTPException(
            status_code=422,
            detail="Could not fetch price history for the provided tickers.",
        )

    return result
