# Crypto Edge Engine — Full Build (BTCUSDT)

Implement both specs end-to-end as a new "Edge" tab in the existing app. BTCUSDT only by default (architecture supports adding ETH/SOL later by changing one array).

## Architecture

```
src/engine/edge/
  binanceWs.ts          # WS connection mgr (depth@100ms + aggTrade), auto-reconnect
  orderbook.ts          # In-memory L2 book, top-N bid/ask sums
  metrics.ts            # imbalance, CVD (60s window), trade flow, absorption, spoof
  signals.ts            # WS signals: flow_bullish/bearish, absorption, spoof
  liquidations.ts       # Coinglass REST poll (5s), long/short pressure, squeeze detect
  wallets.ts            # Etherscan tokentx polling, behavior labeling, smart-money score
  edgeStore.ts          # zustand-style singleton state + subscribers
  types.ts
src/hooks/
  useEdgeEngine.ts      # subscribes UI to edgeStore, returns live snapshot
src/components/edge/
  EdgeView.tsx          # tab root
  OrderbookLadder.tsx   # top 20 bid/ask ladder w/ size bars
  ImbalanceGauge.tsx    # -1..+1 gauge
  CvdChart.tsx          # rolling 60s line (lightweight inline SVG)
  BuySellMeter.tsx      # buy vs sell volume bar
  LiquidationFeed.tsx   # recent liquidations + long/short pressure
  SmartMoneyPanel.tsx   # labeled wallets w/ score
  SignalFeed.tsx        # priority-sorted live signals w/ severity colors
```

Wire `EdgeView` into `src/pages/Index.tsx` and `BottomNav.tsx` as a new tab.

## Data sources

- **Binance WS** `wss://stream.binance.com:9443/ws/btcusdt@depth@100ms/btcusdt@aggTrade` — no key.
- **Binance REST snapshot** once at startup `/api/v3/depth?symbol=BTCUSDT&limit=1000` to seed book before applying WS deltas (per Binance docs).
- **Coinglass** liquidations — requires free API key (`COINGLASS_API_KEY`). If missing, panel shows "Add API key" CTA, engine continues.
- **Etherscan** wallet flows — requires free API key (`ETHERSCAN_API_KEY`). Same fallback.

Both keys called from a Lovable Cloud edge function (`edge-proxy`) to keep keys server-side and avoid CORS.

## Derived metrics

- `imbalance = sumTop20BidQty / sumTop20AskQty` (bullish >1.3, bearish <0.8)
- `cvd` = rolling sum over last 60s of `m===false ? +q : -q`
- `tradeFlow` = buy vs sell volume in last 60s
- `absorption` = high one-side volume + price stable (stddev of mid price < threshold)
- `spoof` = bid/ask level >X size that disappears within 2s of appearing (track deltas)
- `liquidationPressure` = `(longUsd - shortUsd) / (longUsd + shortUsd)` last 5min
- `walletScore` = Σ(realized PnL after their buys, normalized); label `smart_money` if score>threshold over ≥5 trades

## Signals (priority order)

1. `short_squeeze` — short liq spike + price up
2. `smart_money_entry` — labeled wallet accumulating
3. `flow_bullish` / `orderbook_bullish`
4. `absorption_bullish` (HIDDEN_BUYER)
5. `flow_bearish`, `long_squeeze`, `smart_money_exit`, `spoof_detected`

Emitted to `edgeStore`, kept as rolling list of last 50, deduped within 10s window.

## Real-time loop

- WS handlers update orderbook + trade window on every message.
- `setInterval(1000ms)` recomputes metrics + evaluates signal rules + notifies subscribers (debounced UI).
- Coinglass polled every 5s; Etherscan every 30s.
- Auto-reconnect on WS close with exponential backoff (1s→30s).

## UI

New "Edge" tab in BottomNav (icon: Activity). Layout for 360px viewport:
- Top: ImbalanceGauge + BuySellMeter side-by-side
- CvdChart (60s rolling)
- OrderbookLadder (collapsible, top 10 each side on mobile)
- SignalFeed (always visible, priority colored)
- Collapsible: LiquidationFeed, SmartMoneyPanel

Uses existing semantic tokens (`--primary`, `--destructive`, `--muted`) — no hardcoded colors.

## Secrets / Cloud

Enable Lovable Cloud, then prompt for `COINGLASS_API_KEY` and `ETHERSCAN_API_KEY`. Create edge function `edge-proxy` with two routes:
- `POST /edge-proxy { kind: "liquidations", symbol }` → Coinglass
- `POST /edge-proxy { kind: "wallets", address }` → Etherscan

Frontend calls via `supabase.functions.invoke('edge-proxy', ...)`. Engine degrades gracefully if keys absent.

## Constraints handled

- WS reconnect w/ backoff
- Trade window pruned every tick (no memory leak)
- UI updates debounced to 1Hz (raw stream can be 100Hz)
- Orderbook map capped to top 100 levels each side

## Out of scope

- ETH/SOL streaming (single-line change to enable later)
- Telegram alerts (just sound + visual)
- Persisting smart-money labels to DB (in-memory; can move to Cloud DB if you want persistence)

Approve to build.