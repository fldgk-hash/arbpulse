import { memo, useEffect, useState } from 'react';
import type { ScannerState } from '@/hooks/useArbScanner';
import { fmtPrice } from '@/hooks/useArbScanner';

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

  const bestSpread = state.opportunities.length > 0
    ? Math.max(...state.opportunities.map(o => o.spreadPct)).toFixed(3) + '%'
    : '—';

  return (
    <header className="flex items-center justify-between px-5 bg-arb-bg2 flex-shrink-0 border-b border-arb-border2 relative z-10" style={{ height: 'var(--topbar-height, 58px)' }}>
      {/* Gradient bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-arb-green to-transparent opacity-50" />
      <div className="absolute bottom-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-arb-blue via-arb-purple to-transparent opacity-50" />

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-arb-green to-arb-blue flex items-center justify-center font-sans text-[15px] font-bold text-primary-foreground" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          A
        </div>
        <div>
          <span className="font-sans font-bold text-[17px] text-arb-head tracking-tight">ArbPulse</span>
          <span className="text-[8px] font-semibold text-primary-foreground bg-arb-green px-1.5 py-0.5 rounded-sm tracking-widest ml-1">PRO</span>
        </div>
      </div>

      {/* Center stats - desktop only */}
      <div className="hidden lg:flex gap-6 items-center">
        <StatChip>
          <div className={`w-1.5 h-1.5 rounded-full ${state.running ? 'bg-arb-green shadow-[0_0_8px_hsl(155,100%,48%,0.5)] animate-pulse-dot' : 'bg-arb-amber'}`} />
          <span className={`font-sans font-semibold ${state.running ? 'text-arb-green' : 'text-arb-amber'}`}>
            {state.running ? 'LIVE' : 'PAUSED'}
          </span>
        </StatChip>
        <StatChip>
          <span className="text-arb-muted">Opps</span>
          <span className="text-arb-head font-sans font-bold">{state.opportunities.length}</span>
        </StatChip>
        <StatChip>
          <span className="text-arb-muted">Best</span>
          <span className="text-arb-green font-sans font-bold">{bestSpread}</span>
        </StatChip>
        <StatChip>
          <span className="text-arb-muted">Scan</span>
          <span className="text-arb-head font-sans">#{state.scanCount}</span>
        </StatChip>
      </div>

      {/* Right controls */}
      <div className="flex gap-2 items-center">
        <span className="text-[11px] text-arb-muted tabular-nums min-w-[60px]">{clock}</span>
        <button
          onClick={onToggleSound}
          className={`bg-transparent border border-arb-border2 text-[11px] px-2 py-1 rounded cursor-pointer transition-all ${state.soundOn ? 'border-arb-amber text-arb-amber' : 'text-arb-muted'}`}
          title="Alert sound"
        >
          {state.soundOn ? '🔔' : '🔕'}
        </button>
        <button
          onClick={onToggleScanner}
          className="px-3.5 py-1.5 border border-arb-border2 bg-transparent text-arb-text cursor-pointer font-mono text-[9px] tracking-[1.5px] uppercase transition-all rounded hover:border-arb-green hover:text-arb-green hover:bg-arb-green/5"
        >
          {state.running ? '⏸ PAUSE' : '▶ RESUME'}
        </button>
      </div>
    </header>
  );
});

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[7px] text-[11px] px-2.5 py-1 bg-arb-bg3 border border-arb-border rounded-full">
      {children}
    </div>
  );
}
