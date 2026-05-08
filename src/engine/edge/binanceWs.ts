import { Orderbook } from './orderbook';
import type { LiquidationEntry, TradeTick } from './types';

export interface BinanceStreamCallbacks {
  onBook: (book: Orderbook) => void;
  onTrade: (t: TradeTick) => void;
  onLiquidation?: (entry: LiquidationEntry) => void;
  onStatus: (connected: boolean, msg?: string) => void;
}

export class BinanceWsStream {
  private ws: WebSocket | null = null;
  private book = new Orderbook();
  private buffer: any[] = [];
  private seeded = false;
  private symbol: string;
  private cb: BinanceStreamCallbacks;
  private retry = 0;
  private retryTimer: number | null = null;
  private stopped = false;

  constructor(symbol: string, cb: BinanceStreamCallbacks) {
    this.symbol = symbol.toLowerCase();
    this.cb = cb;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; }
  }

  getBook() { return this.book; }

  private connect() {
    const url = `wss://fstream.binance.com/stream?streams=${this.symbol}@depth@100ms/${this.symbol}@aggTrade/${this.symbol}@forceOrder`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.retry = 0;
      this.cb.onStatus(true, 'connected');
      this.seedBook();
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handle(msg);
      } catch {}
    };
    this.ws.onerror = () => {
      this.cb.onStatus(false, 'error');
    };
    this.ws.onclose = () => {
      this.cb.onStatus(false, 'closed');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    this.retry = Math.min(this.retry + 1, 6);
    const delay = Math.min(30000, 1000 * 2 ** this.retry);
    this.retryTimer = window.setTimeout(() => this.connect(), delay);
  }

  private async seedBook() {
    this.seeded = false;
    this.buffer = [];
    try {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/depth?symbol=${this.symbol.toUpperCase()}&limit=1000`);
      const snap = await r.json();
      this.book.seed(snap);
      // apply buffered events with U <= lastUpdateId+1 <= u
      const initial = this.book.lastUpdateId;
      for (const ev of this.buffer) {
        if (ev.u <= initial) continue;
        if (ev.U <= initial + 1 && ev.u >= initial + 1) {
          this.book.applyDiff(ev.b || [], ev.a || [], ev.u);
        } else if (ev.U > initial + 1) {
          this.book.applyDiff(ev.b || [], ev.a || [], ev.u);
        }
      }
      this.buffer = [];
      this.seeded = true;
      this.cb.onBook(this.book);
    } catch (e) {
      this.cb.onStatus(false, 'snapshot failed');
      this.scheduleReconnect();
    }
  }

  private handle(msg: any) {
    const event = msg.data || msg;
    if (event.e === 'depthUpdate') {
      if (!this.seeded) {
        this.buffer.push(event);
        if (this.buffer.length > 200) this.buffer.shift();
        return;
      }
      this.book.applyDiff(event.b || [], event.a || [], event.u);
      this.cb.onBook(this.book);
    } else if (event.e === 'aggTrade') {
      const t: TradeTick = {
        ts: event.T,
        price: parseFloat(event.p),
        qty: parseFloat(event.q),
        isSell: event.m === true,
      };
      this.cb.onTrade(t);
    } else if (event.e === 'forceOrder' && event.o) {
      const order = event.o;
      const side = order.S === 'SELL' ? 'long' : 'short';
      const price = Number(order.ap || order.p || 0);
      const qty = Number(order.q || 0);
      if (price > 0 && qty > 0) {
        this.cb.onLiquidation?.({
          ts: Number(event.E || order.T || Date.now()),
          side,
          amountUsd: price * qty,
          symbol: order.s || this.symbol.toUpperCase(),
        });
      }
    }
  }
}
