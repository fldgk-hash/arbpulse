import { memo, useEffect, useRef } from 'react';
import type { ScannerState } from '@/hooks/useArbScanner';
import { SYMBOLS, EXCHANGES } from '@/hooks/useArbScanner';

interface LogPanelProps {
  state: ScannerState;
  onClearLogs: () => void;
}

export const LogPanel = memo(({ state, onClearLogs }: LogPanelProps) => {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [state.logs.length]);

  const typeColor: Record<string, string> = {
    ok: 'text-arb-green',
    info: 'text-arb-text',
    warn: 'text-arb-amber',
    err: 'text-arb-red',
  };

  return (
    <div className="flex flex-col h-full bg-arb-bg2">
      {/* Head */}
      <div className="px-3.5 py-2.5 border-b border-arb-border flex items-center justify-between flex-shrink-0">
        <div className="font-sans text-xs font-bold text-arb-head flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-arb-green animate-pulse-dot" />
          Scanner Log
        </div>
        <span onClick={onClearLogs} className="text-[9px] font-sans font-semibold text-arb-muted cursor-pointer tracking-wide uppercase px-2 py-0.5 border border-arb-border rounded transition-all hover:border-arb-red hover:text-arb-red">
          CLEAR
        </span>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-2.5 py-2.5 text-[10px] leading-7">
        {state.logs.map((entry, i) => (
          <div key={i} className="flex gap-2 animate-fade-in">
            <span className="text-arb-muted whitespace-nowrap flex-shrink-0 text-[9px]">{entry.time}</span>
            <span className={typeColor[entry.type]}>{entry.msg}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 p-2.5 border-t border-arb-border flex-shrink-0">
        <StatBox label="Total Scanned" value={state.totalScanned.toString()} />
        <StatBox label="Best Profit" value={`$${state.bestProfit.toFixed(2)}`} className="text-arb-green" />
        <StatBox label="Pairs Checked" value={(SYMBOLS.length * EXCHANGES.length).toString()} />
        <StatBox label="Est. Profit/hr" value={`$${Math.round(state.hrProfit)}`} className="text-arb-amber" />
      </div>
    </div>
  );
});

function StatBox({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-arb-bg3 p-2 px-2.5 rounded border border-arb-border">
      <div className="text-[8px] font-sans font-semibold text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-base font-sans font-bold text-arb-head mt-0.5 ${className}`}>{value}</div>
    </div>
  );
}
