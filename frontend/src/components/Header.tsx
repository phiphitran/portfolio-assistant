const TABS = ['Innehav', 'Ordrar', 'Analys', 'Transaktioner', 'Kalender', 'Autospar']

export function Header() {
  return (
    <header className="mb-6">
      {/* Top row: portfolio badge + name + menu */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold tracking-tight">ISK</span>
          </div>
          <span className="text-white font-bold text-xl">Temp</span>
        </div>
        <button className="text-zinc-500 hover:text-white p-1 transition-colors">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 18 18">
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="9" cy="15" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors shrink-0 ${
              tab === 'Analys'
                ? 'border border-white/80 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  )
}
