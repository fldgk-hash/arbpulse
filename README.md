<div align="center">

```
 █████╗ ██████╗ ██████╗ ██████╗ ██╗   ██╗██╗     ███████╗███████╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
███████║██████╔╝██████╔╝██████╔╝██║   ██║██║     ███████╗█████╗  
██╔══██║██╔══██╗██╔══██╗██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
██║  ██║██║  ██║██████╔╝██║     ╚██████╔╝███████╗███████║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
                               P  R  O  v9.0
```

**Real-Time Multi-Chain DEX & CEX Arbitrage Scanner**

[![Live](https://img.shields.io/badge/status-live-brightgreen?style=flat-square)](https://arbpulse.pro)
[![Solana](https://img.shields.io/badge/Solana-◎-9945FF?style=flat-square&logo=solana)](https://solana.com)
[![BSC](https://img.shields.io/badge/BNB_Chain-🟡-F3BA2F?style=flat-square)](https://www.bnbchain.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

*The fastest way to find real arbitrage opportunities across Solana + BNB Smart Chain DEXs and major centralized exchanges — live data, zero fluff, two chains.*

[🚀 Live App](https://arbpulse.pro) · [📊 DexScreener](https://dexscreener.com) · [🛡 RugCheck](https://rugcheck.xyz) · [🔍 BSCscan](https://bscscan.com)

</div>

---

## Why ArbPulse Pro Exists

Most arbitrage tools are either paywalled, 30+ seconds delayed, or built on simulated data. **ArbPulse Pro was built differently** — it connects directly to WebSocket feeds from 4 major exchanges and simultaneously scans 10+ DEXs across two high-volume chains.

**v9.0 adds full BNB Smart Chain support** — the second-largest DEX ecosystem by volume, processing over **$1 billion in daily trades** across PancakeSwap, Uniswap BSC, THENA, Biswap, and ApeSwap.

---

## Chains Supported

| Chain | Daily DEX Volume | Top DEXs |
|-------|-----------------|----------|
| **◎ Solana** | ~$3B+ | Raydium, Orca, Jupiter, Meteora, Pump.fun |
| **🟡 BNB Smart Chain** | ~$1.08B | PancakeSwap V3 (39.5%), Uniswap V3 BSC (29.7%), THENA, Biswap, ApeSwap |

Switch between chains instantly using the **Solana ↔ BNB Chain** tab at the top of the DEX scanner. Each chain runs its own independent scan cycle.

---

## What It Scans

### 🚀 Solana DEX Arbitrage

| DEX | Fee | Notes |
|-----|-----|-------|
| Raydium | 0.25% | Highest volume AMM |
| Raydium CLMM | 0.20% | Concentrated liquidity |
| Orca / Whirlpool | 0.30% | |
| Meteora | 0.30% | Dynamic liquidity |
| Jupiter | 0.20% | Aggregator |
| Pump.fun | 1.00% | Meme/new tokens |
| Lifinity | 0.20% | Oracle-based |
| OpenBook | 0.40% | Order book DEX |

### 🟡 BNB Smart Chain DEX Arbitrage

| DEX | Fee | Notes |
|-----|-----|-------|
| PancakeSwap V3 | 0.05% | #1 by volume on BSC |
| PancakeSwap V2 | 0.25% | Legacy AMM |
| PancakeSwap Infinity CLMM | 0.05% | New CLMM |
| Uniswap V3 (BSC) | 0.05% | 39.5% market share |
| Uniswap V4 (BSC) | 0.05% | Hooks-enabled |
| THENA V3 | 0.01% | Ultra-low fee CLMM |
| THENA Fusion | 0.02% | |
| Biswap | 0.10% | |
| ApeSwap | 0.20% | |
| DODO BSC | 0.10% | PMM algorithm |
| Curve BSC | 0.04% | Stable pools |

### ⚡ CEX Arbitrage

Triangular and cross-exchange arb across 4 exchanges via live WebSocket:

- **Binance** — book ticker stream (40 symbols)
- **OKX** — tickers v5 WS
- **Bybit** — spot stream
- **Kraken** — ticker subscription

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔄 **Chain Tabs** | Switch Solana ↔ BSC instantly — both scan simultaneously in background |
| ⚠️ **Low-Liquidity Warning** | Yellow banner + badge when pair TVL < $10K — price impact alert |
| 📍 **Pair Addresses** | Buy & sell pair contract addresses shown inline, one-click copy + DexScreener link |
| 🛡️ **Safety Scores** | RugCheck.xyz per token — SAFE / WARN / RISKY badges |
| 📊 **TVL Column** | Displayed alongside liquidity, amber highlight when dangerously low |
| 🔗 **Explorer Links** | SOL → Solscan · BSC → BSCscan, per chain automatically |
| 🆕 **New Pair Detection** | Flags tokens < 6h and < 24h old with NEW badges |
| 🔥 **HOT Badge** | Auto-flagged when spread > 1.5% |
| 🧮 **Trade Calculator** | ROI breakdown with real fees and slippage per chain |
| 📌 **Session Tracking** | Log opportunities, track P&L, export CSV |
| 🔔 **Sound Alerts** | Different beep tones for SOL vs BSC opportunities |
| ⚠️ **DYOR Disclaimer** | Always-visible, dismissable risk warning |
| 📱 **Mobile-First** | Full bottom nav on mobile, 3-column desktop layout |

---

## Data Sources

All data is **100% live, real-time**. No mocks. No simulation.

```
Solana DEX   →  DexScreener API (boosts + profiles + search + pairs endpoints)
BSC DEX      →  DexScreener API (bsc chainId filter — same 4 endpoints)
Safety       →  RugCheck.xyz /v1/tokens/{mint}/report/summary
CEX Prices   →  Binance WS + OKX WS + Bybit WS + Kraken WS
Fallback     →  CoinGecko simple/price (rate-limited backup)
BSC Explorer →  BSCscan.com per-token deep links
```

---

## Filters (apply to both chains)

| Filter | Default | Description |
|--------|---------|-------------|
| Min Liquidity | $1,000 | Minimum pool liquidity |
| Min Volume 24h | $200 | Filters out dead pairs |
| Min Spread | 0.1% | Only actionable spreads |
| Safe Only | ✅ On | Hides RugCheck score ≥ 600 |
| New Only | ❌ Off | Show only pairs < 24h old |
| Sort | Spread | Spread / Profit / Liquidity / Newest |

---

## Tech Stack

```
Frontend     React 18 + TypeScript
Styling      Tailwind CSS v3
Build        Vite
Chains       Solana + BNB Smart Chain (EVM)
Data         WebSocket (4x CEX) + REST (DexScreener, RugCheck, CoinGecko)
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

Open `http://localhost:5173` — both Solana and BSC scanners start automatically and run concurrently (BSC offset by 3s to avoid API rate limits).

---

## How BSC Arbitrage Works

1. **Discovery** — DexScreener boosts + profiles + search filtered for `chainId: bsc`
2. **Batch fetch** — Up to 45 tokens, 30 per request across PancakeSwap, Uniswap BSC, THENA, Biswap, etc.
3. **Grouping** — Tokens trading on 2+ DEXs are grouped for cross-DEX comparison
4. **Net spread calc** — Real fees per DEX + 0.5% slippage applied
5. **Filtering** — Min liq / vol / spread filters applied; low-TVL pairs flagged
6. **Address display** — BSC pair addresses shown with BSCscan links for on-chain verification

---

## ⚠️ Risk Disclaimer (DYOR)

> **DO YOUR OWN RESEARCH.**  
> ArbPulse Pro is an informational tool. It does **not** execute trades.  
>
> Arbitrage involves real-world risk:
> - **Slippage** — especially acute on low-TVL pairs (< $10K flagged in yellow)
> - **MEV bots** — sandwich attacks are common on both Solana and BSC
> - **Rug pulls** — always verify the pair address on BSCscan / Solscan before trading
> - **BSC gas costs** — factor BNB gas into net profit calculations
> - **CEX withdrawal delays** — cross-exchange arb requires capital pre-positioned
>
> **This is not financial advice.** Verify pair contracts independently before every trade.

---

## Support the Project

ArbPulse Pro is free and open-source. If it's saved you time or made you money:

**Bitcoin (BTC)**
```
bc1q0d0ccaxuw065ezdulr68azp2fjhc0avaqf0pyz
```

**Solana (SOL)**
```
8hyvZTaKUWEX3Zfd5xVZiXi7V4NhXQJ5ktuDtbx1svcp
```

Every contribution keeps the scanner running and new chains coming.

---

## Roadmap

- [x] Solana DEX multi-source arbitrage scanner
- [x] 4-exchange CEX triangular + cross-exchange arb
- [x] TVL low-liquidity warnings
- [x] Pair address display + on-chain verification links
- [x] **BNB Smart Chain DEX support** ← v9.0
- [ ] Ethereum / Base / Arbitrum DEX support
- [ ] Wallet connect + one-click Jupiter / PancakeSwap swap execution
- [ ] Telegram / Discord alert bot
- [ ] Historical spread backtesting
- [ ] Pro tier with webhook alerts

---

## License

MIT — free to use, fork, and build on.

---

<div align="center">

Built for traders who want **real data, two chains, real edges.**

*Star ⭐ the repo if ArbPulse Pro is part of your stack.*

</div>
