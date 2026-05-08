import type { OrderbookLevel } from '@/engine/edge/types';

interface Props { bids: OrderbookLevel[]; asks: OrderbookLevel[] }

export function OrderbookLadder({ bids, asks }: Props) {
  const maxQty = Math.max(
    ...bids.slice(0, 10).map(l => l.qty),
    ...asks.slice(0, 10).map(l => l.qty),
    0.0001,
  );

  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Orderbook (top 10)</h3>
      <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
        <div>
          <div className="text-arb-muted text-[9px] mb-1 flex justify-between"><span>BID SIZE</span><span>PRICE</span></div>
          {bids.slice(0, 10).map((l, i) => (
            <div key={i} className="relative h-4 flex items-center">
              <div className="absolute right-0 top-0 bottom-0 bg-arb-green/15" style={{ width: `${(l.qty / maxQty) * 100}%` }} />
              <div className="relative flex justify-between w-full px-1">
                <span className="text-arb-text">{l.qty.toFixed(3)}</span>
                <span className="text-arb-green">{l.price.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-arb-muted text-[9px] mb-1 flex justify-between"><span>PRICE</span><span>ASK SIZE</span></div>
          {asks.slice(0, 10).map((l, i) => (
            <div key={i} className="relative h-4 flex items-center">
              <div className="absolute left-0 top-0 bottom-0 bg-arb-red/15" style={{ width: `${(l.qty / maxQty) * 100}%` }} />
              <div className="relative flex justify-between w-full px-1">
                <span className="text-arb-red">{l.price.toFixed(1)}</span>
                <span className="text-arb-text">{l.qty.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
