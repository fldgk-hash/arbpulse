<div align="center">

```
 █████╗ ██████╗ ██████╗ ██████╗ ██╗   ██╗██╗     ███████╗███████╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
███████║██████╔╝██████╔╝██████╔╝██║   ██║██║     ███████╗█████╗  
██╔══██║██╔══██╗██╔══██╗██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
██║  ██║██║  ██║██████╔╝██║     ╚██████╔╝███████╗███████║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
                               P  R  O
```

**Real-Time Solana DEX & CEX Arbitrage Scanner**

[![Live](https://img.shields.io/badge/status-live-brightgreen?style=flat-square&logo=statuspage)](https://arbpulse.pro)
[![Solana](https://img.shields.io/badge/chain-Solana-9945FF?style=flat-square&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

*The fastest way to find real arbitrage opportunities across Solana DEXs and major centralized exchanges — with live data, zero fluff.*

[🚀 Live App](https://arbpulse.pro) · [📊 DexScreener](https://dexscreener.com) · [🛡 RugCheck](https://rugcheck.xyz)

</div>

---

## Why ArbPulse Pro Exists

Most arbitrage tools are either paywalled, delayed by 30+ seconds, or built on simulated data. **ArbPulse Pro was built differently** — it connects directly to WebSocket feeds from 4 major exchanges and 5+ Solana DEXs simultaneously, computes net spreads after real fees and slippage, and surfaces only opportunities that actually make sense to execute.

If you've ever lost a trade because your scanner was slow, showed you fake data, or missed a low-TVL rug trap — this tool was built for you.

---

## What It Does

ArbPulse Pro continuously scans two arenas:

### 🚀 Solana DEX Arbitrage
Monitors cross-DEX price discrepancies for trending Solana tokens across:

| DEX | Fee |
|-----|-----|
| Raydium | 0.25% |
| Orca / Whirlpool | 0.30% |
| Meteora | 0.30% |
| Jupiter | 0.20% |
| Pump.fun | 1.00% |
| Lifinity | 0.20% |
| OpenBook | 0.40% |

For every token trading on 2+ DEXs, it calculates the real net profit after fees + slippage and flags anything above your threshold.

### ⚡ CEX Arbitrage
Live WebSocket feeds from all four exchanges:

- **Binance** — book ticker stream
- **OKX** — tickers v5
- **Bybit** — spot stream
- **Kraken** — ticker subscription

Computes both **triangular arbitrage** (e.g. BTC→ETH→SOL→USDT on Binance) and **cross-exchange arbitrage** (buy on Bybit, sell on OKX).

---

## Key Features

| Feature | Description |
|---------|-------------|
| ⚠️ **Low-Liquidity Warning** | Yellow triangle + banner when pair TVL < $10K — protects against price impact traps |
| 📍 **Pair Address Display** | Buy & sell pair contract addresses shown inline, one-click copy + DexScreener link |
| 🛡️ **Safety Scores** | RugCheck.xyz integration — SAFE / WARN / RISKY badges per token |
| 🆕 **New Pair Detection** | Flags tokens listed in the last 6h and 24h with visual badges |
| 🔥 **HOT Badge** | Auto-tagged when spread > 1.5% |
| 📊 **TVL Column** | Displayed alongside liquidity — highlighted amber when dangerously low |
| 🧮 **Trade Calculator** | Input your trade size, get exact ROI, fee breakdown, and net profit |
| 📌 **Session Tracking** | Log opportunities, track P&L, export to CSV |
| 🔔 **Sound Alerts** | Audio beep when a spread crosses your alert threshold |
| 📱 **Mobile-First** | Full bottom navigation for mobile; 3-column layout on desktop |

---

## Data Sources

ArbPulse Pro uses **100% live, real-time data**. No mocks. No simulation.

```
DEX Data     →  DexScreener API (4 endpoints: boosts, profiles, search, pairs)
Safety       →  RugCheck.xyz /v1/tokens/{mint}/report/summary  
CEX Prices   →  Binance WS  +  OKX WS  +  Bybit WS  +  Kraken WS
Fallback     →  CoinGecko simple/price (rate-limited backup)
```

---

## Filters

All filters are live — results update instantly without re-scanning.

| Filter | Default | Description |
|--------|---------|-------------|
| Min Liquidity | $1,000 | Minimum pool liquidity to show a pair |
| Min Volume 24h | $200 | Filters out dead pairs |
| Min Spread | 0.1% | Only show actionable spreads |
| Safe Only | ✅ On | Hides tokens with RugCheck score ≥ 600 |
| New Only | ❌ Off | Show only pairs < 24h old |
| Sort | Spread | Sort by: Spread / Profit / Liquidity / Newest |

---

## Tech Stack

```
Frontend     React 18 + TypeScript
Styling      Tailwind CSS v3
Build        Vite
Data         WebSocket (4x CEX) + REST (DexScreener, RugCheck, CoinGecko)
Routing      React Router v6
UI           shadcn/ui components
Testing      Vitest + Playwright
```

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/fldgk-hash/arbpulse.git
cd arbpulse

# 2. Install
npm install
# or
bun install

# 3. Run
npm run dev
# or
bun dev

# 4. Build for production
npm run build
```

Open `http://localhost:5173` — the scanner starts automatically and connects to all live feeds.

---

## ⚠️ Risk Disclaimer (DYOR)

> **DO YOUR OWN RESEARCH.**  
> ArbPulse Pro is an informational tool only. It does not execute trades on your behalf.  
> Arbitrage involves significant real-world risk:
> - **Slippage** — especially on low-TVL pairs
> - **MEV bots** — front-running is common on Solana
> - **Rug pulls** — always verify the pair address on-chain before trading
> - **CEX withdrawal delays** — cross-exchange arb requires capital on both sides
>
> This is **not financial advice**. Past spreads do not guarantee future profit.  
> Always verify pair contract addresses independently using [Solscan](https://solscan.io) or [DexScreener](https://dexscreener.com) before executing any trade.

---

## Support the Project

ArbPulse Pro is free and open-source. If it's saved you time or made you money, consider supporting development:

**Bitcoin (BTC)**
```
bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz
```

**Solana (SOL)**
```
8hyvZTaKUWEX3Zfd5xVZiXi7V4NhXQJ5ktuDtbx1svcp
```

Every contribution helps keep the data engine running and new features coming.

---

## Roadmap

- [ ] Wallet connect + one-click Jupiter swap execution
- [ ] Telegram / Discord alert bot integration
- [ ] Historical spread replay & backtesting
- [ ] Multi-chain support (Base, Arbitrum, BSC)
- [ ] Pro tier with custom alert webhooks

---

## License

MIT — free to use, fork, and build on.

---

<div align="center">

Built for traders who want **real data, real speed, real edges.**

*Star ⭐ the repo if ArbPulse Pro is part of your stack.*

</div>
