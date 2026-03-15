import type { PortfolioItem } from '../types'

interface Props {
  portfolio: PortfolioItem[]
  setPortfolio: (p: PortfolioItem[]) => void
  onAnalyze: () => void
  onExplain: () => void
  loadingAnalyze: boolean
  loadingExplain: boolean
}

export function PortfolioInput({
  portfolio,
  setPortfolio,
  onAnalyze,
  onExplain,
  loadingAnalyze,
  loadingExplain,
}: Props) {
  const total = portfolio.reduce((s, p) => s + p.weight, 0)
  const isValid = Math.abs(total - 100) < 1 && portfolio.length > 0
  const isValidAndNotEmpty = isValid && portfolio.every((p) => p.ticker.trim() !== '')

  function updateRow(i: number, field: keyof PortfolioItem, value: string) {
    const next = [...portfolio]
    if (field === 'weight') {
      next[i] = { ...next[i]!, weight: Math.max(0, Math.min(100, Number(value))) }
    } else {
      next[i] = { ...next[i]!, ticker: value.toUpperCase() }
    }
    setPortfolio(next)
  }

  function addRow() {
    setPortfolio([...portfolio, { ticker: '', weight: 0 }])
  }

  function removeRow(i: number) {
    setPortfolio(portfolio.filter((_, idx) => idx !== i))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
      <h2 className="text-lg font-semibold text-white mb-4">Portfolio</h2>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_40px] gap-2 mb-2 px-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weight %</span>
        <span />
      </div>

      {/* Rows */}
      <div className="space-y-2 mb-4">
        {portfolio.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-2 items-center">
            <input
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="NVDA"
              value={p.ticker}
              onChange={(e) => updateRow(i, 'ticker', e.target.value)}
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm pr-7 focus:outline-none focus:border-blue-500 transition-colors"
                value={p.weight}
                onChange={(e) => updateRow(i, 'weight', e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">%</span>
            </div>
            <button
              onClick={() => removeRow(i)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Weight total indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${total > 100 ? 'bg-red-500' : total === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-mono tabular-nums ${total === 100 ? 'text-green-400' : total > 100 ? 'text-red-400' : 'text-gray-400'}`}>
          {total}% / 100%
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={addRow}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700"
        >
          + Add Asset
        </button>

        <button
          onClick={onAnalyze}
          disabled={!isValidAndNotEmpty || loadingAnalyze}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loadingAnalyze && <Spinner />}
          Analyze Portfolio
        </button>

        <button
          onClick={onExplain}
          disabled={!isValidAndNotEmpty || loadingExplain}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loadingExplain && <Spinner />}
          ✦ Explain Portfolio
        </button>
      </div>

      {!isValid && portfolio.length > 0 && (
        <p className="text-xs text-amber-500 mt-3">
          Weights must sum to exactly 100% before analyzing.
        </p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
