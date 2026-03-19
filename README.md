# Portfolio Copilot

> An AI-powered portfolio analysis tool built as a concept feature for SAVR.
> Helps users understand the risk and composition of their portfolio.

---

## What problem does it solve?

Most investors know *what* they own, but not *what it means*. A portfolio with NVDA, TSLA, and a global index fund looks diversified on the surface, but may carry concentrated sector risk, heavy geographic bias, or high volatility — and most platforms don't explain this clearly.

---

## Key Features

### 1. Portfolio Input (demo purpose)
Users enter their holdings — ticker symbols and percentage weights. The tool validates that weights sum to 100% before running any analysis.

**Supported assets:** US and Swedish stocks, global ETFs, healthcare, energy, and finance sectors.

---

### 2. Portfolio Exposure (Already exists)
After clicking **Analysera**, the tool shows four exposure cards that break down the portfolio across four dimensions:

| Card | What it shows |
|---|---|
| **Värdepapperstyper** | Mix of stocks, ETFs, funds, and cash — with a donut chart |
| **Länder** | Geographic spread by country, with flag icons and proportional bars |
| **Valutor** | Currency exposure (USD, SEK, DKK, GBP) |
| **Branscher** | Sector breakdown (Tech, Finance, Healthcare, etc.) |

Each bar scales relative to the largest position, making it easy to see at a glance which dimension dominates.

---

### 3. AI Insights ✦ *(core differentiator)*
Clicking **Förklara** sends the portfolio to an LLM, which generates a two-section analysis **in Swedish**, tailored to the user's exact holdings and weights.

**Section 1 — Portfolio Analysis**
- Identifies the main risk drivers (e.g. "NVDA and TSLA together make up 60% of the portfolio")
- Flags concentration risk and diversification gaps
- References specific tickers and percentages, not generic advice

**Section 2 — Att tänka på (Things to consider)**
- 2–3 actionable observations focused on *risk balance*, not return optimization
- Deliberately framed to avoid regulated investment advice
- Example: *"With 60% in US tech, consider whether this aligns with your risk tolerance if the sector corrects"*

The AI output is rendered with inline formatting (bold highlights, bullet points).

---

### 4. Scenario Simulator
The **Scenariosimulator** lets users interactively adjust their portfolio weights using sliders and run a historical backtest to compare performance.

**How it works:**
1. After running **Analysera**, sliders appear for each holding
2. The user adjusts weights (total must equal 100%)
3. Clicking **Jämför** runs a 3-year historical simulation of both the original and adjusted portfolios
4. A chart overlays both curves — original (dashed) vs. new (solid violet)

**Why it's useful for users:**
- Makes the trade-off between risk and return tangible: *"What if I had put less in NVDA and more in INVESTOR?"*
- The chart shows real historical data, not projections
- The final return of each scenario is shown as a percentage gain/loss

> Historical price data is sourced from Yahoo Finance. In a production integration, this would be replaced with SAVR's own price feeds.

---

## User Flow (end to end)

```
Enter holdings → Analysera → View exposure cards → Förklara → Read AI insights
                                                  → Adjust sliders → Jämför → Compare performance
```

---

## Running locally

**Backend**
```bash
cd savr_portfolio
uv run uvicorn backend.app.main:app --reload
```
Requires an `OPENAI_API_KEY` in a `.env` file for AI insights. Exposure cards and the simulator work without it.

**Frontend**
```bash
cd savr_portfolio/frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS + Recharts |
| Backend | Python + FastAPI |
| AI | OpenAI GPT-4o-mini |
| Market data | Yahoo Finance (yfinance) |

---

## Design

Built to match SAVR's existing design language: black background, violet accent color, pill navigation tabs. The goal is that it feels native to the SAVR app — not a prototype bolted on.
