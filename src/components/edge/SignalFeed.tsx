import type { EdgeSignal } from '@/engine/edge/types';

const PRIORITY: Record<string, number> = {
  short_squeeze: 0, smart_money_entry: 1, flow_bullish: 2, absorption_bullish: 3,
  long_squeeze: 4, smart_money_exit: 5, flow_bearish: 6, absorption_bearish: 7, spoof_detected: 8,
};

const sevColor: Record<string, string> = {
  critical: 'border-arb-red/60 bg-arb-red/10 text-arb-red',
  warn: 'border-arb-amber/60 bg-arb-amber/10 text-arb-amber',
  info: 'border-arb-green/60 bg-arb-green/10 text-arb-green',
};

export function SignalFeed({ signals }: { signals: EdgeSignal[] }) {
  const sorted = [...signals].sort((a, b) => (PRIORITY[a.kind] ?? 99) - (PRIORITY[b.kind] ?? 99) || b.ts - a.ts);
  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Live Signals</h3>
      {sorted.length === 0 ? (
        <div className="text-[10px] font-mono text-arb-muted">Watching the tape… signals appear when flow conditions trigger.</div>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {sorted.slice(0, 20).map(s => (
            <div key={s.id} className={`px-2 py-1 rounded border text-[10px] font-mono flex justify-between gap-2 ${sevColor[s.severity]}`}>
              <div className="flex flex-col min-w-0">
                <span className="font-bold">{s.label}</span>
                {s.detail && <span className="opacity-70 truncate">{s.detail}</span>}
              </div>
              <span className="opacity-60 text-[9px] whitespace-nowrap">{new Date(s.ts).toLocaleTimeString().slice(0, 5)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
