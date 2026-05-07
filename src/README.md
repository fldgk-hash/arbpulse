# ArbPulse Liquidity Intelligence Engine

**Production-ready liquidity depth analysis for ArbPulse Pro.**
Transforms your scanner from "show spreads" to "show catchable opportunities."

## What This Adds to ArbPulse

| Before | After |
|--------|-------|
| Binary liquidity check ($10K/$25K threshold) | **Real depth curves** with slippage bands |
| Basic safety score | **Contract forensics** (mint, blacklist, pause detection) |
| Raw spread % | **Net feasibility score** with position sizing |
| Manual screening | **Auto-filter** with human-readable reasons |

## Files to Copy Into Your Repo

```
src/
├── engine/
│   ├── LiquidityProfiler.ts              ← CORE ENGINE
│   ├── types/
│   │   └── liquidity.types.ts            ← Type definitions
│   ├── utils/
│   │   └── math.ts                       ← Gini, velocity, liquidation math
│   └── adapters/
│       ├── dexscreener.adapter.ts        ← Already used, enhanced
│       ├── birdeye.adapter.ts            ← Solana depth (free tier)
│       ├── graph.adapter.ts              ← V3 tick data (free subgraphs)
│       └── chain-explorer.adapter.ts     ← Contract audit (BSCScan/SolanaFM)
├── hooks/
│   └── useLiquidityCheck.ts              ← React hook (drop-in replacement)
└── components/
    └── LiquidityDepthCard.tsx            ← Rich UI component
```

## Installation

### 1. Copy files

```bash
# Copy engine files to your src/ directory
cp -r arbpulse-liquidity-engine/* src/
```

### 2. Add environment variables (optional, for higher rate limits)

```bash
# .env
VITE_BSCSCAN_API_KEY=your_bscscan_api_key      # Free at bscscan.com/apis
VITE_BIRDEYE_API_KEY=your_birdeye_key          # Optional, higher limits
```

### 3. Replace existing liquidity check

In your existing scanner hook (e.g., `useArbScanner.ts`), replace:

```typescript
// OLD
const isLiquidEnough = pair.liquidityUsd > LOW_LIQ_THRESHOLD;

// NEW
import { useLiquidityCheck } from '../hooks/useLiquidityCheck';

const { profile, isTradeable, tradeableReason, analyze } = useLiquidityCheck();

// In your scan loop:
await analyze(pair);
if (!isTradeable) {
  console.log(`Skipped: ${tradeableReason}`);
  continue;
}
// Use profile.positionCeiling for max trade size
```

### 4. Add UI component

```tsx
import { LiquidityDepthCard } from '../components/LiquidityDepthCard';

// In your opportunity card:
<LiquidityDepthCard profile={profile} />
```

## Free API Rate Limits

| Source | Free Tier | Rate Limit | Fallback |
|--------|-----------|------------|----------|
| DexScreener | Public | 300 req/min | CoinGecko |
| Birdeye | Free | 100 req/min | SolanaFM |
| The Graph | Public | 100 req/min | TVL estimation |
| BSCScan | API Key | 5 req/sec | Skip contract audit |
| SolanaFM | Free | 50 req/min | Skip deployer history |

**No paid subscriptions required.** All fallbacks work with zero API keys.

## Usage Examples

### Single Pair Analysis

```typescript
import { liquidityProfiler } from './engine/LiquidityProfiler';

const pair = {
  chain: 'bsc',
  address: '0x...',
  baseToken: { address: '0x...', symbol: 'ETH', decimals: 18 },
  quoteToken: { address: '0x...', symbol: 'USDT', decimals: 18 },
  dexId: 'pancakeswap-v3',
  priceUsd: 2325.11,
  liquidityUsd: 5900000,
  volume24h: 4130000,
};

const profile = await liquidityProfiler.analyzePair(pair);
console.log(profile.healthScore);        // 72
console.log(profile.positionCeiling);   // 4200
console.log(profile.riskLevel);          // 'MODERATE'
```

### Batch Processing

```typescript
const pairs = [pair1, pair2, pair3, ...];
const profiles = await liquidityProfiler.analyzeBatch(pairs);

// Filter tradeable only
const tradeable = profiles.filter(p => p.healthScore >= 50);
```

### Custom Config

```typescript
import { LiquidityProfiler } from './engine/LiquidityProfiler';

const strictProfiler = new LiquidityProfiler({
  minTvl: 50000,              // Higher threshold
  maxGiniCoefficient: 0.5,   // More equal distribution required
  maxWashProbability: 50,      // Stricter wash detection
  defaultPositionPercentOfTvl: 0.03, // 3% max (safer)
});
```

## Architecture

```
┌─────────────────────────────────────────┐
│           LiquidityProfiler             │
├─────────────────────────────────────────┤
│  analyzePair() → parallel fetch:        │
│    ├── enhancePairData (DexScreener)    │
│    ├── fetchLpDistribution              │
│    │    ├── Solana: Birdeye holders     │
│    │    ├── BSC: The Graph V3 ticks     │
│    │    └── Generic: synthetic model    │
│    ├── fetchDepthBands                  │
│    │    ├── BSC: The Graph ticks        │
│    │    └── Fallback: TVL estimation    │
│    └── fetchContractInfo                │
│         ├── BSC: BSCScan ABI audit      │
│         └── Solana: instruction parse   │
├─────────────────────────────────────────┤
│  calculateConcentration() → Gini + HHI   │
│  calculateWashMetrics() → Vol/Liq + vel │
│  simulateExit() → slippage bands        │
│  calculateHealthScore() → composite     │
└─────────────────────────────────────────┘
```

## Performance

- **Single pair:** ~500ms-2s (parallel API calls)
- **Batch 10 pairs:** ~2-4s (with caching)
- **Cache TTL:** 30 seconds
- **Memory:** ~50KB per profile

## Next Steps

1. **RiskProfiler** (`/risk-screen`) — Contract forensics + deployer OSINT
2. **ArbCalculator** (`/arb-analysis`) — Net spread + feasibility scoring
3. **AlertEngine** — Smart notifications for GO-rated opportunities

---

**License:** MIT (same as ArbPulse Pro)
