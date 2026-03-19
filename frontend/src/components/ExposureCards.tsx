import { PieChart, Pie, Cell } from 'recharts'
import type { PortfolioItem, Exposures } from '../types'

// ── Static mappings ───────────────────────────────────────────────────────────

const ASSET_META: Record<string, { label: string; color: string }> = {
  stock:   { label: 'Aktier',  color: '#a78bfa' },
  etf:     { label: 'ETF:er',  color: '#60a5fa' },
  fund:    { label: 'Fonder',  color: '#34d399' },
  cash:    { label: 'Pengar',  color: '#fbbf24' },
  unknown: { label: 'Övrigt',  color: '#52525b' },
}

const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  US:            { flag: '🇺🇸', name: 'USA' },
  SE:            { flag: '🇸🇪', name: 'Sverige' },
  DK:            { flag: '🇩🇰', name: 'Danmark' },
  GB:            { flag: '🇬🇧', name: 'Storbritannien' },
  global:        { flag: '🌍', name: 'Global' },
  'ex-US':       { flag: '🌐', name: 'ex-USA' },
  emerging:      { flag: '🌏', name: 'Tillväxtmarknader' },
  international: { flag: '🌐', name: 'Internationellt' },
  unknown:       { flag: '❓', name: 'Okänt' },
}

const CURRENCY_META: Record<string, { flag: string }> = {
  USD: { flag: '🇺🇸' },
  SEK: { flag: '🇸🇪' },
  DKK: { flag: '🇩🇰' },
  GBP: { flag: '🇬🇧' },
}

const SECTOR_META: Record<string, { label: string; color: string }> = {
  tech:        { label: 'Teknik',    color: '#a78bfa' },
  industrial:  { label: 'Industri',  color: '#60a5fa' },
  healthcare:  { label: 'Hälsa',     color: '#34d399' },
  finance:     { label: 'Finans',    color: '#fbbf24' },
  consumer:    { label: 'Konsument', color: '#f87171' },
  energy:      { label: 'Energi',    color: '#fb923c' },
  commodities: { label: 'Råvaror',   color: '#e2e8f0' },
  mixed:       { label: 'Blandat',   color: '#71717a' },
  unknown:     { label: 'Övrigt',    color: '#52525b' },
}

const TICKER_INFO: Record<string, { assetType: string; currency: string }> = {
  NVDA: { assetType: 'stock', currency: 'USD' },
  TSLA: { assetType: 'stock', currency: 'USD' },
  AAPL: { assetType: 'stock', currency: 'USD' },
  MSFT: { assetType: 'stock', currency: 'USD' },
  GOOGL: { assetType: 'stock', currency: 'USD' },
  GOOG: { assetType: 'stock', currency: 'USD' },
  AMZN: { assetType: 'stock', currency: 'USD' },
  META: { assetType: 'stock', currency: 'USD' },
  NFLX: { assetType: 'stock', currency: 'USD' },
  AMD: { assetType: 'stock', currency: 'USD' },
  INTC: { assetType: 'stock', currency: 'USD' },
  CRM: { assetType: 'stock', currency: 'USD' },
  ADBE: { assetType: 'stock', currency: 'USD' },
  ORCL: { assetType: 'stock', currency: 'USD' },
  NOW: { assetType: 'stock', currency: 'USD' },
  INVESTOR: { assetType: 'stock', currency: 'SEK' },
  ERIC: { assetType: 'stock', currency: 'SEK' },
  VOLV: { assetType: 'stock', currency: 'SEK' },
  NOVO: { assetType: 'stock', currency: 'DKK' },
  NVO: { assetType: 'stock', currency: 'USD' },
  AZN: { assetType: 'stock', currency: 'GBP' },
  JNJ: { assetType: 'stock', currency: 'USD' },
  PFE: { assetType: 'stock', currency: 'USD' },
  UNH: { assetType: 'stock', currency: 'USD' },
  XOM: { assetType: 'stock', currency: 'USD' },
  CVX: { assetType: 'stock', currency: 'USD' },
  BP: { assetType: 'stock', currency: 'GBP' },
  JPM: { assetType: 'stock', currency: 'USD' },
  BAC: { assetType: 'stock', currency: 'USD' },
  GS: { assetType: 'stock', currency: 'USD' },
  V: { assetType: 'stock', currency: 'USD' },
  MA: { assetType: 'stock', currency: 'USD' },
  'BRK-B': { assetType: 'stock', currency: 'USD' },
  WMT: { assetType: 'stock', currency: 'USD' },
  COST: { assetType: 'stock', currency: 'USD' },
  PG: { assetType: 'stock', currency: 'USD' },
  KO: { assetType: 'stock', currency: 'USD' },
  QQQ: { assetType: 'etf', currency: 'USD' },
  SPY: { assetType: 'etf', currency: 'USD' },
  VOO: { assetType: 'etf', currency: 'USD' },
  VTI: { assetType: 'etf', currency: 'USD' },
  VT: { assetType: 'etf', currency: 'USD' },
  VXUS: { assetType: 'etf', currency: 'USD' },
  VWO: { assetType: 'etf', currency: 'USD' },
  EFA: { assetType: 'etf', currency: 'USD' },
  IWM: { assetType: 'etf', currency: 'USD' },
  GLD: { assetType: 'etf', currency: 'USD' },
  SLV: { assetType: 'etf', currency: 'USD' },
  ETF: { assetType: 'etf', currency: 'USD' },
  GLOBAL_ETF: { assetType: 'etf', currency: 'USD' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeBreakdown(
  portfolio: PortfolioItem[],
  getKey: (ticker: string) => string,
): Record<string, number> {
  const total = portfolio.reduce((s, p) => s + p.weight, 0) || 100
  const result: Record<string, number> = {}
  for (const item of portfolio) {
    const key = getKey(item.ticker)
    result[key] = (result[key] ?? 0) + item.weight / total
  }
  return result
}

function sorted(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function fmtPct(v: number) {
  return (v * 100).toFixed(2) + '%'
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function CardShell({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 mb-3">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold">{title}</span>
        <svg
          className="text-zinc-600 w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
      <div className="text-zinc-500 text-sm mb-4">{count} st</div>
      {children}
    </div>
  )
}

function BarRow({
  left,
  label,
  value,
  maxValue,
  color,
}: {
  left: React.ReactNode
  label: string
  value: number
  maxValue: number
  color: string
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2.5 mb-2">
        {left}
        <span className="text-white text-sm flex-1">{label}</span>
        <span className="text-white text-sm tabular-nums">{fmtPct(value)}</span>
      </div>
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function FlagCircle({ flag }: { flag: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-base">
      {flag}
    </div>
  )
}

function SectorDot({ color }: { color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color}1a` }}
    >
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    </div>
  )
}

// ── Värdepapperstyper ─────────────────────────────────────────────────────────

function AssetTypeCard({ portfolio }: { portfolio: PortfolioItem[] }) {
  const breakdown = computeBreakdown(
    portfolio,
    (t) => TICKER_INFO[t]?.assetType ?? 'unknown',
  )
  const entries = sorted(breakdown)
  const pieData = entries.map(([key, val]) => ({ name: key, value: val }))

  return (
    <CardShell title="Värdepapperstyper" count={entries.length}>
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2.5">
          {entries.map(([key, val]) => {
            const meta = ASSET_META[key] ?? ASSET_META.unknown
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="text-white text-sm">{meta.label}</span>
                </div>
                <span className="text-white text-sm tabular-nums">{fmtPct(val)}</span>
              </div>
            )
          })}
        </div>
        <PieChart width={80} height={80}>
          <Pie
            data={pieData}
            cx={40}
            cy={40}
            innerRadius={26}
            outerRadius={38}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={pieData.length > 1 ? 2 : 0}
          >
            {pieData.map((entry, i) => (
              <Cell
                key={i}
                fill={ASSET_META[entry.name]?.color ?? '#52525b'}
              />
            ))}
          </Pie>
        </PieChart>
      </div>
    </CardShell>
  )
}

// ── Länder ────────────────────────────────────────────────────────────────────

function CountryCard({ exposures }: { exposures: Exposures }) {
  const entries = sorted(exposures.country_exposure)
  const maxVal = entries[0]?.[1] ?? 1

  return (
    <CardShell title="Länder" count={entries.length}>
      {entries.map(([country, val]) => {
        const meta = COUNTRY_META[country] ?? { flag: '🌐', name: country }
        return (
          <BarRow
            key={country}
            left={<FlagCircle flag={meta.flag} />}
            label={meta.name}
            value={val}
            maxValue={maxVal}
            color="#52525b"
          />
        )
      })}
    </CardShell>
  )
}

// ── Valutor ───────────────────────────────────────────────────────────────────

function CurrencyCard({ portfolio }: { portfolio: PortfolioItem[] }) {
  const breakdown = computeBreakdown(
    portfolio,
    (t) => TICKER_INFO[t]?.currency ?? 'unknown',
  )
  const entries = sorted(breakdown)
  const maxVal = entries[0]?.[1] ?? 1

  return (
    <CardShell title="Valutor" count={entries.length}>
      {entries.map(([currency, val]) => {
        const meta = CURRENCY_META[currency] ?? { flag: '🌐' }
        return (
          <BarRow
            key={currency}
            left={<FlagCircle flag={meta.flag} />}
            label={currency}
            value={val}
            maxValue={maxVal}
            color="#52525b"
          />
        )
      })}
    </CardShell>
  )
}

// ── Branscher ─────────────────────────────────────────────────────────────────

function SectorCard({ exposures }: { exposures: Exposures }) {
  const entries = sorted(exposures.sector_exposure)
  const maxVal = entries[0]?.[1] ?? 1

  return (
    <CardShell title="Branscher" count={entries.length}>
      {entries.map(([sector, val]) => {
        const meta = SECTOR_META[sector] ?? { label: sector, color: '#52525b' }
        return (
          <BarRow
            key={sector}
            left={<SectorDot color={meta.color} />}
            label={meta.label}
            value={val}
            maxValue={maxVal}
            color={meta.color}
          />
        )
      })}
    </CardShell>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  portfolio: PortfolioItem[]
  exposures: Exposures | null
}

export function ExposureCards({ portfolio, exposures }: Props) {
  return (
    <div className="mb-4">
      <div className="text-white font-bold text-xl mb-4">Exponering</div>

      {!exposures ? (
        <div className="bg-zinc-900 rounded-2xl p-5 h-24 flex items-center justify-center text-zinc-600 text-sm italic">
          Kör "Analysera" för att se portföljens exponering.
        </div>
      ) : (
        <>
          <AssetTypeCard portfolio={portfolio} />
          <CountryCard exposures={exposures} />
          <CurrencyCard portfolio={portfolio} />
          <SectorCard exposures={exposures} />
        </>
      )}
    </div>
  )
}
