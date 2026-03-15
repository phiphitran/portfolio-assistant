import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { TooltipProps as RechartsTooltipProps } from 'recharts'
import type { RiskRadar as RiskRadarData, Exposures } from '../types'

interface Props {
  radar: RiskRadarData | null
  exposures: Exposures | null
  concentration: number | null
}

// ── Dimension metadata ────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'medium' | 'high'

interface DimensionMeta {
  label: string
  shortLabel: string
  description: string
  interpret: (v: number) => string
  riskLevel: (v: number) => RiskLevel
  higherIsBetter: boolean
}

const DIMENSIONS: Record<keyof RiskRadarData, DimensionMeta> = {
  tech_exposure: {
    label: 'Tech Exposure',
    shortLabel: 'Tech',
    description: 'How much of your portfolio is in technology companies (software, chips, internet, hardware).',
    interpret: (v) =>
      v > 0.6 ? 'Very tech-heavy — strong upside potential but sector risk' :
      v > 0.3 ? 'Moderate tech tilt — common in growth portfolios' :
      'Low tech exposure',
    riskLevel: (v) => v > 0.6 ? 'high' : v > 0.3 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  us_exposure: {
    label: 'US Exposure',
    shortLabel: 'US',
    description: 'Percentage of your portfolio invested in US-based companies. High concentration reduces global diversification.',
    interpret: (v) =>
      v > 0.8 ? 'Almost entirely in the US — limited international exposure' :
      v > 0.5 ? 'Mostly US-based with some international' :
      'Geographically diversified',
    riskLevel: (v) => v > 0.8 ? 'high' : v > 0.5 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  concentration: {
    label: 'Concentration',
    shortLabel: 'Concentration',
    description: 'How dominant your single largest holding is. A high value means one stock can make or break your portfolio.',
    interpret: (v) =>
      v > 0.4 ? 'High — one stock carries outsized influence' :
      v > 0.25 ? 'Moderate — top holding has significant weight' :
      'Well distributed — no single stock dominates',
    riskLevel: (v) => v > 0.4 ? 'high' : v > 0.25 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  sector_diversity: {
    label: 'Sector Diversity',
    shortLabel: 'Diversity',
    description: 'How spread your portfolio is across different industries. Higher is better — it means you\'re not dependent on any one sector.',
    interpret: (v) =>
      v > 0.7 ? 'Highly diversified across multiple sectors' :
      v > 0.4 ? 'Moderate — a few sectors dominate' :
      'Low — heavily concentrated in one or two sectors',
    riskLevel: (v) => v < 0.4 ? 'high' : v < 0.7 ? 'medium' : 'low',
    higherIsBetter: true,
  },
  volatility: {
    label: 'Volatility',
    shortLabel: 'Volatility',
    description: 'How much your portfolio value has historically swung up and down, based on 3 years of daily price data.',
    interpret: (v) =>
      v > 0.7 ? 'High — expect large price swings; higher risk and reward' :
      v > 0.4 ? 'Moderate — typical of a growth-oriented portfolio' :
      'Low — relatively stable price movements',
    riskLevel: (v) => v > 0.7 ? 'high' : v > 0.4 ? 'medium' : 'low',
    higherIsBetter: false,
  },
}

const RISK_STYLE: Record<RiskLevel, { text: string; bg: string; dot: string; border: string }> = {
  low:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400', border: 'border-emerald-400/20' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-400/10',   dot: 'bg-amber-400',   border: 'border-amber-400/20'   },
  high:   { text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400',     border: 'border-red-400/20'     },
}

const RISK_LABEL: Record<RiskLevel, string> = { low: 'Low', medium: 'Moderate', high: 'High' }

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {RISK_LABEL[level]}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: RechartsTooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = (payload[0]?.value ?? 0) / 100
  const dimEntry = Object.entries(DIMENSIONS).find(([, d]) => d.shortLabel === label)
  const meta = dimEntry?.[1]
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-xs max-w-[200px] shadow-xl">
      <div className="font-semibold text-white mb-1">{meta?.label ?? label}</div>
      <div className="text-blue-400 font-mono mb-1.5">{(value * 100).toFixed(0)}%</div>
      {meta && <div className="text-gray-400 leading-relaxed">{meta.interpret(value)}</div>}
    </div>
  )
}

function StatCard({ label, items }: { label: string; items: { label: string; value: number }[] }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-3 py-2">
      <div className="text-gray-500 text-xs mb-2">{label}</div>
      <div className="space-y-1">
        {items.slice(0, 4).map(({ label: l, value: v }) => (
          <div key={l} className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 capitalize">{l}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v * 100}%` }} />
              </div>
              <span className="text-xs text-gray-300 tabular-nums">{(v * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RiskRadar({ radar, exposures, concentration }: Props) {
  const radarData = radar
    ? (Object.keys(DIMENSIONS) as (keyof RiskRadarData)[]).map((key) => ({
        subject: DIMENSIONS[key]!.shortLabel,
        value: Math.round(radar[key] * 100),
        fullMark: 100,
      }))
    : []

  const highRiskDims = radar
    ? (Object.entries(DIMENSIONS) as [keyof RiskRadarData, DimensionMeta][])
        .filter(([key, meta]) => meta.riskLevel(radar[key]) === 'high')
        .map(([, meta]) => meta.label)
    : []

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
      <h2 className="text-lg font-semibold text-white mb-1">Risk Radar</h2>
      <p className="text-gray-500 text-xs mb-5">
        Five dimensions of portfolio risk — each axis runs 0% (center) to 100% (edge).
        A larger shaded area means higher exposure on that dimension.
        Hover any axis label for details.
      </p>

      {!radar && (
        <div className="h-64 flex items-center justify-center text-gray-600 text-sm italic">
          Run "Analyze Portfolio" to see risk breakdown.
        </div>
      )}

      {radar && (
        <div className="space-y-6">
          {/* Attention callout */}
          {highRiskDims.length > 0 && (
            <div className="flex items-start gap-3 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">
              <span className="text-red-400 mt-0.5 shrink-0 text-sm">⚠</span>
              <div>
                <div className="text-red-400 text-xs font-semibold mb-0.5">Elevated risk detected</div>
                <div className="text-gray-400 text-xs leading-relaxed">
                  <span className="text-gray-300">{highRiskDims.join(', ')}</span>
                  {highRiskDims.length === 1 ? ' is' : ' are'} in the high range.
                  See the breakdown below for what this means and how to interpret it.
                </div>
              </div>
            </div>
          )}

          {/* Chart + sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#1f2937" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickCount={4}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip content={CustomTooltip} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-2 min-w-[160px]">
              {exposures && (
                <>
                  <StatCard
                    label="Sector breakdown"
                    items={Object.entries(exposures.sector_exposure)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => ({ label: k, value: v }))}
                  />
                  <StatCard
                    label="Country breakdown"
                    items={Object.entries(exposures.country_exposure)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => ({ label: k, value: v }))}
                  />
                </>
              )}
              {concentration !== null && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs mb-1">Largest single position</div>
                  <div className={`text-sm font-semibold ${concentration >= 0.4 ? 'text-red-400' : 'text-white'}`}>
                    {(concentration * 100).toFixed(0)}%
                    {concentration >= 0.4 && <span className="text-xs font-normal text-red-400 ml-1">High</span>}
                  </div>
                  <div className="text-gray-600 text-xs mt-0.5">of portfolio in one stock</div>
                </div>
              )}
            </div>
          </div>

          {/* Dimension legend */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
              What each dimension means
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(DIMENSIONS) as [keyof RiskRadarData, DimensionMeta][]).map(([key, meta]) => {
                const rawValue = radar[key]
                const level = meta.riskLevel(rawValue)
                const s = RISK_STYLE[level]
                return (
                  <div
                    key={key}
                    className={`rounded-lg px-3 py-2.5 border bg-gray-800/40 ${s.border}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-200">{meta.label}</span>
                        {meta.higherIsBetter && (
                          <span className="text-gray-600 text-xs">↑ better</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-gray-400 tabular-nums">
                          {(rawValue * 100).toFixed(0)}%
                        </span>
                        <RiskBadge level={level} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-1">{meta.description}</p>
                    <p className={`text-xs font-medium ${s.text}`}>{meta.interpret(rawValue)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reading guide */}
          <div className="border-t border-gray-800 pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
              How to read this chart
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { symbol: '●', color: 'text-blue-400', label: 'Shaded area', tip: 'The blue polygon shows your current risk profile. A larger shape means higher risk across that axis.' },
                { symbol: '↑', color: 'text-gray-400', label: 'Diversity axis', tip: 'This is the only axis where a higher score is good — more diversity means less sector risk.' },
                { symbol: '⚠', color: 'text-amber-400', label: 'Risk badges', tip: 'Each dimension is rated Low / Moderate / High. Aim to understand any "High" rating before investing more.' },
              ].map((g) => (
                <div key={g.label} className="flex gap-2.5">
                  <span className={`${g.color} shrink-0 mt-0.5 text-sm`}>{g.symbol}</span>
                  <div>
                    <div className="text-xs font-medium text-gray-300 mb-0.5">{g.label}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{g.tip}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
