# ============================================
# MINIMAL INTEGRATION PATCH GUIDE
# Modify 3 existing files instead of replacing
# ============================================

## FILE 1: src/hooks/useArbScanner.ts
## Add these imports at the top:

```typescript
import { liquidityProfiler } from '../engine/LiquidityProfiler';
import { TokenPair, DepthProfile } from '../engine/types/liquidity.types';
```

## Add these fields to your existing ArbOpportunity type:

```typescript
export interface ArbOpportunity {
  // ... your existing fields ...

  // NEW: Add these 5 fields
  liquidityProfile?: DepthProfile | null;
  isTradeable?: boolean;
  tradeableReason?: string | null;
  positionCeiling?: number;
  healthScore?: number;
  riskLevel?: string;
}
```

## Replace your liquidity check logic:

```typescript
// FIND this in your scan loop:
if (pair.liquidityUsd < LOW_LIQ_THRESHOLD) {
  continue; // Skip low liquidity
}

// REPLACE with:
let isTradeable = pair.liquidityUsd >= LOW_LIQ_THRESHOLD;
let tradeableReason = isTradeable ? null : `TVL $${pair.liquidityUsd} < $${LOW_LIQ_THRESHOLD}`;
let positionCeiling = pair.liquidityUsd * 0.05;
let healthScore = 50;
let riskLevel = 'UNKNOWN';
let liquidityProfile: DepthProfile | null = null;

// NEW: Run deep liquidity analysis
if (pair.liquidityUsd >= LOW_LIQ_THRESHOLD) {
  try {
    const tokenPair: TokenPair = {
      chain: pair.chain,
      address: pair.address,
      baseToken: pair.baseToken,
      quoteToken: pair.quoteToken,
      dexId: pair.dexId,
      priceUsd: pair.priceUsd,
      liquidityUsd: pair.liquidityUsd,
      volume24h: pair.volume24h,
      volume6h: pair.volume6h,
      volume1h: pair.volume1h,
      age: pair.age,
    };

    liquidityProfile = await liquidityProfiler.analyzePair(tokenPair);

    isTradeable = liquidityProfile.healthScore >= 40;
    tradeableReason = isTradeable ? null : `Health ${liquidityProfile.healthScore}/100`;
    positionCeiling = liquidityProfile.positionCeiling;
    healthScore = liquidityProfile.healthScore;
    riskLevel = liquidityProfile.riskLevel;

  } catch (e) {
    console.warn('Liquidity analysis failed for', pair.address, e);
    // Keep legacy values
  }
}

// Skip if not tradeable
if (!isTradeable) {
  console.log(`Skipped ${pair.baseToken.symbol}: ${tradeableReason}`);
  continue;
}

// Build opportunity with NEW fields:
const opportunity: ArbOpportunity = {
  // ... your existing fields ...

  // NEW: Add these
  liquidityProfile,
  isTradeable,
  tradeableReason,
  positionCeiling,
  healthScore,
  riskLevel,
};
```

## FILE 2: src/components/OpportunityCard.tsx
## Add this import:

```typescript
import { LiquidityDepthCard } from './LiquidityDepthCard';
```

## Add state for expand/collapse:

```typescript
const [showLiquidity, setShowLiquidity] = useState(false);
```

## Add these elements inside your card (before closing div):

```tsx
{/* Position ceiling badge */}
<div className="flex gap-2 mt-2">
  <span className={`text-xs px-2 py-1 rounded ${
    opportunity.healthScore && opportunity.healthScore >= 60 
      ? 'bg-green-500/20 text-green-400' 
      : 'bg-red-500/20 text-red-400'
  }`}>
    Health: {opportunity.healthScore || '?'}/100
  </span>
  <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
    Max: ${(opportunity.positionCeiling || 0).toLocaleString()}
  </span>
</div>

{/* Block reason */}
{opportunity.tradeableReason && (
  <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
    ⚠ {opportunity.tradeableReason}
  </div>
)}

{/* Toggle button */}
{opportunity.liquidityProfile && (
  <button
    onClick={() => setShowLiquidity(!showLiquidity)}
    className="mt-2 text-xs text-gray-500 hover:text-white w-full py-2 border-t border-gray-800"
  >
    {showLiquidity ? '▲ Hide' : '▼ Show'} Liquidity Analysis
  </button>
)}

{/* Expanded detail */}
{showLiquidity && opportunity.liquidityProfile && (
  <div className="mt-2 border-t border-gray-800">
    <LiquidityDepthCard profile={opportunity.liquidityProfile} />
  </div>
)}
```

## FILE 3: src/App.tsx or main page
## Add the engine import at the top:

```typescript
// This initializes the singleton
import '../engine/LiquidityProfiler';
```

## Add environment variables to .env:

```bash
# Optional - higher rate limits
VITE_BSCSCAN_API_KEY=your_key_here
VITE_BIRDEYE_API_KEY=your_key_here
```

## That's it. 3 files modified, full liquidity intelligence enabled.
