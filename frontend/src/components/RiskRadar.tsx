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
    label: 'Teknikexponering',
    shortLabel: 'Tech',
    description: 'Hur stor del av din portfölj som ligger i teknikbolag (mjukvara, chips, internet, hårdvara).',
    interpret: (v) =>
      v > 0.6 ? 'Mycket tekniktung — stor uppåtpotential men hög sektorrisk' :
      v > 0.3 ? 'Måttlig tekniktyngd — vanligt i tillväxtportföljer' :
      'Låg teknikexponering',
    riskLevel: (v) => v > 0.6 ? 'high' : v > 0.3 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  us_exposure: {
    label: 'USA-exponering',
    shortLabel: 'USA',
    description: 'Andel av portföljen i USA-baserade bolag. Hög koncentration minskar den globala diversifieringen.',
    interpret: (v) =>
      v > 0.8 ? 'Nästan helt USA-fokuserad — begränsad internationell exponering' :
      v > 0.5 ? 'Mestadels USA-baserad med viss internationell spridning' :
      'Geografiskt diversifierad',
    riskLevel: (v) => v > 0.8 ? 'high' : v > 0.5 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  concentration: {
    label: 'Koncentration',
    shortLabel: 'Konc.',
    description: 'Hur dominant ditt enskilt största innehav är. Ett högt värde innebär att en aktie kan avgöra portföljens utveckling.',
    interpret: (v) =>
      v > 0.4 ? 'Hög — en aktie har oproportionerligt stor påverkan' :
      v > 0.25 ? 'Måttlig — det största innehavet har betydande vikt' :
      'Välfördelad — ingen enskild aktie dominerar',
    riskLevel: (v) => v > 0.4 ? 'high' : v > 0.25 ? 'medium' : 'low',
    higherIsBetter: false,
  },
  sector_diversity: {
    label: 'Sektordiversifiering',
    shortLabel: 'Mångfald',
    description: 'Hur spridd portföljen är över olika branscher. Högre är bättre — det innebär att du inte är beroende av en enda sektor.',
    interpret: (v) =>
      v > 0.7 ? 'Starkt diversifierad över flera sektorer' :
      v > 0.4 ? 'Måttlig — ett fåtal sektorer dominerar' :
      'Låg — kraftigt koncentrerad till en eller två sektorer',
    riskLevel: (v) => v < 0.4 ? 'high' : v < 0.7 ? 'medium' : 'low',
    higherIsBetter: true,
  },
  volatility: {
    label: 'Volatilitet',
    shortLabel: 'Volatilitet',
    description: 'Hur mycket portföljvärdet historiskt har svängt upp och ned, baserat på tre års daglig prisdata.',
    interpret: (v) =>
      v > 0.7 ? 'Hög — förvänta dig stora prisrörelser; högre risk och potential' :
      v > 0.4 ? 'Måttlig — typisk för en tillväxtinriktad portfölj' :
      'Låg — relativt stabila prisrörelser',
    riskLevel: (v) => v > 0.7 ? 'high' : v > 0.4 ? 'medium' : 'low',
    higherIsBetter: false,
  },
}

const RISK_STYLE: Record<RiskLevel, { text: string; bg: string; dot: string; border: string }> = {
  low:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400', border: 'border-emerald-400/20' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-400/10',   dot: 'bg-amber-400',   border: 'border-amber-400/20'   },
  high:   { text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400',     border: 'border-red-400/20'     },
}

const RISK_LABEL: Record<RiskLevel, string> = { low: 'Låg', medium: 'Måttlig', high: 'Hög' }

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
    <div className="bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs max-w-[200px] shadow-xl">
      <div className="font-semibold text-white mb-1">{meta?.label ?? label}</div>
      <div className="text-violet-400 font-mono mb-1.5">{(value * 100).toFixed(0)}%</div>
      {meta && <div className="text-zinc-400 leading-relaxed">{meta.interpret(value)}</div>}
    </div>
  )
}

function StatCard({ label, items }: { label: string; items: { label: string; value: number }[] }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
      <div className="text-zinc-500 text-xs mb-2">{label}</div>
      <div className="space-y-1">
        {items.slice(0, 4).map(({ label: l, value: v }) => (
          <div key={l} className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 capitalize">{l}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${v * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-300 tabular-nums">{(v * 100).toFixed(0)}%</span>
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
    <div className="bg-zinc-900/80 border border-white/[0.08] rounded-xl p-6 mb-4">
      <h2 className="text-lg font-semibold text-white mb-1">Riskradar</h2>
      <p className="text-zinc-500 text-xs mb-5">
        Fem riskdimensioner — varje axel går 0% (mitten) till 100% (kanten).
        En större skuggad yta betyder högre exponering på den dimensionen.
        Hovra över axeletiketterna för detaljer.
      </p>

      {!radar && (
        <div className="h-64 flex items-center justify-center text-zinc-600 text-sm italic">
          Kör "Analysera" för att se riskprofilen.
        </div>
      )}

      {radar && (
        <div className="space-y-6">
          {/* Attention callout */}
          {highRiskDims.length > 0 && (
            <div className="flex items-start gap-3 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">
              <span className="text-red-400 mt-0.5 shrink-0 text-sm">⚠</span>
              <div>
                <div className="text-red-400 text-xs font-semibold mb-0.5">Förhöjd risk identifierad</div>
                <div className="text-zinc-400 text-xs leading-relaxed">
                  <span className="text-zinc-300">{highRiskDims.join(', ')}</span>
                  {' '}är i det höga spannet.
                  Se fördelningen nedan för vad detta innebär och hur du tolkar det.
                </div>
              </div>
            </div>
          )}

          {/* Chart + sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#1c1c1e" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickCount={4}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#7c3aed"
                    fill="#7c3aed"
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
                    label="Sektorfördelning"
                    items={Object.entries(exposures.sector_exposure)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => ({ label: k, value: v }))}
                  />
                  <StatCard
                    label="Landfördelning"
                    items={Object.entries(exposures.country_exposure)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => ({ label: k, value: v }))}
                  />
                </>
              )}
              {concentration !== null && (
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <div className="text-zinc-500 text-xs mb-1">Största enskilda innehav</div>
                  <div className={`text-sm font-semibold ${concentration >= 0.4 ? 'text-red-400' : 'text-white'}`}>
                    {(concentration * 100).toFixed(0)}%
                    {concentration >= 0.4 && <span className="text-xs font-normal text-red-400 ml-1">Hög</span>}
                  </div>
                  <div className="text-zinc-600 text-xs mt-0.5">av portföljen i en aktie</div>
                </div>
              )}
            </div>
          </div>

          {/* Dimension legend */}
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">
              Vad varje dimension innebär
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(DIMENSIONS) as [keyof RiskRadarData, DimensionMeta][]).map(([key, meta]) => {
                const rawValue = radar[key]
                const level = meta.riskLevel(rawValue)
                const s = RISK_STYLE[level]
                return (
                  <div
                    key={key}
                    className={`rounded-lg px-3 py-2.5 border bg-zinc-800/40 ${s.border}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{meta.label}</span>
                        {meta.higherIsBetter && (
                          <span className="text-zinc-600 text-xs">↑ bättre</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-zinc-400 tabular-nums">
                          {(rawValue * 100).toFixed(0)}%
                        </span>
                        <RiskBadge level={level} />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-1">{meta.description}</p>
                    <p className={`text-xs font-medium ${s.text}`}>{meta.interpret(rawValue)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reading guide */}
          <div className="border-t border-white/[0.06] pt-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">
              Så läser du grafen
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { symbol: '●', color: 'text-violet-400', label: 'Skuggat område', tip: 'Den lila polygonen visar din aktuella riskprofil. En större yta innebär högre exponering på den axeln.' },
                { symbol: '↑', color: 'text-zinc-400', label: 'Diversifieringsaxeln (Mångfald)', tip: 'Axeln märkt "Mångfald" är den enda där ett högt värde är bra — mer mångfald innebär lägre sektorrisk.' },
                { symbol: '⚠', color: 'text-amber-400', label: 'Riskmarkeringar', tip: 'Varje dimension bedöms som Låg / Måttlig / Hög. Förstå innebörden av "Hög" innan du investerar mer.' },
              ].map((g) => (
                <div key={g.label} className="flex gap-2.5">
                  <span className={`${g.color} shrink-0 mt-0.5 text-sm`}>{g.symbol}</span>
                  <div>
                    <div className="text-xs font-medium text-zinc-300 mb-0.5">{g.label}</div>
                    <div className="text-xs text-zinc-600 leading-relaxed">{g.tip}</div>
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
