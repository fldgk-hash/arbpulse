// ============================================
// LiquidityDepthCard Component
// Rich visualization of liquidity analysis
// For ArbPulse Pro UI
// ============================================

import React from 'react';
import { DepthProfile } from '../engine/types/liquidity.types';

interface LiquidityDepthCardProps {
  profile: DepthProfile | null;
  loading?: boolean;
  compact?: boolean;
}

export const LiquidityDepthCard: React.FC<LiquidityDepthCardProps> = ({
  profile,
  loading = false,
  compact = false,
}) => {
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-gray-700 rounded w-2/3 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 text-gray-500 text-sm">
        Select a pair to analyze liquidity depth
      </div>
    );
  }

  const { pair, healthScore, riskLevel, positionCeiling, exitTimeline } = profile;
  const riskColors = {
    LOW: 'text-green-400 bg-green-400/10 border-green-400/20',
    MODERATE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const healthColor = healthScore >= 75 ? 'text-green-400' :
    healthScore >= 50 ? 'text-yellow-400' :
    healthScore >= 25 ? 'text-orange-400' : 'text-red-400';

  if (compact) {
    return (
      <div className={`rounded-lg p-3 border ${riskColors[riskLevel]} text-xs`}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-mono">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</span>
          <span className={`font-bold ${healthColor}`}>{healthScore}/100</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Max: ${positionCeiling.toLocaleString()}</span>
          <span>{riskLevel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white">
              {pair.baseToken.symbol}/{pair.quoteToken.symbol}
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {pair.chain.toUpperCase()} · {pair.dexId} · {pair.address.slice(0, 8)}...
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColors[riskLevel]}`}>
            {riskLevel} · {healthScore}/100
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-800">
        <MetricBox 
          label="TVL" 
          value={`$${profile.tvl.toLocaleString()}`}
          sub={profile.tvl < 25000 ? '⚠️ Low' : '✓ Adequate'}
          warning={profile.tvl < 25000}
        />
        <MetricBox 
          label="Real Depth ±2%" 
          value={`$${profile.realDepth2pct.toLocaleString()}`}
          sub={`${((profile.realDepth2pct / profile.tvl) * 100).toFixed(1)}% of TVL`}
          warning={profile.realDepth2pct < profile.tvl * 0.1}
        />
        <MetricBox 
          label="Position Ceiling" 
          value={`$${positionCeiling.toLocaleString()}`}
          sub="Max recommended size"
          highlight
        />
        <MetricBox 
          label="Wash Probability" 
          value={`${profile.washProbability}%`}
          sub={profile.washProbability > 75 ? '🔴 Likely wash' : 
               profile.washProbability > 50 ? '🟡 Suspicious' : '🟢 Natural'}
          warning={profile.washProbability > 50}
        />
      </div>

      {/* Concentration */}
      <div className="p-4 border-b border-gray-800">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">LP Concentration</h4>
        <div className="space-y-2">
          <BarMetric 
            label="Gini Coefficient" 
            value={profile.giniCoefficient} 
            max={1}
            color={profile.giniCoefficient > 0.7 ? 'bg-red-500' : 
                   profile.giniCoefficient > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}
            format={(v) => (v * 100).toFixed(0) + '%'}
          />
          <BarMetric 
            label="Top LP Share" 
            value={profile.topLpShare} 
            max={100}
            color={profile.topLpShare > 50 ? 'bg-red-500' : 
                   profile.topLpShare > 30 ? 'bg-yellow-500' : 'bg-green-500'}
            format={(v) => v.toFixed(1) + '%'}
          />
          <BarMetric 
            label="Top 3 LP Share" 
            value={profile.top3LpShare} 
            max={100}
            color={profile.top3LpShare > 70 ? 'bg-red-500' : 
                   profile.top3LpShare > 50 ? 'bg-yellow-500' : 'bg-green-500'}
            format={(v) => v.toFixed(1) + '%'}
          />
        </div>
      </div>

      {/* Exit Simulation */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">
          Exit Simulation (${exitTimeline.targetPosition.toLocaleString()} position)
        </h4>
        <div className="space-y-1.5">
          {exitTimeline.bands.map((band, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-28 text-gray-400">{band.label}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    band.slippageMax <= 0.05 ? 'bg-green-500' :
                    band.slippageMax <= 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${band.percentOfPosition}%` }}
                />
              </div>
              <span className="w-16 text-right text-gray-300">
                ${band.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="w-12 text-right text-gray-500">
                {band.percentOfPosition.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs">
          <span className="text-gray-400">
            Liquidatable: ${exitTimeline.totalLiquidatable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            {' '}({((exitTimeline.totalLiquidatable / exitTimeline.targetPosition) * 100).toFixed(0)}%)
          </span>
          <span className="text-gray-400">
            Est. time: {exitTimeline.timeToLiquidateMinutes < 60 
              ? `${exitTimeline.timeToLiquidateMinutes.toFixed(0)} min` 
              : `${(exitTimeline.timeToLiquidateMinutes / 60).toFixed(1)} hrs`}
          </span>
        </div>
      </div>

      {/* LP Distribution (Top 5) */}
      {profile.rawLpDistribution && profile.rawLpDistribution.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Top LP Positions</h4>
          <div className="space-y-1 text-xs">
            {profile.rawLpDistribution.slice(0, 5).map((lp, i) => (
              <div key={i} className="flex justify-between text-gray-400">
                <span className="font-mono">{lp.owner.slice(0, 12)}...</span>
                <span>{lp.sharePercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const MetricBox: React.FC<{
  label: string;
  value: string;
  sub: string;
  warning?: boolean;
  highlight?: boolean;
}> = ({ label, value, sub, warning, highlight }) => (
  <div className={`p-2.5 rounded-lg ${highlight ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-800/50'}`}>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={`text-sm font-bold ${warning ? 'text-red-400' : highlight ? 'text-blue-400' : 'text-white'}`}>
      {value}
    </div>
    <div className={`text-xs mt-0.5 ${warning ? 'text-red-400/70' : 'text-gray-500'}`}>
      {sub}
    </div>
  </div>
);

const BarMetric: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
  format: (v: number) => string;
}> = ({ label, value, max, color, format }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 text-xs text-gray-400">{label}</span>
    <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
      <div 
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
    <span className="w-16 text-right text-xs text-gray-300">{format(value)}</span>
  </div>
);

export default LiquidityDepthCard;
