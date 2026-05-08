import { useEdgeEngine } from '@/hooks/useEdgeEngine';
import { OrderbookLadder } from './OrderbookLadder';
import { ImbalanceGauge } from './ImbalanceGauge';
import { CvdChart } from './CvdChart';
import { BuySellMeter } from './BuySellMeter';
import { LiquidationFeed } from './LiquidationFeed';
import { SmartMoneyPanel } from './SmartMoneyPanel';
import { SignalFeed } from './SignalFeed';

export function EdgeView() {
  const snap = useEdgeEngine();

  if (!snap) {
    return (
      <div className="flex-1 flex items-center justify-center text-arb-muted text-xs font-mono">
        Connecting to Binance order flow…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-arb-bg" style={{ WebkitOverflowScrolling: 'touch' }}>
      <header className="flex items-center justify-between">
        <div>
          <div className="text-arb-text font-bold text-sm">{snap.symbol} · ORDER FLOW</div>
          <div className="text-arb-muted text-[10px] font-mono">
            mid ${snap.midPrice.toFixed(2)} · spread ${snap.spread.toFixed(2)}
          </div>
        </div>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${snap.connected ? 'bg-arb-green/20 text-arb-green' : 'bg-arb-red/20 text-arb-red'}`}>
          {snap.connected ? '● LIVE' : '○ RECONNECTING'}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <ImbalanceGauge value={snap.imbalanceNorm} ratio={snap.imbalance} />
        <BuySellMeter buy={snap.buyVol} sell={snap.sellVol} />
      </div>

      <CvdChart value={snap.cvd} />

      <SignalFeed signals={snap.signals} />

      <OrderbookLadder bids={snap.topBids} asks={snap.topAsks} />

      <LiquidationFeed
        entries={snap.liquidations}
        longUsd={snap.longUsd5m}
        shortUsd={snap.shortUsd5m}
        pressure={snap.liqPressure}
        unavailable={snap.liquidationsUnavailable}
      />

      <SmartMoneyPanel wallets={snap.wallets} unavailable={snap.walletsUnavailable} />
    </div>
  );
}
