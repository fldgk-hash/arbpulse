import { useState } from 'react';
import { useArbScanner } from '@/hooks/useArbScanner';
import type { DexOpp, CexOpp } from '@/hooks/useArbScanner';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { DexView } from '@/components/DexView';
import { CexView } from '@/components/CexView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { LogPanel } from '@/components/LogPanel';
import { BottomNav } from '@/components/BottomNav';
import { TradeCalculator } from '@/components/TradeCalculator';
import { NewTokensView } from '@/components/NewTokensView';

const Index = () => {
  const {
    state, filters, setFilters,
    toggleScanner, toggleSound, clearLogs, clearCexResults,
    runCexScan, scanDex, scanBsc, logOpp, clearHistory, exportCSV,
    setActiveView, refilterDex, clearNewPairs,
  } = useArbScanner();

  const [calcOpp, setCalcOpp] = useState<(DexOpp | CexOpp) | null>(null);

  const view = state.activeView;

  const DESKTOP_TABS = [
    { id: 'dex',       label: '🚀 DEX',       count: state.filteredDexOpps.length + state.filteredBscOpps.length },
    { id: 'new',       label: '🆕 NEW',        count: state.newPairCount },
    { id: 'cex',       label: '📊 CEX',       count: state.cexOpps.length },
    { id: 'analytics', label: '💰 Analytics', count: state.history.length },
  ];

  const renderMainView = () => {
    if (view === 'dex') return (
      <DexView
        opps={state.filteredDexOpps} scanning={state.dexScanning} status={state.dexStatus} onScan={scanDex}
        bscOpps={state.filteredBscOpps} bscScanning={state.bscScanning} bscStatus={state.bscStatus} onBscScan={scanBsc}
        filters={filters} setFilters={setFilters} onRefilter={refilterDex}
        onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)}
        logs={state.logs} />
    );
    if (view === 'new') return (
      <NewTokensView newPairs={state.newPairs} onClear={clearNewPairs} />
    );
    if (view === 'cex') return (
      <CexView state={state} filters={filters}
        onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)} />
    );
    if (view === 'analytics') return (
      <AnalyticsView state={state} onClearHistory={clearHistory} onExportCSV={exportCSV} />
    );
    // default
    return (
      <DexView
        opps={state.filteredDexOpps} scanning={state.dexScanning} status={state.dexStatus} onScan={scanDex}
        bscOpps={state.filteredBscOpps} bscScanning={state.bscScanning} bscStatus={state.bscStatus} onBscScan={scanBsc}
        filters={filters} setFilters={setFilters} onRefilter={refilterDex}
        onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)}
        logs={state.logs} />
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] relative z-[1]">
      <TopBar state={state} onToggleScanner={toggleScanner} onToggleSound={toggleSound} />

      {/* Scan progress bar */}
      <div className="h-0.5 bg-arb-bg3 relative overflow-hidden flex-shrink-0">
        {state.scanProgress > 0 && (
          <div className="h-full bg-gradient-to-r from-arb-green to-arb-cyan transition-all duration-300" style={{ width: `${state.scanProgress}%` }} />
        )}
      </div>

      {/* Desktop: 3-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[260px_1fr_290px] flex-1 overflow-hidden">
        <aside className="border-r border-arb-border bg-arb-bg2 overflow-y-auto">
          <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={runCexScan} onClearResults={clearCexResults} />
        </aside>
        <main className="overflow-hidden flex flex-col relative">
          <div className="flex gap-0 border-b border-arb-border flex-shrink-0 bg-arb-bg2">
            {DESKTOP_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveView(tab.id)}
                className={`px-4 py-2.5 text-[10px] font-semibold tracking-wider uppercase border-none cursor-pointer transition-all relative font-sans flex items-center gap-1.5 ${
                  view === tab.id
                    ? 'text-arb-green bg-arb-bg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-arb-green'
                    : 'text-arb-muted bg-transparent hover:text-arb-text'
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab.id === 'new' && tab.count > 0
                      ? 'bg-arb-red/20 text-arb-red'
                      : view === tab.id ? 'bg-arb-green/20 text-arb-green' : 'bg-arb-bg3 text-arb-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderMainView()}
          </div>
        </main>
        <section className="border-l border-arb-border bg-arb-bg2 flex flex-col overflow-hidden">
          <LogPanel state={state} onClearLogs={clearLogs} />
        </section>
      </div>

      {/* Mobile */}
      <div className="lg:hidden flex-1 overflow-y-auto flex flex-col min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {view === 'log' ? (
          <LogPanel state={state} onClearLogs={clearLogs} />
        ) : view === 'settings' ? (
          // BUG FIX: Log was completely unreachable on mobile — no BottomNav tab ever
          // routed to 'log'. Fix: show LogPanel + Sidebar together under "More" tab.
          <div className="flex-1 overflow-y-auto bg-arb-bg2 flex flex-col">
            <LogPanel state={state} onClearLogs={clearLogs} />
            <div className="border-t border-arb-border" />
            <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={runCexScan} onClearResults={clearCexResults} />
          </div>
        ) : renderMainView()}
      </div>

      <BottomNav activeView={view} onSwitch={setActiveView} newPairCount={state.newPairCount} errorLogCount={state.logs.filter(l => l.type === 'err' || l.type === 'warn').length} />

      {calcOpp && (
        <TradeCalculator opp={calcOpp} onClose={() => setCalcOpp(null)} onLog={logOpp} defaultTradeSize={filters.tradeSize} />
      )}
    </div>
  );
};

export default Index;
