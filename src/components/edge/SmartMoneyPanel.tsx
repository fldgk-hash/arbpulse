import type { SmartWallet } from '@/engine/edge/types';

export function SmartMoneyPanel({ wallets, missingKey }: { wallets: SmartWallet[]; missingKey: boolean }) {
  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Smart Money (WBTC)</h3>
      {missingKey ? (
        <div className="text-[10px] font-mono text-arb-amber">
          Add ETHERSCAN_API_KEY to enable smart-wallet tracking. Free key at etherscan.io/apis.
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-[10px] font-mono text-arb-muted">Scanning recent transfers…</div>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {wallets.slice(0, 12).map(w => (
            <div key={w.address} className="flex justify-between text-[10px] font-mono">
              <span className={w.label === 'smart_money' ? 'text-arb-green' : 'text-arb-text'}>
                {w.label === 'smart_money' ? '★ ' : ''}{w.address.slice(0, 6)}…{w.address.slice(-4)}
              </span>
              <span className="text-arb-muted">{w.trades}t · {w.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
