import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipProps as RechartsTooltipProps } from 'recharts'
import type { PortfolioItem, PerformancePoint, WhatifResult } from '../types'

interface Props {
  portfolio: PortfolioItem[]
  baseline: PerformancePoint[]
  whatifResult: WhatifResult | null
  onRunWhatif: (newWeights: PortfolioItem[]) => void
  loading: boolean
  sliderWeights: PortfolioItem[]
  setSliderWeights: (w: PortfolioItem[]) => void
}

interface ChartPoint {
  date: string
  original?: number
  new?: number
}

// Thin the time series for chart readability (show ~60 points max)
function thin(series: PerformancePoint[], maxPoints = 60): PerformancePoint[] {
  if (series.length <= maxPoints) return series
  const step = Math.floor(series.length / maxPoints)
  return series.filter((_, i) => i % step === 0 || i === series.length - 1)
}

function buildChartData(
  baseline: PerformancePoint[],
  whatif: WhatifResult | null,
): ChartPoint[] {
  if (whatif) {
    const orig = thin(whatif.original_performance)
    const nxt = thin(whatif.new_performance)
    return orig.map((pt, i) => ({
      date: pt.date,
      original: pt.value,
      new: nxt[i]?.value,
    }))
  }
  return thin(baseline).map((pt) => ({ date: pt.date, original: pt.value }))
}

function formatDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, label }: RechartsTooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span className="capitalize">{p.name}</span>
          <span className="font-mono">{p.value?.toFixed(4) ?? ''}</span>
        </div>
      ))}
    </div>
  )
}

export function WhatIfSimulator({
  portfolio,
  baseline,
  whatifResult,
  onRunWhatif,
  loading,
  sliderWeights,
  setSliderWeights,
}: Props) {
  const total = sliderWeights.reduce((s, w) => s + w.weight, 0)
  const isValid = Math.abs(total - 100) < 1
  const chartData = buildChartData(baseline, whatifResult)
  const hasData = baseline.length > 0

  function updateWeight(ticker: string, value: number) {
    setSliderWeights(
      sliderWeights.map((w) =>
        w.ticker === ticker ? { ...w, weight: value } : w,
      ),
    )
  }

  // Final return value for a series (for gain/loss display)
  const origFinal = whatifResult?.original_performance.at(-1)?.value
  const newFinal = whatifResult?.new_performance.at(-1)?.value
  const origGain = origFinal !== undefined ? ((origFinal - 1) * 100).toFixed(1) : null
  const newGain = newFinal !== undefined ? ((newFinal - 1) * 100).toFixed(1) : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
      <h2 className="text-lg font-semibold text-white mb-1">What-If Simulator</h2>
      <p className="text-gray-500 text-xs mb-5">
        Adjust weights and compare against original allocation
      </p>

      {!hasData && (
        <div className="h-40 flex items-center justify-center text-gray-600 text-sm italic">
          Run "Analyze Portfolio" first to enable the simulator.
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sliders */}
          <div className="flex flex-col gap-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Adjust weights</div>
            {sliderWeights.map((w) => (
              <div key={w.ticker}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-mono text-gray-300">{w.ticker}</span>
                  <span className="text-sm text-blue-400 font-mono tabular-nums">{w.weight}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={w.weight}
                  onChange={(e) => updateWeight(w.ticker, Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                  <span>0</span>
                  <span>
                    Original:{' '}
                    {portfolio.find((p) => p.ticker === w.ticker)?.weight ?? 0}%
                  </span>
                </div>
              </div>
            ))}

            {/* Total indicator */}
            <div className={`text-xs font-mono mt-1 ${isValid ? 'text-green-400' : 'text-amber-400'}`}>
              Total: {total}% / 100%
            </div>

            <button
              onClick={() => onRunWhatif(sliderWeights)}
              disabled={!isValid || loading}
              className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              Compare
            </button>

            {/* Return summary */}
            {whatifResult && origGain !== null && newGain !== null && (
              <div className="space-y-2 mt-1">
                <ReturnBadge label="Original" gain={origGain} color="#6b7280" />
                <ReturnBadge label="New" gain={newGain} color="#3b82f6" />
              </div>
            )}
          </div>

          {/* Chart */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
              {whatifResult ? 'Performance comparison' : '3-year baseline'}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={50}
                />
                <Tooltip content={CustomTooltip} />
                {whatifResult && (
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="original"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray={whatifResult ? '5 3' : undefined}
                  dot={false}
                  activeDot={{ r: 3 }}
                  name="original"
                />
                {whatifResult && (
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="new"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function ReturnBadge({ label, gain, color }: { label: string; gain: string; color: string }) {
  const isPositive = parseFloat(gain) >= 0
  return (
    <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-1.5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <span className={`text-xs font-mono font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{gain}%
      </span>
    </div>
  )
}
