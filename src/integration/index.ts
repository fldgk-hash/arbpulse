// ============================================
// ArbPulse Liquidity Intelligence — Barrel Export
// Import everything from here
// ============================================

// Core Engine
export { LiquidityProfiler, liquidityProfiler } from '../LiquidityProfiler';

// Types
export type {
  TokenPair,
  DepthProfile,
  DepthBand,
  LPPosition,
  ExitSimulation,
  ExitBand,
  LiquidityFilterConfig,
} from '../types/liquidity.types';
export { DEFAULT_CONFIG } from '../types/liquidity.types';

// React Hook
export { useLiquidityCheck } from '../useLiquidityCheck';
export type { UseLiquidityCheckReturn } from '../useLiquidityCheck';

// UI Components
export { LiquidityDepthCard } from '../LiquidityDepthCard';

// Integration (enhanced scanner)
export { useArbScanner, DEFAULT_SCANNER_CONFIG } from './useArbScanner.enhanced';
export type { ArbOpportunity, ScannerConfig } from './useArbScanner.enhanced';
export { OpportunityCard } from './OpportunityCard.enhanced';
export { ScannerDashboard } from './ScannerDashboard';
