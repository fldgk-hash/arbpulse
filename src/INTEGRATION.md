# ArbPulse Liquidity Engine Integration Guide

## What You're Getting

This engine transforms ArbPulse from a **binary liquidity checker** ($10K yes/no) into a **deep liquidity profiler** that tells users:
- How much they can actually trade before slippage kills them
- Whether the volume is real or wash-traded
- How concentrated the LP positions are (rug risk)
- Exactly how long it takes to exit a position

## File Structure

```
src/
├── engine/
│   ├── LiquidityProfiler.ts          # Core engine (copy this)
│   ├── types/
│   │   └── liquidity.types.ts        # TypeScript interfaces
│   ├── utils/
│   │   └── math.ts                   # Gini, velocity, liquidation math
│   └── adapters/
│       ├── dexscreener.adapter.ts    # Already used, enhanced
│       ├── birdeye.adapter.ts        # Solana depth (free)
│       ├── thegraph.adapter.ts       # V3 tick data (free)
│       ├── bscscan.adapter.ts        # Contract/holders (free API key)
│       ├── solanafm.adapter.ts      # Deployer history (free)
│       └── jupiter.adapter.ts        # Slippage simulation (free)
├── hooks/
│   └── useLiquidityCheck.ts          # React hook for /liquidity-check
└── components/
    └── LiquidityCard.tsx             # Rich UI component
```

## Step 1: Install Dependencies

No new npm packages needed. All APIs are REST/JSON — standard `fetch()`.

You only need API keys for:
- **BSCScan**: Free at https://bscscan.com/apis
- **Birdeye**: Optional (higher limits), free tier works without key

Add to `.env`:
```
VITE_BSCSCAN_API_KEY=your_free_key_here
VITE_BIRDEYE_API_KEY=optional_for_higher_limits
```

## Step 2: Replace Liquidity Check in Scanner

Find where you currently do:
```typescript
// OLD: Binary threshold
if (pair.liquidityUsd < LOW_LIQ_THRESHOLD) return null;
```

Replace with:
```typescript
// NEW: Deep analysis
import { createLiquidityProfiler } from '../LiquidityProfiler';

const profiler = createLiquidityProfiler({
  minTvl: 10000,
  minRealDepth2pct: 2000,
  maxGiniCoefficient: 0.7,
  maxWashProbability: 75,
  minHealthScore: 40,
});

const profile = await profiler.analyze(pair);

// Now you have:
// profile.healthScore      // 0-100
// profile.riskLevel        // LOW | MODERATE | HIGH | CRITICAL
// profile.positionCeiling  // Max $ to trade
// profile.realDepth2pct    // Real depth, not TVL
// profile.washProbability  // 0-100
// profile.exitTimeline     // How fast can you get out
```

## Step 3: Update Opportunity Display

Where you currently show:
```
Liq: $36K
```

Show the LiquidityCard:
```tsx
import { LiquidityCard } from '../components/LiquidityCard';

// In your opportunity row:
<LiquidityCard profile={profile} compact={true} />

// Or full card in detail view:
<LiquidityCard profile={profile} compact={false} />
```

## Step 4: Add /liquidity-check Command

In your command palette or sidebar:
```tsx
import { useLiquidityCheck } from '../hooks/useLiquidityCheck';

function LiquidityCommand() {
  const [state, { analyze }] = useLiquidityCheck();

  const handleCheck = async (pair) => {
    const profile = await analyze(pair);
    // Display profile in modal/panel
  };

  return (
    <button onClick={() => handleCheck(selectedPair)}>
      /liquidity-check
    </button>
  );
}
```

## Step 5: Filter Opportunities by Feasibility

Instead of filtering by spread alone, filter by **catchability**:

```typescript
// OLD: Filter by spread > 0.5%
const opportunities = allPairs.filter(p => p.spread > 0.005);

// NEW: Filter by health score + position ceiling
const opportunities = allPairs.filter(p => {
  const profile = await profiler.analyze(p);
  return (
    profile.healthScore >= 50 &&           // Liquidity is decent
    profile.positionCeiling >= 500 &&      // Can trade at least $500
    profile.washProbability < 60 &&       // Volume is mostly real
    profile.exitTimeline.avgSlippage < 0.1 // Can exit under 10% slippage
  );
});
```

## Performance Considerations

| Concern | Solution |
|---------|----------|
| **Rate limits** | All adapters have built-in 200-1000ms rate limiting |
| **API failures** | Graceful fallbacks: The Graph → TVL estimate → skip |
| **Cache** | 30-second TTL on analysis results |
| **Batch analysis** | `profiler.analyzeBatch(pairs)` with Promise.allSettled |
| **Slow chains** | Solana (Jupiter) is fastest, BSC (The Graph) is slowest |

## Free Tier Limits (Daily)

| Source | Limit | Cost |
|--------|-------|------|
| DexScreener | 300 req/min | Free |
| Birdeye | 100 req/min | Free |
| The Graph | 100K queries/mo | Free |
| BSCScan | 5 req/sec | Free (API key) |
| SolanaFM | Generous | Free |
| Jupiter | No limit | Free |

**Strategy**: Cache aggressively, batch requests, degrade gracefully.

## What Changes in Your UI

### Before (Current ArbPulse):
```
LMAO!/SOL
Liq: $36K
Spread: 2.49%
Net: $24.88
```

### After (With Liquidity Engine):
```
LMAO!/SOL
Health: 23/100 🔴 CRITICAL
TVL: $36K | Real Depth: $8.2K
Position Ceiling: $180
Wash: 94% 🤖 | Top LP: 68%
Exit: 4.2h avg, 7% stuck
→ DO NOT TRADE
```

### For Good Opportunities:
```
OP/USDT
Health: 72/100 🟡 MODERATE
TVL: $5.9M | Real Depth: $4.2M
Position Ceiling: $4,200
Wash: 12% | Top LP: 15%
Exit: 3.5m avg, <1% slippage
→ CONDITIONAL GO (pre-position capital)
```

## Next Steps After Integration

1. **Risk Profiler** (`/risk-screen`) — Contract audit, deployer history, honeypot detection
2. **Feasibility Engine** (`/arb-analysis`) — Net spread after all costs, time-to-execute, capital requirements
3. **Alert Engine** — Smart notifications only for GO-rated opportunities

## Support

All code is MIT licensed. Modify adapters to point to your own RPC nodes or data sources if free tiers are insufficient.
