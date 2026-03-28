import { useState } from 'react';
import { useArbScanner } from '@/hooks/useArbScanner';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { MainPanel } from '@/components/MainPanel';
import { LogPanel } from '@/components/LogPanel';

type MobileTab = 'opps' | 'prices' | 'log' | 'settings';

const Index = () => {
  const { state, filters, setFilters, toggleScanner, toggleSound, clearResults, clearLogs, manualScan } = useArbScanner();
  const [activeTab, setActiveTab] = useState<MobileTab>('opps');

  return (
    <div className="flex flex-col h-screen relative z-[1]">
      <TopBar state={state} onToggleScanner={toggleScanner} onToggleSound={toggleSound} />

      {/* Scan progress bar */}
      <div className="h-0.5 bg-arb-border relative overflow-hidden flex-shrink-0">
        {state.scanProgress > 0 && (
          <div className="h-full bg-gradient-to-r from-arb-green to-arb-blue transition-all duration-300 relative" style={{ width: `${state.scanProgress}%` }}>
            <div className="absolute right-0 -top-px -bottom-px w-5 bg-gradient-to-r from-transparent to-white/60 blur-sm" />
          </div>
        )}
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-[280px_1fr_320px]">
        {/* Sidebar - desktop always visible, mobile via tab */}
        <aside className={`border-r border-arb-border bg-arb-bg2 overflow-y-auto ${activeTab === 'settings' ? 'block' : 'hidden'} lg:block`}>
          {/* Mobile stats bar */}
          <div className="lg:hidden flex bg-arb-bg3 border-b border-arb-border overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            <MobileStat label="Status" value={state.running ? 'LIVE' : 'PAUSED'} className="text-arb-green" />
            <MobileStat label="Opps" value={state.opportunities.length.toString()} className="text-arb-green" />
            <MobileStat label="Best" value={`$${state.bestProfit.toFixed(2)}`} className="text-arb-green" />
            <MobileStat label="Profit" value={`$${Math.round(state.hrProfit)}`} className="text-arb-amber" />
          </div>
          <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={manualScan} onClearResults={clearResults} />
        </aside>

        {/* Main panel */}
        <main className={`overflow-y-auto ${activeTab === 'opps' || activeTab === 'prices' ? 'flex flex-col' : 'hidden'} lg:flex lg:flex-col`}>
          <MainPanel state={state} filters={filters} />
        </main>

        {/* Log panel */}
        <section className={`border-l border-arb-border bg-arb-bg2 ${activeTab === 'log' ? 'flex flex-col' : 'hidden'} lg:flex lg:flex-col`}>
          <LogPanel state={state} onClearLogs={clearLogs} />
        </section>
      </div>

      {/* Mobile tab bar */}
      <nav className="lg:hidden flex-shrink-0 h-[60px] grid grid-cols-4 bg-arb-bg2 border-t border-arb-border2">
        <MobTab icon="📊" label="OPPS" active={activeTab === 'opps'} onClick={() => setActiveTab('opps')} />
        <MobTab icon="💹" label="PRICES" active={activeTab === 'prices'} onClick={() => setActiveTab('prices')} />
        <MobTab icon="📋" label="LOG" active={activeTab === 'log'} onClick={() => setActiveTab('log')} />
        <MobTab icon="⚙️" label="SETTINGS" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

function MobileStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="px-4 py-2 flex flex-col gap-px border-r border-arb-border whitespace-nowrap">
      <div className="text-[8px] text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[13px] font-semibold font-sans ${className}`}>{value}</div>
    </div>
  );
}

function MobTab({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 bg-transparent border-none font-sans text-[9px] font-semibold tracking-wide uppercase cursor-pointer transition-colors relative ${active ? 'text-arb-green' : 'text-arb-muted'}`}
    >
      {active && <div className="absolute top-0 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-arb-green to-arb-blue rounded-b" />}
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </button>
  );
}

export default Index;
