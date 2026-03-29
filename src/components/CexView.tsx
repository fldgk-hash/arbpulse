import { memo } from 'react';
import type { CexOpp, ScannerState, ScannerFilters } from '@/hooks/useArbScanner';
import { fmtPrice } from '@/hooks/useArbScanner';

interface CexViewProps {
  state: ScannerState;
  filters: ScannerFilters;
  onLogOpp: (opp: CexOpp) => void;
  onCalc: (opp: CexOpp) => void;
}

export const CexView = memo(({ state, filters, onLogOpp, onCalc }: CexViewProps) => {
  const opps = state.cexOpps.filter(o => (o.type === 'tri' && filters.showTri) || (o.type === 'cross' && filters.showCross));
  const bestSpread = opps.length > 0 ? Math.max(...opps.map(o => o.spreadPct)).toFixed(3) + '%' : '—';

  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        <KPI label="Best Spread" value={bestSpread} cls="text-arb-green" />
        <KPI label="Est/hr (max)" value={`$${Math.round(state.hrProfit)}`} cls="text-arb-amber" />
        <KPI label="Scanned" value={state.totalScanned.toString()} cls="text-arb-blue" />
        <KPI label="CEX Opps" value={opps.length.toString()} cls="text-arb-head" />
      </div>

      {/* Cards */}
      {opps.length === 0 ? (
        <div className="text-center py-8 text-arb-muted text-[11px]">No CEX spreads above threshold.</div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {opps.slice(0, 30).map((o, i) => (
            <CexCard key={o.id} opp={o} onLog={onLogOpp} onCalc={onCalc} />
          ))}
        </div>
      )}

      {/* Countdown */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] text-arb-muted whitespace-nowrap">Next CEX scan in {state.countdownSec}s</span>
        <div className="flex-1 h-[2px] bg-arb-border rounded overflow-hidden">
          <div className="h-full bg-arb-green rounded transition-all duration-500" style={{ width: `${state.countdownPct}%` }} />
        </div>
      </div>
    </div>
  );
});

function CexCard({ opp: o, onLog, onCalc }: { opp: CexOpp; onLog: (o: CexOpp) => void; onCalc: (o: CexOpp) => void }) {
  const sc = o.spreadPct > 1 ? 'text-arb-green' : o.spreadPct > 0.3 ? 'text-arb-amber' : 'text-arb-muted';
  const typeClass = o.type === 'tri' ? 'bg-arb-purple/[0.12] border-arb-purple/30 text-arb-purple' : 'bg-arb-blue/[0.12] border-arb-blue/30 text-arb-blue';

  return (
    <div className="bg-arb-bg2 border border-arb-border rounded-lg p-2.5 px-3 animate-fade-in">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-sans font-semibold text-[13px] text-arb-head">{o.label}</span>
        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border ${typeClass}`}>
          {o.type === 'tri' ? 'TRI' : 'CROSS'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-arb-bg3 rounded p-1.5 px-2">
          <div className="text-[8px] text-arb-muted uppercase">Spread</div>
          <div className={`text-[12px] font-semibold mt-0.5 ${sc}`}>{o.spreadPct.toFixed(3)}%</div>
        </div>
        <div className="bg-arb-bg3 rounded p-1.5 px-2">
          <div className="text-[8px] text-arb-muted uppercase">Net Profit</div>
          <div className="text-[12px] font-semibold mt-0.5 text-arb-green">${o.net.toFixed(2)}</div>
        </div>
        <div className="bg-arb-bg3 rounded p-1.5 px-2">
          <div className="text-[8px] text-arb-muted uppercase">Buy</div>
          <div className="text-[12px] font-semibold mt-0.5 text-arb-head">${fmtPrice(o.buyAt)}</div>
        </div>
        <div className="bg-arb-bg3 rounded p-1.5 px-2">
          <div className="text-[8px] text-arb-muted uppercase">Sell</div>
          <div className="text-[12px] font-semibold mt-0.5 text-arb-head">${fmtPrice(o.sellAt)}</div>
        </div>
      </div>
      <div className="text-[9px] text-arb-muted mt-1.5">{o.buyEx} → {o.sellEx}</div>
      <div className="flex gap-1.5 mt-2">
        <button onClick={() => onLog(o)} className="px-2.5 py-1 bg-arb-green/[0.07] border border-arb-green/20 text-arb-green font-mono text-[9px] cursor-pointer rounded transition-all hover:bg-arb-green/15">
          📌 LOG
        </button>
        <button onClick={() => onCalc(o)} className="px-2.5 py-1 bg-arb-cyan/[0.07] border border-arb-cyan/20 text-arb-cyan font-mono text-[9px] cursor-pointer rounded transition-all hover:bg-arb-cyan/15">
          🧮 CALC
        </button>
      </div>
    </div>
  );
}

function KPI({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-arb-bg2 border border-arb-border p-2 px-2.5 rounded">
      <div className="text-[8px] tracking-wider uppercase text-arb-muted">{label}</div>
      <div className={`text-[16px] font-semibold font-sans mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
