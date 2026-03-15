export interface PortfolioItem {
  ticker: string
  weight: number // 0–100 (percentage in UI), converted to 0–1 for API
}

export interface Exposures {
  sector_exposure: Record<string, number>
  country_exposure: Record<string, number>
}

export interface RiskRadar {
  tech_exposure: number
  us_exposure: number
  concentration: number
  sector_diversity: number
  volatility: number
}

export interface AnalyzeResult {
  exposures: Exposures
  concentration: number
  risk_radar: RiskRadar
}

export interface PerformancePoint {
  date: string
  value: number
}

export interface SimulateResult {
  performance: PerformancePoint[]
}

export interface WhatifResult {
  original_performance: PerformancePoint[]
  new_performance: PerformancePoint[]
}

export interface LoadingState {
  analyze: boolean
  explain: boolean
  whatif: boolean
}
