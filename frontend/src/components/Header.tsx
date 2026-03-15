export function Header() {
  return (
    <header className="mb-10">
      {/* Nav bar */}
      <nav className="flex items-center justify-between mb-14">
        <div className="flex items-center gap-2.5">
          {/* Geometric faceted diamond logo */}
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path d="M14 2L24 8V20L14 26L4 20V8L14 2Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.2"/>
            <path d="M14 2L24 8L14 14L4 8L14 2Z" fill="white" fillOpacity="0.45"/>
            <path d="M14 14L24 8V20L14 26V14Z" fill="white" fillOpacity="0.22"/>
            <path d="M4 8V20L14 26V14L4 8Z" fill="white" fillOpacity="0.10"/>
          </svg>
          <span className="text-white font-bold text-xl tracking-tight">SAVR</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm text-zinc-500">
          <span className="text-zinc-300 font-medium">Portfolio</span>
          <span className="hover:text-zinc-300 transition-colors cursor-default">Risk</span>
          <span className="hover:text-zinc-300 transition-colors cursor-default">Simulator</span>
        </div>

        <button className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors">
          Bli kund
        </button>
      </nav>

      {/* Hero */}
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          Portfolio Copilot
        </h1>
        <p className="text-zinc-400 text-sm">
          Understand and optimize your portfolio with AI
        </p>
      </div>
    </header>
  )
}
