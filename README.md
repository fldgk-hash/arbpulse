# ArbPulse Pro — Solana & BSC Arbitrage Scanner

**Free, real-time cross-DEX and cross-CEX arbitrage scanner for Solana and BNB Smart Chain.**

🔗 **Live app:** [arbpulse.pro](https://arbpulse.pro)

---

## What is ArbPulse Pro?

ArbPulse Pro scans multiple DEXs and CEXs simultaneously for price discrepancies, calculates net profit after fees and slippage, and surfaces actionable arbitrage opportunities in real time — no wallet connection, no registration, no API keys required.

### Chains & Exchanges Supported

**Solana DEXs**
- Raydium · Orca · Meteora · Jupiter · Pump.fun

**BNB Smart Chain DEXs**
- PancakeSwap V2 / V3 · Uniswap V3 BSC · THENA V3 / Fusion · Biswap V2 / V3 · ApeSwap · BabySwap · SushiSwap BSC · DODO · Ellipsis Finance · Curve BSC

**Centralized Exchanges (WebSocket live)**
- Binance · OKX · Bybit · Kraken

---

## Features

| Feature | Detail |
|---|---|
| 🔄 Live WebSocket feeds | Binance, OKX, Bybit ticker streams |
| ⚡ Triangular arbitrage | 16 USDT triangle paths on Binance order book |
| 🔗 Cross-exchange arb | 40 symbols × 3 exchanges = 120 pairs scanned |
| 🟡 BSC arbitrage | DexScreener API, 20+ DEX fee maps, address validation |
| 🔒 Safety scores | RugCheck.xyz integration for Solana **and** BSC tokens |
| 💧 Liquidity filter | $10k threshold (Solana) · $25k threshold (BSC) |
| 📊 Spread filter | Configurable min spread %, min profit $, trade size |
| 🆕 New pair detection | Flags tokens listed in the last 1h / 6h |
| 📈 Trade calculator | Net ROI after DEX fees + slippage |
| 📋 Session P&L | Trade history, win rate, CSV export |
| 📱 Mobile-first | Responsive layout, PWA installable |

---

## Tech Stack

- **React 18** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui components
- **WebSocket** connections to Binance, OKX, Bybit, Kraken
- **DexScreener API** for Solana and BSC pair data
- **RugCheck.xyz API** for token safety scoring
- **CoinGecko API** as CEX price fallback

---

## Getting Started

```bash
git clone https://github.com/fldgk-hash/arbpulse
cd arbpulse
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for production

```bash
npm run build
```

Output goes to `dist/` — deploy to Vercel, Netlify, or any static host.

---

## BSC Arbitrage — How It Works

1. **Trending tokens** fetched from DexScreener BSC boosts + profiles
2. **Pair data** batched (30 per request) → prices, liquidity, volume, DEX
3. **DEX ID normalized** — API may return `pancakeswap` but pool is `pancakeswap-v3` (different fee: 0.25% vs 0.05%)
4. **Fee fallback chain**: normalized ID → raw ID → 0.25% default
5. **Address validation**: all BSC pair addresses validated as `0x` + 40 hex chars
6. **Net spread** = raw spread − buy fee − sell fee − slippage (0.5%)
7. **Safety scores** fetched from RugCheck in background (non-blocking)
8. **Low liquidity flag** at $25k TVL (2.5× higher than Solana due to BSC MEV risk)

---

## CEX Arbitrage — How It Works

- **Binance**: WebSocket combined stream (`bookTicker` + `24hrTicker`)
- **OKX**: WebSocket `tickers` channel
- **Bybit**: WebSocket `tickers.SYMUSDT` channel
- **Kraken**: WebSocket v2 `ticker` channel
- Cross-exchange calc: buy ask on exchange A vs sell bid on exchange B, net of fees
- **Only real live data used** — no synthetic/simulated prices

---

## Configuration

Edit `src/hooks/useArbScanner.ts`:

```typescript
// Minimum TVL to show a pair
export const LOW_LIQ_THRESHOLD = 10000;      // Solana
export const BSC_LOW_LIQ_THRESHOLD = 25000;  // BNB Smart Chain

// Scan intervals (seconds)
// Configurable in the UI sidebar
```

---

## Disclaimer

ArbPulse Pro is a **scanner and analysis tool only**. It does not connect to wallets, execute trades, or provide financial advice. Arbitrage opportunities shown may not be executable due to execution latency, MEV competition, withdrawal limits, or order book depth. Always do your own research (DYOR). Crypto trading involves significant risk of loss.

---

## License

MIT — free to use, fork, and deploy.

---

*Keywords: solana arbitrage scanner, BSC DEX arbitrage, PancakeSwap arbitrage tool, cross-exchange crypto arbitrage, raydium orca arbitrage, DeFi arbitrage free, triangular arbitrage Binance, rug check scanner, crypto arbitrage 2026*
