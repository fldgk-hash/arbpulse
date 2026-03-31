import React, { memo } from 'react';
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

      {/* DEX Early Pump Filters */}
      <Section title="DEX Pump Filters">
        {/* Vol/MC Ratio slider */}
        <div className="bg-arb-bg3 border border-arb-border rounded p-2.5 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-arb-text">🔥 Vol/MC min</span>
            <span className={`text-[11px] font-semibold tabular-nums ${(filters as any).minVolumeMCRatio > 0 ? 'text-arb-green' : 'text-arb-muted'}`}>
              {(filters as any).minVolumeMCRatio === 0 ? 'OFF' : `${((filters as any).minVolumeMCRatio).toFixed(1)}×`}
            </span>
          </div>
          <input type="range" min={0} max={10} step={0.5} value={(filters as any).minVolumeMCRatio || 0}
            onChange={e => updateFilter('minVolumeMCRatio' as any, parseFloat(e.target.value))}
            className="w-full h-[3px] rounded bg-arb-border2 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-arb-amber [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-arb-bg2 [&::-webkit-slider-thumb]:cursor-pointer" />
          <div className="flex justify-between text-[8px] text-arb-muted mt-0.5">
            <span>OFF</span><span>2.5×</span><span>5×</span><span>7.5×</span><span>10×</span>
          </div>
          <div className="text-[8px] text-arb-muted mt-1 leading-relaxed">
            vol24h ÷ (liq × 2.2) · 4.5× = aggressive pump · 0 = disabled
          </div>
        </div>
        <FilterInput label="Min Liq $" value={filters.dexMinLiq} step={1000} min={0}
          onChange={v => updateFilter('dexMinLiq', v)} />
        <FilterInput label="Min Vol 24h $" value={filters.dexMinVol} step={1000} min={0}
          onChange={v => updateFilter('dexMinVol', v)} />
        <FilterInput label="Min DEX Spread %" value={filters.dexMinSpread} step={0.005} min={0}
          onChange={v => updateFilter('dexMinSpread', v)} />
        <ToggleRow label="New only (<5h)" value={filters.dexNewOnly} onChange={v => updateFilter('dexNewOnly', v)} />
        <ToggleRow label="Safe only" value={filters.dexSafeOnly} onChange={v => updateFilter('dexSafeOnly', v)} />
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
        <div className="rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(255,185,48,.04),rgba(0,245,147,.04))', border: '1px solid rgba(255,185,48,.2)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,hsl(var(--arb-amber)),hsl(var(--arb-green)))' }} />
          <div className="p-2.5">
            <div className="font-sans font-bold text-[11px] text-arb-amber uppercase tracking-wider mb-1">☕ Support Development</div>
            <div className="text-[9px] text-arb-muted mb-2.5 leading-relaxed">If ArbPulse found you a profitable opportunity, a small tip keeps the engine running!</div>

            {/* BTC QR */}
            <div className="text-[8px] text-arb-muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <span style={{ color: '#f7931a' }}>₿</span> BTC
            </div>
            <div className="bg-white rounded-md mb-1.5 overflow-hidden" style={{ padding: '4px' }}>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=bitcoin:bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz&margin=2"
                alt="BTC donation QR"
                style={{ width: '100%', display: 'block', borderRadius: '4px' }}
                loading="lazy"
              />
            </div>
            <CopyAddr
              addr="bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz"
              color="text-arb-amber"
            />

            {/* SOL QR */}
            <div className="text-[8px] text-arb-muted uppercase tracking-wider mt-2.5 mb-1 flex items-center gap-1">
              <span className="text-arb-green">◎</span> SOL
            </div>
            <div className="bg-white rounded-md mb-1.5 overflow-hidden" style={{ padding: '4px' }}>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=solana:8hyvZTaKUWEX3Zfd5xVZiXi7V4NhXQJ5ktuDtbx1svcp&margin=2"
                alt="SOL donation QR"
                style={{ width: '100%', display: 'block', borderRadius: '4px' }}
                loading="lazy"
              />
            </div>
            <CopyAddr
              addr="8hyvZTaKUWEX3Zfd5xVZiXi7V4NhXQJ5ktuDtbx1svcp"
              color="text-arb-green"
            />

            <div className="text-center text-[8px] text-arb-muted mt-2 italic">⚡ Every satoshi/lamport helps · Thank you!</div>
          </div>
        </div>
      </Section>
    </div>
  );
});

function CopyAddr({ addr, color }: { addr: string; color: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`w-full text-left text-[8px] font-mono p-1.5 rounded cursor-pointer transition-all break-all bg-arb-bg2 border border-arb-border hover:border-arb-amber ${color}`}>
      {copied ? '✓ Copied!' : addr}
    </button>
  );
}

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
