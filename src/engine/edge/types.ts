export interface OrderbookLevel { price: number; qty: number }
export interface OrderbookSnapshot {
  bids: OrderbookLevel[]; // sorted desc
  asks: OrderbookLevel[]; // sorted asc
  lastUpdateId: number;
  ts: number;
}
export interface TradeTick {
  ts: number;
  price: number;
  qty: number;
  isSell: boolean; // m=true => buyer is maker => aggressor is seller
}
export interface EdgeSignal {
  id: string;          // unique
  kind: string;        // flow_bullish, ...
  label: string;
  severity: 'info' | 'warn' | 'critical';
  ts: number;
  detail?: string;
}
export interface LiquidationEntry {
  ts: number;
  side: 'long' | 'short';
  amountUsd: number;
  symbol: string;
}
export interface SmartWallet {
  address: string;
  score: number;
  trades: number;
  label: 'tracking' | 'smart_money';
  lastAction?: { ts: number; kind: 'buy' | 'sell'; symbol: string };
}
export interface EdgeSnapshot {
  symbol: string;
  connected: boolean;
  midPrice: number;
  imbalance: number;          // bidQty/askQty top20
  imbalanceNorm: number;      // -1..+1
  cvd: number;                // last 60s
  buyVol: number;
  sellVol: number;
  spread: number;
  topBids: OrderbookLevel[];
  topAsks: OrderbookLevel[];
  signals: EdgeSignal[];      // last 50
  liquidations: LiquidationEntry[];
  longUsd5m: number;
  shortUsd5m: number;
  liqPressure: number;        // -1..+1
  wallets: SmartWallet[];
  liquidationsKeyMissing: boolean;
  walletsKeyMissing: boolean;
  lastTick: number;
}
