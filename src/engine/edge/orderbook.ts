import type { OrderbookLevel, OrderbookSnapshot } from './types';

export class Orderbook {
  bids = new Map<number, number>();
  asks = new Map<number, number>();
  lastUpdateId = 0;

  seed(snapshot: { bids: [string, string][]; asks: [string, string][]; lastUpdateId: number }) {
    this.bids.clear(); this.asks.clear();
    for (const [p, q] of snapshot.bids) {
      const qty = parseFloat(q);
      if (qty > 0) this.bids.set(parseFloat(p), qty);
    }
    for (const [p, q] of snapshot.asks) {
      const qty = parseFloat(q);
      if (qty > 0) this.asks.set(parseFloat(p), qty);
    }
    this.lastUpdateId = snapshot.lastUpdateId;
  }

  applyDiff(b: [string, string][], a: [string, string][], finalUpdateId: number) {
    for (const [p, q] of b) {
      const price = parseFloat(p), qty = parseFloat(q);
      if (qty === 0) this.bids.delete(price); else this.bids.set(price, qty);
    }
    for (const [p, q] of a) {
      const price = parseFloat(p), qty = parseFloat(q);
      if (qty === 0) this.asks.delete(price); else this.asks.set(price, qty);
    }
    this.lastUpdateId = finalUpdateId;
    // cap size
    if (this.bids.size > 500) this.trim(this.bids, true);
    if (this.asks.size > 500) this.trim(this.asks, false);
  }

  private trim(m: Map<number, number>, desc: boolean) {
    const arr = [...m.entries()].sort((a, b) => desc ? b[0] - a[0] : a[0] - b[0]);
    m.clear();
    for (const [p, q] of arr.slice(0, 200)) m.set(p, q);
  }

  topBids(n = 20): OrderbookLevel[] {
    return [...this.bids.entries()].sort((a, b) => b[0] - a[0]).slice(0, n).map(([price, qty]) => ({ price, qty }));
  }
  topAsks(n = 20): OrderbookLevel[] {
    return [...this.asks.entries()].sort((a, b) => a[0] - b[0]).slice(0, n).map(([price, qty]) => ({ price, qty }));
  }

  snapshot(): OrderbookSnapshot {
    return { bids: this.topBids(50), asks: this.topAsks(50), lastUpdateId: this.lastUpdateId, ts: Date.now() };
  }
}
