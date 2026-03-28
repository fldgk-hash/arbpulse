import { useState } from 'react';
import { useArbScanner } from '@/hooks/useArbScanner';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { MainPanel } from '@/components/MainPanel';
import { LogPanel } from '@/components/LogPanel';

const Index = () => {
  const { state, filters, setFilters, toggleScanner, toggleSound, clearResults, clearLogs, manualScan } = useArbScanner();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen relative z-[1]">
      <TopBar state={state} onToggleScanner={toggleScanner} onToggleSound={toggleSound} />

      {/* Scan progress bar */}
      <div className="h-0.5 bg-arb-border relative overflow-hidden flex-shrink-0">
        {state.scanProgress > 0 && (
          <div className="h-full bg-gradient-to-r from-arb-green to-arb-blue transition-all duration-300 relative" style={{ width: `${state.scanProgress}%` }}>
            <div className="absolute right-0 -top-px -bottom-px w-5 bg-gradient-to-r from-transparent to-white/60 blur-sm" />
          </div>
        )}
      </div>

      {/* Mobile: quick stats bar */}
      <div className="lg:hidden flex bg-arb-bg3 border-b border-arb-border overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        <MobileStat label="Status" value={state.running ? 'LIVE' : 'PAUSED'} className="text-arb-green" />
        <MobileStat label="Opps" value={state.opportunities.length.toString()} className="text-arb-green" />
        <MobileStat label="Best" value={`$${state.bestProfit.toFixed(2)}`} className="text-arb-green" />
        <MobileStat label="Profit/hr" value={`$${Math.round(state.hrProfit)}`} className="text-arb-amber" />
        <MobileStat label="Scans" value={`#${state.scanCount}`} className="text-arb-head" />
      </div>

      {/* Mobile: settings toggle */}
      <div className="lg:hidden flex-shrink-0">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-arb-bg2 border-b border-arb-border text-arb-head font-sans text-[11px] font-bold tracking-wider uppercase"
        >
          <span>⚙️ Scanner Settings & Filters</span>
          <span className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {settingsOpen && (
          <div className="bg-arb-bg2 border-b border-arb-border max-h-[60vh] overflow-y-auto">
            <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={manualScan} onClearResults={clearResults} />
          </div>
        )}
      </div>

      {/* Desktop: 3-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_320px] flex-1 overflow-hidden">
        <aside className="border-r border-arb-border bg-arb-bg2 overflow-y-auto">
          <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={manualScan} onClearResults={clearResults} />
        </aside>
        <main className="overflow-y-auto flex flex-col">
          <MainPanel state={state} filters={filters} />
        </main>
        <section className="border-l border-arb-border bg-arb-bg2 flex flex-col">
          <LogPanel state={state} onClearLogs={clearLogs} />
        </section>
      </div>

      {/* Mobile: all panels stacked */}
      <div className="lg:hidden flex flex-col flex-1 overflow-y-auto">
        {/* Main panel */}
        <MainPanel state={state} filters={filters} />

        {/* Log panel */}
        <div className="border-t border-arb-border bg-arb-bg2">
          <LogPanel state={state} onClearLogs={clearLogs} />
        </div>
      </div>
    </div>
  );
};

function MobileStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="px-3 py-2 flex flex-col gap-px border-r border-arb-border whitespace-nowrap">
      <div className="text-[8px] text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[12px] font-semibold font-sans ${className}`}>{value}</div>
    </div>
  );
}

export default Index;
