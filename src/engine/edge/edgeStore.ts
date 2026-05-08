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

  private addLiquidation(entry: LiquidationEntry) {
    this.liquidationsUnavailable = false;
    this.liquidations = [entry, ...this.liquidations]
      .filter((l, i, arr) => arr.findIndex(x => x.ts === l.ts && x.amountUsd === l.amountUsd && x.side === l.side) === i)
      .slice(0, 100);
  }

  private async fetchWallets() {
    try {
      const r = await fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${this.symbol}&period=5m&limit=2`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`top trader feed ${r.status}`);
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('top trader feed empty');
      const latest = rows[rows.length - 1];
      const prev = rows.length > 1 ? rows[rows.length - 2] : latest;
      const longAccount = Number(latest.longAccount || 0);
      const shortAccount = Number(latest.shortAccount || 0);
      const ratio = Number(latest.longShortRatio || 0);
      const prevRatio = Number(prev.longShortRatio || ratio);
      const delta = ratio - prevRatio;
      const actionTs = Date.now();
      this.walletsUnavailable = false;
      this.wallets = [
        {
          address: 'binance-top-trader-long-accounts',
          name: 'Top traders long',
          detail: `${(longAccount * 100).toFixed(1)}% accounts · ratio ${ratio.toFixed(3)}`,
          score: Number((Math.max(0, ratio - 1) * 10 + Math.max(0, delta) * 100).toFixed(2)),
          trades: 1,
          label: ratio > 1.05 || delta > 0.01 ? 'smart_money' : 'tracking',
          lastAction: delta > 0.005 ? { ts: actionTs, kind: 'buy', symbol: this.symbol } : undefined,
        },
        {
          address: 'binance-top-trader-short-accounts',
          name: 'Top traders short',
          detail: `${(shortAccount * 100).toFixed(1)}% accounts · ratio ${(1 / Math.max(ratio, 0.0001)).toFixed(3)}`,
          score: Number((Math.max(0, 1 - ratio) * 10 + Math.max(0, -delta) * 100).toFixed(2)),
          trades: 1,
          label: ratio < 0.95 || delta < -0.01 ? 'smart_money' : 'tracking',
          lastAction: delta < -0.005 ? { ts: actionTs, kind: 'sell', symbol: this.symbol } : undefined,
        },
      ];
    } catch {
      this.walletsUnavailable = true;
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
