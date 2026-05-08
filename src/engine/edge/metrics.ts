import type { TradeTick, OrderbookLevel } from './types';

export class TradeWindow {
  private trades: TradeTick[] = [];
  private windowMs = 60_000;

  add(t: TradeTick) {
    this.trades.push(t);
    this.prune();
  }

  prune(now = Date.now()) {
    const cutoff = now - this.windowMs;
    while (this.trades.length && this.trades[0].ts < cutoff) this.trades.shift();
  }

  cvd(): number {
    let v = 0;
    for (const t of this.trades) v += (t.isSell ? -1 : 1) * t.qty * t.price;
    return v;
  }

  buySell(): { buy: number; sell: number } {
    let buy = 0, sell = 0;
    for (const t of this.trades) {
      const usd = t.qty * t.price;
      if (t.isSell) sell += usd; else buy += usd;
    }
    return { buy, sell };
  }

  priceStdDev(): number {
    if (this.trades.length < 5) return 0;
    const prices = this.trades.map(t => t.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const v = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
    return Math.sqrt(v);
  }

  count() { return this.trades.length; }
}

export function imbalanceTopN(bids: OrderbookLevel[], asks: OrderbookLevel[], n = 20): { ratio: number; norm: number } {
  const b = bids.slice(0, n).reduce((s, l) => s + l.qty, 0);
  const a = asks.slice(0, n).reduce((s, l) => s + l.qty, 0);
  if (a === 0 && b === 0) return { ratio: 1, norm: 0 };
  if (a === 0) return { ratio: 99, norm: 1 };
  const ratio = b / a;
  // normalize to -1..+1 around 1
  const norm = Math.max(-1, Math.min(1, (b - a) / (b + a)));
  return { ratio, norm };
}

// spoof tracker: detect large orders that disappear quickly
export class SpoofTracker {
  private seen = new Map<string, { qty: number; ts: number }>();
  private events: { ts: number; price: number; qty: number; side: 'bid' | 'ask' }[] = [];
  threshold = 5; // BTC qty

  observe(bids: OrderbookLevel[], asks: OrderbookLevel[]) {
    const now = Date.now();
    const live = new Set<string>();
    const check = (levels: OrderbookLevel[], side: 'bid' | 'ask') => {
      for (const l of levels.slice(0, 10)) {
        if (l.qty < this.threshold) continue;
        const key = `${side}:${l.price}`;
        live.add(key);
        if (!this.seen.has(key)) this.seen.set(key, { qty: l.qty, ts: now });
      }
    };
    check(bids, 'bid'); check(asks, 'ask');
    // detect removals
    for (const [key, rec] of this.seen) {
      if (!live.has(key) && now - rec.ts < 2500) {
        const [side, priceStr] = key.split(':');
        this.events.push({ ts: now, price: parseFloat(priceStr), qty: rec.qty, side: side as 'bid' | 'ask' });
        this.seen.delete(key);
      } else if (now - rec.ts > 60_000) {
        this.seen.delete(key);
      }
    }
    // prune events
    this.events = this.events.filter(e => now - e.ts < 30_000);
  }

  recent(): typeof this.events { return this.events; }
}
