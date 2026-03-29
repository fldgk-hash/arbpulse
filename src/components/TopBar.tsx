import { memo, useEffect, useState } from 'react';
import type { ScannerState } from '@/hooks/useArbScanner';

interface TopBarProps {
  state: ScannerState;
  onToggleScanner: () => void;
  onToggleSound: () => void;
}

export const TopBar = memo(({ state, onToggleScanner, onToggleSound }: TopBarProps) => {
  const [clock, setClock] = useState('--:--:--');
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(t);
  }, []);

  const bestSpread = state.cexOpps.length > 0
    ? Math.max(...state.cexOpps.map(o => o.spreadPct)).toFixed(2) + '%'
    : (state.filteredDexOpps.length > 0 ? Math.max(...state.filteredDexOpps.map(o => o.spreadPct)).toFixed(2) + '%' : '—');

  return (
    <header className="flex items-center justify-between px-3 bg-arb-bg2 flex-shrink-0 border-b border-arb-border2 z-20" style={{ height: '52px' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-[26px] h-[26px] bg-arb-green rounded-[5px] flex items-center justify-center font-sans font-bold text-[13px] text-black">A</div>
        <span className="font-sans font-bold text-[15px] text-arb-head">ArbPulse</span>
        <span className="text-[8px] px-1.5 py-0.5 bg-arb-purple/15 border border-arb-purple text-arb-purple rounded-sm ml-0.5">PRO</span>
      </div>

      {/* Center stats */}
      <div className="hidden sm:flex gap-2.5 items-center flex-1 justify-center">
        <StatChip>
          <div className={`w-1.5 h-1.5 rounded-full ${state.running ? 'bg-arb-green animate-pulse-dot' : 'bg-arb-amber'}`} />
          <span className={state.running ? 'text-arb-green' : 'text-arb-amber'}>{state.running ? 'LIVE' : 'PAUSED'}</span>
        </StatChip>
        <StatChip>Opps&nbsp;<b className="text-arb-head font-medium">{state.filteredDexOpps.length + state.cexOpps.length}</b></StatChip>
        <StatChip>Best&nbsp;<b className="text-arb-head font-medium">{bestSpread}</b></StatChip>
      </div>

      {/* Right */}
      <div className="flex gap-1.5 items-center flex-shrink-0">
        <span className="text-[10px] text-arb-muted">{clock}</span>
        <button onClick={onToggleSound} className="bg-transparent border-none cursor-pointer text-[16px] p-0.5 leading-none">
          {state.soundOn ? '🔔' : '🔕'}
        </button>
        <button onClick={onToggleScanner}
          className="hidden sm:inline-flex px-2 py-1 border border-arb-border2 bg-transparent text-arb-text cursor-pointer font-mono text-[9px] tracking-wider uppercase rounded hover:border-arb-green hover:text-arb-green transition-colors">
          {state.running ? '⏸' : '▶'}
        </button>
      </div>
    </header>
  );
});

function StatChip({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 text-[10px] text-arb-muted">{children}</div>;
}
