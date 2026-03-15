import { useState } from 'react'
import { Header } from './components/Header'
import { PortfolioInput } from './components/PortfolioInput'
import { AIInsights } from './components/AIInsights'
import { RiskRadar } from './components/RiskRadar'
import { WhatIfSimulator } from './components/WhatIfSimulator'
import {
  analyzePortfolio,
  explainPortfolio,
  simulatePortfolio,
  whatifSimulation,
} from './api'
import type {
  PortfolioItem,
  AnalyzeResult,
  PerformancePoint,
  WhatifResult,
} from './types'

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { ticker: 'NVDA', weight: 30 },
  { ticker: 'TSLA', weight: 20 },
  { ticker: 'INVESTOR', weight: 25 },
  { ticker: 'ETF', weight: 25 },
]

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO)
  const [sliderWeights, setSliderWeights] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO)

  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [baseline, setBaseline] = useState<PerformancePoint[]>([])
  const [explanation, setExplanation] = useState('')
  const [explainError, setExplainError] = useState('')
  const [whatifResult, setWhatifResult] = useState<WhatifResult | null>(null)

  const [loading, setLoading] = useState({
    analyze: false,
    explain: false,
    whatif: false,
  })
  const [analyzeError, setAnalyzeError] = useState('')

  async function handleAnalyze() {
    setLoading((l) => ({ ...l, analyze: true }))
    setAnalyzeError('')
    try {
      const [analysis, simulation] = await Promise.all([
        analyzePortfolio(portfolio),
        simulatePortfolio(portfolio),
      ])
      setAnalyzeResult(analysis)
      setBaseline(simulation.performance)
      setWhatifResult(null)
      setSliderWeights([...portfolio])
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading((l) => ({ ...l, analyze: false }))
    }
  }

  async function handleExplain() {
    setLoading((l) => ({ ...l, explain: true }))
    setExplanation('')
    setExplainError('')
    try {
      const result = await explainPortfolio(portfolio)
      setExplanation(result.explanation)
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : 'Explanation failed')
    } finally {
      setLoading((l) => ({ ...l, explain: false }))
    }
  }

  async function handleWhatif(newWeights: PortfolioItem[]) {
    setLoading((l) => ({ ...l, whatif: true }))
    try {
      const result = await whatifSimulation(portfolio, newWeights)
      setWhatifResult(result)
    } catch (e) {
      console.error('What-if failed:', e)
    } finally {
      setLoading((l) => ({ ...l, whatif: false }))
    }
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Header />

        {analyzeError && (
          <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {analyzeError}
          </div>
        )}

        <PortfolioInput
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          onAnalyze={handleAnalyze}
          onExplain={handleExplain}
          loadingAnalyze={loading.analyze}
          loadingExplain={loading.explain}
        />

        <AIInsights
          text={explanation}
          loading={loading.explain}
          error={explainError}
        />

        <RiskRadar
          radar={analyzeResult?.risk_radar ?? null}
          exposures={analyzeResult?.exposures ?? null}
          concentration={analyzeResult?.concentration ?? null}
        />

        <WhatIfSimulator
          portfolio={portfolio}
          baseline={baseline}
          whatifResult={whatifResult}
          onRunWhatif={handleWhatif}
          loading={loading.whatif}
          sliderWeights={sliderWeights}
          setSliderWeights={setSliderWeights}
        />
      </div>
    </div>
  )
}
