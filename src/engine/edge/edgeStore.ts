import { BinanceWsStream } from './binanceWs';
import { TradeWindow, imbalanceTopN, SpoofTracker } from './metrics';
import type { EdgeSnapshot, EdgeSignal, TradeTick, LiquidationEntry, SmartWallet } from './types';

type Listener = (s: EdgeSnapshot) => void;

class EdgeStore {
  private symbol = 'BTCUSDT';
  private stream: BinanceWsStream | null = null;
  private trades = new TradeWindow();
  private spoof = new SpoofTracker();
  private listeners = new Set<Listener>();
  private connected = false;
  private signals: EdgeSignal[] = [];
  private prevImbalance = 1;
  private prevCvd = 0;
  private prevMid = 0;
  private liquidations: LiquidationEntry[] = [];
  private wallets: SmartWallet[] = [];
  private liquidationsUnavailable = false;
  private walletsUnavailable = false;
  private tickHandle: number | null = null;
  private walHandle: number | null = null;
  private started = false;
  private lastSnapshot: EdgeSnapshot | null = null;

  start() {
    if (this.started) return;
    this.started = true;
    this.stream = new BinanceWsStream(this.symbol, {
      onBook: () => {},
      onTrade: (t: TradeTick) => this.trades.add(t),
      onLiquidation: (entry) => this.addLiquidation(entry),
      onStatus: (c) => { this.connected = c; },
    });
    this.stream.start();
    this.tickHandle = window.setInterval(() => this.tick(), 1000);
    this.walHandle = window.setInterval(() => this.fetchWallets(), 30000);
    // initial fetch
    this.fetchWallets();
  }

  stop() {
    this.started = false;
    this.stream?.stop();
    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.walHandle) clearInterval(this.walHandle);
    this.tickHandle = this.walHandle = null;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    if (!this.started) this.start();
    if (this.lastSnapshot) l(this.lastSnapshot);
    return () => {
      this.listeners.delete(l);
      // keep engine running even if no listeners (data stays warm)
    };
  }

  private async fetchLiquidations() {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('edge-proxy', {
        body: { kind: 'liquidations', symbol: this.symbol.replace('USDT', '') },
      });
      if (error) throw error;
      if (data?.missingKey) { this.liquidationsKeyMissing = true; return; }
      this.liquidationsKeyMissing = false;
      if (Array.isArray(data?.entries)) {
        const now = Date.now();
        const fresh: LiquidationEntry[] = data.entries.map((e: any) => ({
          ts: e.ts || now, side: e.side, amountUsd: e.amountUsd, symbol: e.symbol || this.symbol,
        }));
        this.liquidations = [...fresh, ...this.liquidations].slice(0, 100);
      }
    } catch {
      // silent — engine continues
    }
  }

  private async fetchWallets() {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('edge-proxy', {
        body: { kind: 'wallets' },
      });
      if (error) throw error;
      if (data?.missingKey) { this.walletsKeyMissing = true; return; }
      this.walletsKeyMissing = false;
      if (Array.isArray(data?.wallets)) this.wallets = data.wallets;
    } catch {
      // silent — engine continues
    }
  }

  private addSignal(sig: EdgeSignal) {
    // dedupe by kind within 10s
    const now = Date.now();
    const recent = this.signals.find(s => s.kind === sig.kind && now - s.ts < 10_000);
    if (recent) return;
    this.signals.unshift(sig);
    this.signals = this.signals.slice(0, 50);
  }

  private tick() {
    this.trades.prune();
    const book = this.stream?.getBook();
    if (!book) return;
    const topB = book.topBids(20);
    const topA = book.topAsks(20);
    if (topB.length === 0 || topA.length === 0) return;
    this.spoof.observe(topB, topA);
    const { ratio, norm } = imbalanceTopN(topB, topA, 20);
    const cvd = this.trades.cvd();
    const { buy, sell } = this.trades.buySell();
    const mid = (topB[0].price + topA[0].price) / 2;
    const spread = topA[0].price - topB[0].price;
    const stddev = this.trades.priceStdDev();
    const now = Date.now();

    // ----- signals -----
    if (ratio > 1.3 && cvd > this.prevCvd && cvd > 0) {
      this.addSignal({ id: `flow_b_${now}`, kind: 'flow_bullish', label: 'BUY PRESSURE', severity: 'info', ts: now, detail: `imb ${ratio.toFixed(2)} · cvd↑` });
    }
    if (ratio < 0.8 && cvd < this.prevCvd && cvd < 0) {
      this.addSignal({ id: `flow_s_${now}`, kind: 'flow_bearish', label: 'SELL PRESSURE', severity: 'warn', ts: now, detail: `imb ${ratio.toFixed(2)} · cvd↓` });
    }
    // absorption: high sell vol but mid stable
    if (sell > buy * 1.5 && stddev / mid < 0.0002 && sell > 50_000) {
      this.addSignal({ id: `abs_b_${now}`, kind: 'absorption_bullish', label: 'HIDDEN BUYER', severity: 'critical', ts: now, detail: `sell $${(sell/1000).toFixed(0)}k absorbed` });
    }
    if (buy > sell * 1.5 && stddev / mid < 0.0002 && buy > 50_000) {
      this.addSignal({ id: `abs_s_${now}`, kind: 'absorption_bearish', label: 'HIDDEN SELLER', severity: 'warn', ts: now, detail: `buy $${(buy/1000).toFixed(0)}k absorbed` });
    }
    // spoof
    if (this.spoof.recent().length > 0) {
      const last = this.spoof.recent()[this.spoof.recent().length - 1];
      this.addSignal({ id: `spoof_${last.ts}`, kind: 'spoof_detected', label: 'FAKE LIQUIDITY', severity: 'warn', ts: last.ts, detail: `${last.side} ${last.qty.toFixed(2)} @ ${last.price.toFixed(0)}` });
    }
    // squeeze detection from liquidations
    const recentLiqs = this.liquidations.filter(l => now - l.ts < 5 * 60_000);
    const longUsd = recentLiqs.filter(l => l.side === 'long').reduce((s, l) => s + l.amountUsd, 0);
    const shortUsd = recentLiqs.filter(l => l.side === 'short').reduce((s, l) => s + l.amountUsd, 0);
    const liqPressure = longUsd + shortUsd > 0 ? (shortUsd - longUsd) / (longUsd + shortUsd) : 0;
    if (shortUsd > 500_000 && mid > this.prevMid) {
      this.addSignal({ id: `sq_up_${now}`, kind: 'short_squeeze', label: 'SQUEEZE UP', severity: 'critical', ts: now, detail: `$${(shortUsd/1000).toFixed(0)}k shorts liq'd` });
    }
    if (longUsd > 500_000 && mid < this.prevMid) {
      this.addSignal({ id: `sq_dn_${now}`, kind: 'long_squeeze', label: 'SQUEEZE DOWN', severity: 'warn', ts: now, detail: `$${(longUsd/1000).toFixed(0)}k longs liq'd` });
    }
    // smart money
    for (const w of this.wallets) {
      if (w.label === 'smart_money' && w.lastAction && now - w.lastAction.ts < 60_000) {
        const kind = w.lastAction.kind === 'buy' ? 'smart_money_entry' : 'smart_money_exit';
        const label = w.lastAction.kind === 'buy' ? 'SMART BUY' : 'SMART EXIT';
        this.addSignal({ id: `${kind}_${w.address}_${w.lastAction.ts}`, kind, label, severity: 'critical', ts: w.lastAction.ts, detail: `${w.address.slice(0, 8)}… score ${w.score.toFixed(1)}` });
      }
    }

    this.prevImbalance = ratio;
    this.prevCvd = cvd;
    this.prevMid = mid;

    const snap: EdgeSnapshot = {
      symbol: this.symbol,
      connected: this.connected,
      midPrice: mid,
      imbalance: ratio,
      imbalanceNorm: norm,
      cvd,
      buyVol: buy,
      sellVol: sell,
      spread,
      topBids: topB.slice(0, 12),
      topAsks: topA.slice(0, 12),
      signals: [...this.signals],
      liquidations: this.liquidations.slice(0, 20),
      longUsd5m: longUsd,
      shortUsd5m: shortUsd,
      liqPressure,
      wallets: this.wallets,
      liquidationsKeyMissing: this.liquidationsKeyMissing,
      walletsKeyMissing: this.walletsKeyMissing,
      lastTick: now,
    };
    this.lastSnapshot = snap;
    for (const l of this.listeners) l(snap);
  }
}

export const edgeStore = new EdgeStore();
