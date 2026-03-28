import { memo } from 'react';
import type { ScannerState, ScannerFilters } from '@/hooks/useArbScanner';
import { EXCHANGES } from '@/hooks/useArbScanner';

interface SidebarProps {
  state: ScannerState;
  filters: ScannerFilters;
  setFilters: React.Dispatch<React.SetStateAction<ScannerFilters>>;
  onManualScan: () => void;
  onClearResults: () => void;
}

export const Sidebar = memo(({ state, filters, setFilters, onManualScan, onClearResults }: SidebarProps) => {
  const updateFilter = (key: keyof ScannerFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-3.5 overflow-y-auto h-full">
      {/* Exchange Status */}
      <Section title="Exchange Status">
        <div className="grid grid-cols-2 gap-1.5">
          {EXCHANGES.map(ex => {
            const s = state.exchangeStatuses[ex.id];
            return (
              <div key={ex.id} className={`bg-arb-bg3 border rounded p-2 px-2.5 transition-colors ${s?.ok ? 'border-arb-green/20' : 'border-arb-border'}`}>
                <div className="font-sans text-[10px] font-semibold text-arb-head mb-0.5">{ex.name}</div>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${s?.ok ? 'bg-arb-green' : 'bg-arb-red'}`} />
                  <span className={s?.ok ? 'text-arb-green' : 'text-arb-muted'}>{s?.msg || 'Init'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Divider />

      {/* Scanner Filters */}
      <Section title="Scanner Filters">
        <FilterInput label="Min Spread %" value={filters.minSpread} step={0.01} min={0}
          onChange={v => updateFilter('minSpread', v)} />
        <FilterInput label="Min Net Profit (USD)" value={filters.minProfit} step={0.1} min={0}
          onChange={v => updateFilter('minProfit', v)} />
        <FilterInput label="Trade Size (USD)" value={filters.tradeSize} step={100} min={100}
          onChange={v => updateFilter('tradeSize', v)} />
        <FilterInput label="Alert on spread > %" value={filters.alertThreshold} step={0.05} min={0}
          onChange={v => updateFilter('alertThreshold', v)} />
        <ToggleRow label="Triangular arb" value={filters.showTri} onChange={v => updateFilter('showTri', v)} />
        <ToggleRow label="Cross-exchange" value={filters.showCross} onChange={v => updateFilter('showCross', v)} />
        <ToggleRow label="Auto-refresh" value={filters.autoRefresh} onChange={v => updateFilter('autoRefresh', v)} />
      </Section>

      <Divider />

      {/* Exchange Fees */}
      <Section title="Exchange Fees">
        <div className="grid grid-cols-2 gap-1.5">
          {EXCHANGES.map(ex => (
            <div key={ex.id} className="bg-arb-bg3 border border-arb-border rounded p-1.5 px-2">
              <div className="text-[8px] text-arb-muted font-sans font-semibold">{ex.name}</div>
              <div className="text-[11px] text-arb-text mt-0.5">{(ex.fee * 100).toFixed(2)}% taker</div>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Actions */}
      <Section title="">
        <button onClick={onManualScan} className="w-full p-2 bg-transparent border border-arb-green text-arb-green font-sans text-[11px] font-semibold tracking-wider uppercase cursor-pointer transition-all rounded hover:bg-arb-green/10 hover:shadow-[0_0_20px_hsl(155,100%,48%,0.15)]">
          ▶ MANUAL SCAN
        </button>
        <button onClick={onClearResults} className="w-full p-2 bg-transparent border border-arb-red text-arb-red font-sans text-[11px] font-semibold tracking-wider uppercase cursor-pointer transition-all rounded hover:bg-arb-red/10 mt-2">
          ✕ CLEAR RESULTS
        </button>
      </Section>

      <Divider />

      {/* Recent Opportunities */}
      <Section title="Recent Opportunities">
        {state.history.length === 0 ? (
          <div className="text-arb-muted text-[10px] text-center py-3">No history yet</div>
        ) : (
          <div className="flex flex-col gap-1">
            {state.history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 px-2 bg-arb-bg3 rounded border border-arb-border">
                <span className="text-[9px] text-arb-muted whitespace-nowrap">{h.time}</span>
                <span className="flex-1 text-[10px] text-arb-text">{h.label} · {h.spread.toFixed(3)}%</span>
                <span className="font-sans text-[11px] font-bold text-arb-green">+${h.profit.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      {/* Donate */}
      <Section title="">
        <div className="bg-gradient-to-br from-arb-amber/5 to-arb-green/5 border border-arb-amber/20 rounded-lg p-3.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-arb-amber to-arb-green" />
          <div className="font-sans text-[11px] font-bold text-arb-amber uppercase tracking-wider mb-1 flex items-center gap-1.5">☕ Support Development</div>
          <div className="text-[9px] text-arb-muted leading-relaxed mb-2.5">
            If ArbPulse Pro found you a profitable opportunity, consider a small tip!
          </div>
          <div className="flex gap-1.5 mb-2">
            <span className="text-[8px] font-sans font-bold px-2 py-0.5 rounded border text-[#f7931a] border-[#f7931a]/40 bg-[#f7931a]/10">₿ BTC</span>
          </div>
          <div className="text-[8px] text-arb-muted break-all text-center leading-relaxed bg-arb-bg3 border border-arb-border rounded p-1.5 cursor-pointer hover:border-arb-amber hover:text-arb-amber transition-all font-mono"
            onClick={() => {
              navigator.clipboard?.writeText('bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz');
            }}>
            bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz
          </div>
          <div className="text-[9px] text-arb-muted text-center leading-relaxed mt-2 italic">⚡ Every satoshi helps ship new features</div>
        </div>
      </Section>
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {title && (
        <div className="font-sans text-[9px] font-bold tracking-[2px] uppercase text-arb-muted mb-2.5 pb-1.5 border-b border-arb-border">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-t border-arb-border my-3" />;
}

function FilterInput({ label, value, step, min, onChange }: { label: string; value: number; step: number; min: number; onChange: (v: number) => void }) {
  return (
    <>
      <div className="text-[9px] text-arb-muted mb-1 uppercase tracking-wider">{label}</div>
      <input
        className="w-full bg-arb-bg3 border border-arb-border2 text-arb-head px-2.5 py-[7px] font-mono text-xs outline-none transition-all mb-2 rounded focus:border-arb-green focus:shadow-[0_0_0_2px_hsl(155,100%,48%,0.1)]"
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-arb-text">{label}</span>
      <div
        className={`w-[38px] h-5 rounded-[10px] cursor-pointer relative transition-all ${value ? 'bg-arb-green border-arb-green shadow-[0_0_12px_hsl(155,100%,48%,0.3)]' : 'bg-arb-bg3 border-arb-border2'} border`}
        onClick={() => onChange(!value)}
      >
        <div className={`absolute w-3.5 h-3.5 bg-white rounded-full top-[2px] transition-all shadow-md ${value ? 'left-5' : 'left-[2px]'}`} />
      </div>
    </div>
  );
}
