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

const Index = () => {
  const {
    state, filters, setFilters,
    toggleScanner, toggleSound, clearLogs, clearCexResults,
    runCexScan, scanDex, logOpp, clearHistory, exportCSV,
    setActiveView, refilterDex,
  } = useArbScanner();

  const [calcOpp, setCalcOpp] = useState<(DexOpp | CexOpp) | null>(null);

  const view = state.activeView;

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
          {/* DEX view always visible on desktop main */}
          <DexView opps={state.filteredDexOpps} filters={filters} setFilters={setFilters}
            scanning={state.dexScanning} status={state.dexStatus}
            onScan={scanDex} onRefilter={refilterDex}
            onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)} />
        </main>
        <section className="border-l border-arb-border bg-arb-bg2 flex flex-col overflow-hidden">
          <LogPanel state={state} onClearLogs={clearLogs} />
        </section>
      </div>

      {/* Mobile: view switching */}
      <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
        {view === 'dex' && (
          <DexView opps={state.filteredDexOpps} filters={filters} setFilters={setFilters}
            scanning={state.dexScanning} status={state.dexStatus}
            onScan={scanDex} onRefilter={refilterDex}
            onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)} />
        )}
        {view === 'cex' && (
          <CexView state={state} filters={filters}
            onLogOpp={o => logOpp(o)} onCalc={o => setCalcOpp(o)} />
        )}
        {view === 'analytics' && (
          <AnalyticsView state={state} onClearHistory={clearHistory} onExportCSV={exportCSV} />
        )}
        {view === 'log' && (
          <LogPanel state={state} onClearLogs={clearLogs} />
        )}
        {view === 'settings' && (
          <div className="flex-1 overflow-y-auto bg-arb-bg2">
            <Sidebar state={state} filters={filters} setFilters={setFilters} onManualScan={runCexScan} onClearResults={clearCexResults} />
          </div>
        )}
      </div>

      {/* Bottom Nav - Mobile */}
      <BottomNav activeView={view} onSwitch={setActiveView} newPairCount={state.newPairCount} />

      {/* Trade Calculator Modal */}
      {calcOpp && (
        <TradeCalculator opp={calcOpp} onClose={() => setCalcOpp(null)} onLog={logOpp} defaultTradeSize={filters.tradeSize} />
      )}
    </div>
  );
};

export default Index;
