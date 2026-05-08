import type { SmartWallet } from '@/engine/edge/types';

export function SmartMoneyPanel({ wallets, unavailable }: { wallets: SmartWallet[]; unavailable: boolean }) {
  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Top Trader Positioning</h3>
      {unavailable ? (
        <div className="text-[10px] font-mono text-arb-amber">
          Binance top-trader feed unavailable. Retrying…
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-[10px] font-mono text-arb-muted">Reading Binance top-trader accounts…</div>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {wallets.slice(0, 12).map(w => (
            <div key={w.address} className="flex justify-between text-[10px] font-mono">
              <span className={w.label === 'smart_money' ? 'text-arb-green' : 'text-arb-text'}>
                {w.label === 'smart_money' ? '★ ' : ''}{w.name || `${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
              </span>
              <span className="text-arb-muted text-right">{w.detail || `${w.trades}t · ${w.score.toFixed(1)}`}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
