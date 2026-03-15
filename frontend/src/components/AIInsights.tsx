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

export function AIInsights({ text, loading, error }: Props) {
  const bullets = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-400 text-lg">✦</span>
        <h2 className="text-lg font-semibold text-white">AI Insights</h2>
        {loading && (
          <svg className="w-4 h-4 animate-spin text-blue-400 ml-1" viewBox="0 0 24 24" fill="none">
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

      {!loading && !text && !error && (
        <p className="text-gray-600 text-sm italic">
          Click "Explain Portfolio" to generate an AI analysis of your holdings.
        </p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-4 bg-gray-800 rounded animate-pulse`} style={{ width: `${70 + i * 7}%` }} />
          ))}
        </div>
      )}

      {!loading && bullets.length > 0 && (
        <ul className="space-y-3">
          {bullets.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
              <span className="text-blue-400 mt-0.5 shrink-0">
                {line.startsWith('•') ? '•' : '→'}
              </span>
              <span>{renderInline(line.replace(/^[•→]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
