import { Fragment } from 'react'

interface Props {
  text: string
  loading: boolean
  error: string
}

/** Render inline **bold** markdown as <strong> elements. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="text-white font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

/**
 * Split the AI response into two sections at the `---` separator.
 * Returns [analysisBullets, bestPracticeBullets].
 * If no separator found, all lines go into analysis.
 */
function parseSections(text: string): [string[], string[]] {
  const parts = text.split(/^---$/m)
  const toLines = (s: string) =>
    s.split('\n')
      .map((l) => l.trim())
      // Strip section header lines like "SECTION 1 — ..."
      .filter((l) => Boolean(l) && !/^SECTION\s+\d/i.test(l))

  if (parts.length >= 2) {
    return [toLines(parts[0]!), toLines(parts[1]!)]
  }
  return [toLines(text), []]
}

function BulletList({ lines, icon }: { lines: string[]; icon: 'analysis' | 'practice' }) {
  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => {
        const isPractice = icon === 'practice'
        const cleanLine = line.replace(/^[•✓→]\s*/, '')
        return (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span
              className={`mt-0.5 shrink-0 font-medium ${isPractice ? 'text-emerald-400' : 'text-violet-400'}`}
            >
              {isPractice ? '✓' : '•'}
            </span>
            <span className={isPractice ? 'text-zinc-200' : 'text-zinc-300'}>
              {renderInline(cleanLine)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function AIInsights({ text, loading, error }: Props) {
  const [analysisBullets, bestPracticeBullets] = parseSections(text)
  const hasContent = analysisBullets.length > 0 || bestPracticeBullets.length > 0

  return (
    <div className="bg-zinc-900/80 border border-white/[0.08] rounded-xl p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-violet-400 text-lg">✦</span>
        <h2 className="text-lg font-semibold text-white">AI-insikter</h2>
        {loading && (
          <svg className="w-4 h-4 animate-spin text-violet-400 ml-1" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !hasContent && !error && (
        <p className="text-zinc-600 text-sm italic">
          Klicka på "Förklara" för att generera en AI-analys av dina innehav.
        </p>
      )}

      {loading && (
        <div className="space-y-5">
          <div className="space-y-2">
            {[84, 91, 77, 68].map((w, i) => (
              <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-4 space-y-2">
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-32 mb-3" />
            {[88, 75].map((w, i) => (
              <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}

      {!loading && hasContent && (
        <div className="space-y-5">
          {/* Analysis section */}
          {analysisBullets.length > 0 && (
            <BulletList lines={analysisBullets} icon="analysis" />
          )}

          {/* Best practices section */}
          {bestPracticeBullets.length > 0 && (
            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-400 text-sm">◆</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Att tänka på
                </span>
                <span className="text-xs text-zinc-600">— för riskbalans, inte avkastningsoptimering</span>
              </div>
              <BulletList lines={bestPracticeBullets} icon="practice" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
