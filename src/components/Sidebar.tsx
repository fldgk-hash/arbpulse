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

      {/* CEX Filters */}
      <Section title="CEX Filters">
        <FilterInput label="Min Spread %" value={filters.minSpread} step={0.01} min={0}
          onChange={v => updateFilter('minSpread', v)} />
        <FilterInput label="Min Net Profit $" value={filters.minProfit} step={0.1} min={0}
          onChange={v => updateFilter('minProfit', v)} />
        <FilterInput label="Trade Size $" value={filters.tradeSize} step={100} min={100}
          onChange={v => updateFilter('tradeSize', v)} />
        <ToggleRow label="Triangular arb" value={filters.showTri} onChange={v => updateFilter('showTri', v)} />
        <ToggleRow label="Cross-exchange" value={filters.showCross} onChange={v => updateFilter('showCross', v)} />
        <ToggleRow label="Auto-refresh" value={filters.autoRefresh} onChange={v => updateFilter('autoRefresh', v)} />
      </Section>

      <Divider />

      {/* Scan Intervals */}
      <Section title="Scan Intervals">
        <div className="bg-arb-bg3 border border-arb-border rounded p-2.5 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-arb-text">⚡ CEX scan every</span>
            <span className="text-[11px] font-semibold text-arb-green tabular-nums">{filters.cexInterval}s</span>
          </div>
          <input type="range" min={5} max={120} step={5} value={filters.cexInterval}
            onChange={e => updateFilter('cexInterval', parseInt(e.target.value))}
            className="w-full h-[3px] rounded bg-arb-border2 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-arb-green [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-arb-bg2 [&::-webkit-slider-thumb]:cursor-pointer" />
          <div className="flex justify-between text-[8px] text-arb-muted mt-0.5">
            <span>5s</span><span>30s</span><span>60s</span><span>120s</span>
          </div>
        </div>
        <div className="bg-arb-bg3 border border-arb-border rounded p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-arb-text">🚀 DEX scan every</span>
            <span className="text-[11px] font-semibold text-arb-green tabular-nums">{filters.dexInterval}s</span>
          </div>
          <input type="range" min={10} max={300} step={10} value={filters.dexInterval}
            onChange={e => updateFilter('dexInterval', parseInt(e.target.value))}
            className="w-full h-[3px] rounded bg-arb-border2 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-arb-green [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-arb-bg2 [&::-webkit-slider-thumb]:cursor-pointer" />
          <div className="flex justify-between text-[8px] text-arb-muted mt-0.5">
            <span>10s</span><span>60s</span><span>180s</span><span>300s</span>
          </div>
        </div>
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
        <button onClick={onManualScan} className="w-full p-2 bg-transparent border border-arb-green text-arb-green font-sans text-[11px] font-semibold tracking-wider uppercase cursor-pointer transition-all rounded hover:bg-arb-green/10">
          ▶ MANUAL CEX SCAN
        </button>
        <button onClick={onClearResults} className="w-full p-2 bg-transparent border border-arb-red text-arb-red font-sans text-[11px] font-semibold tracking-wider uppercase cursor-pointer transition-all rounded hover:bg-arb-red/10 mt-2">
          ✕ CLEAR
        </button>
      </Section>

      <Divider />

      {/* Donate */}
      <Section title="">
        <div className="bg-arb-bg3 border border-arb-border2 rounded-lg p-2.5 text-center">
          <div className="font-sans font-semibold text-[12px] text-arb-head">☕ Support ArbPulse</div>
          <div className="text-[9px] text-arb-muted mt-1 mb-2">Help keep the real-data engine running</div>
          <div className="text-[8px] text-arb-blue cursor-pointer break-all p-1.5 bg-arb-bg2 rounded mt-1.5 hover:text-arb-amber transition-colors"
            onClick={() => navigator.clipboard?.writeText('bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz')}>
            bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz
          </div>
        </div>
      </Section>
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {title && <div className="font-sans text-[9px] font-bold tracking-[2px] uppercase text-arb-muted mb-2.5 pb-1.5 border-b border-arb-border">{title}</div>}
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
      <input className="w-full bg-arb-bg3 border border-arb-border2 text-arb-head px-2.5 py-[7px] font-mono text-xs outline-none transition-all mb-2 rounded focus:border-arb-green"
        type="number" value={value} step={step} min={min}
        onChange={e => onChange(parseFloat(e.target.value) || 0)} />
    </>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-arb-text">{label}</span>
      <div className={`w-[38px] h-5 rounded-[10px] cursor-pointer relative transition-all ${value ? 'bg-arb-green' : 'bg-arb-bg3 border-arb-border2'} border`}
        onClick={() => onChange(!value)}>
        <div className={`absolute w-3.5 h-3.5 bg-white rounded-full top-[2px] transition-all shadow-md ${value ? 'left-5' : 'left-[2px]'}`} />
      </div>
    </div>
  );
}
