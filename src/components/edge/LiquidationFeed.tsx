import type { LiquidationEntry } from '@/engine/edge/types';

interface Props {
  entries: LiquidationEntry[];
  longUsd: number;
  shortUsd: number;
  pressure: number;
  unavailable: boolean;
}

export function LiquidationFeed({ entries, longUsd, shortUsd, pressure, unavailable }: Props) {
  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Liquidations (5m)</h3>
      {unavailable ? (
        <div className="text-[10px] font-mono text-arb-amber">
          Binance force-order stream unavailable. Reconnecting…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-[10px] font-mono text-arb-muted">Waiting for Binance force-order prints…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[10px]">
            <div className="bg-arb-red/10 rounded p-1">
              <div className="text-arb-red">LONGS LIQ</div>
              <div className="text-arb-text">${(longUsd / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-arb-green/10 rounded p-1">
              <div className="text-arb-green">SHORTS LIQ</div>
              <div className="text-arb-text">${(shortUsd / 1000).toFixed(1)}k</div>
            </div>
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {entries.slice(0, 10).map((e, i) => (
              <div key={i} className="flex justify-between text-[10px] font-mono">
                <span className={e.side === 'long' ? 'text-arb-red' : 'text-arb-green'}>
                  {e.side === 'long' ? 'LONG' : 'SHORT'} {e.symbol}
                </span>
                <span className="text-arb-text">${(e.amountUsd / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
