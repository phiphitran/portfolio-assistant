import os
from typing import Any

from openai import OpenAI

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        _client = OpenAI(api_key=api_key)
    return _client


def _format_pct(value: float) -> str:
    return f"{value * 100:.0f}%"


def explain_portfolio(
    portfolio: list[dict[str, Any]],
    exposures: dict[str, Any],
    concentration: float,
    sector_map: dict[str, dict[str, str]],
) -> str:
    """
    Call OpenAI to generate a plain-language portfolio explanation.
    Returns a string with 3-6 bullet points.
    """
    holdings_str = ", ".join(
        f"{item['ticker']} {_format_pct(item['weight'])}" for item in portfolio
    )

    sector_exp = exposures.get("sector_exposure", {})
    country_exp = exposures.get("country_exposure", {})

    # Build per-sector and per-country ticker attribution
    sector_tickers: dict[str, list[str]] = {}
    country_tickers: dict[str, list[str]] = {}
    for item in portfolio:
        ticker = item["ticker"]
        weight = item["weight"]
        info = sector_map.get(ticker, {"sector": "unknown", "country": "unknown"})
        s, c = info["sector"], info["country"]
        sector_tickers.setdefault(s, []).append(f"{ticker} {_format_pct(weight)}")
        country_tickers.setdefault(c, []).append(f"{ticker} {_format_pct(weight)}")

    sector_str = "\n".join(
        f"  - {s.title()} {_format_pct(sector_exp[s])}: {', '.join(sector_tickers.get(s, []))}"
        for s in sorted(sector_exp, key=lambda k: -sector_exp[k])
    )
    country_str = "\n".join(
        f"  - {c} {_format_pct(country_exp[c])}: {', '.join(country_tickers.get(c, []))}"
        for c in sorted(country_exp, key=lambda k: -country_exp[k])
    )

    prompt = f"""You are an investment analyst. Explain the following portfolio in simple, clear language for a retail investor.

Portfolio: {holdings_str}

Sector breakdown (total allocation — contributing tickers):
{sector_str}

Country breakdown (total allocation — contributing tickers):
{country_str}

Concentration risk: largest single position is {_format_pct(concentration)}

Explain:
1. Main risks
2. Diversification level
3. Key insight about concentration

When mentioning a sector or country, always name the specific tickers that contribute to it.
Output exactly 3–6 bullet points. Each bullet should start with •. Be concise and actionable."""

    client = _get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()
