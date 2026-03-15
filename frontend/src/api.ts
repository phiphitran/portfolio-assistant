import type { AnalyzeResult, SimulateResult, WhatifResult } from './types'

// Use the Vite proxy: /api → http://localhost:8000
const BASE = '/api'

type ApiPortfolioItem = { ticker: string; weight: number }

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(
      typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail),
    )
  }
  return resp.json() as Promise<T>
}

/** Convert UI weight (0–100) to API weight (0.0–1.0). */
function toApiItems(items: ApiPortfolioItem[]): { ticker: string; weight: number }[] {
  return items.map((p) => ({ ticker: p.ticker, weight: p.weight / 100 }))
}

export async function analyzePortfolio(
  portfolio: ApiPortfolioItem[],
): Promise<AnalyzeResult> {
  return post('/portfolio/analyze', { portfolio: toApiItems(portfolio) })
}

export async function explainPortfolio(
  portfolio: ApiPortfolioItem[],
): Promise<{ explanation: string }> {
  return post('/portfolio/explain', { portfolio: toApiItems(portfolio) })
}

export async function simulatePortfolio(
  portfolio: ApiPortfolioItem[],
): Promise<SimulateResult> {
  return post('/portfolio/simulate', { portfolio: toApiItems(portfolio) })
}

export async function whatifSimulation(
  original: ApiPortfolioItem[],
  next: ApiPortfolioItem[],
): Promise<WhatifResult> {
  return post('/portfolio/whatif', {
    original: toApiItems(original.filter((p) => p.weight > 0)),
    new: toApiItems(next.filter((p) => p.weight > 0)),
  })
}
