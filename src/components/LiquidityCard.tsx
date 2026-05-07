// ============================================
// LiquidityCard.tsx
// Rich UI component displaying DepthProfile
// Replaces simple TVL badge with full depth analysis
// ============================================

import React from 'react';
import { DepthProfile, ExitBand } from '../engine/types/liquidity.types';

interface LiquidityCardProps {
  profile: DepthProfile;
  compact?: boolean;
}

const RISK_COLORS = {
  LOW: 'text-green-400',
  MODERATE: 'text-yellow-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-500',
};

const RISK_BG = {
  LOW: 'bg-green-500/10 border-green-500/20',
  MODERATE: 'bg-yellow-500/10 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 border-red-500/20',
};

export const LiquidityCard: React.FC<LiquidityCardProps> = ({ profile, compact = false }) => {
  if (compact) {
    return <CompactView profile={profile} />;
  }

  return (
    <div className={`rounded-xl border p-4 ${RISK_BG[profile.riskLevel]} space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">
            {profile.pair.baseToken.symbol}/{profile.pair.quoteToken.symbol}
          </h3>
          <p className="text-xs text-gray-400">{profile.pair.dexId} · {profile.pair.chain}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${RISK_COLORS[profile.riskLevel]}`}>
            {profile.healthScore}/100
          </div>
          <div className={`text-xs font-medium ${RISK_COLORS[profile.riskLevel]}`}>
            {profile.riskLevel}
          </div>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox 
          label="TVL" 
          value={`$${formatNumber(profile.tvl)}`}
          warning={profile.tvl < 25000}
        />
        <MetricBox 
          label="Real Depth ±2%" 
          value={`$${formatNumber(profile.realDepth2pct)}`}
          warning={profile.realDepth2pct < profile.tvl * 0.1}
        />
        <MetricBox 
          label="Top LP Share" 
          value={`${profile.topLpShare.toFixed(1)}%`}
          warning={profile.topLpShare > 50}
        />
        <MetricBox 
          label="Gini" 
          value={profile.giniCoefficient.toFixed(2)}
          warning={profile.giniCoefficient > 0.7}
        />
      </div>

      {/* Wash Trading */}
      <div className="rounded-lg bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Wash Probability</span>
          <span className={`text-sm font-bold ${getWashColor(profile.washProbability)}`}>
            {profile.washProbability}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${getWashBarColor(profile.washProbability)}`}
            style={{ width: `${profile.washProbability}%` }}
          />
        </div>
        {profile.velocityAnomaly && (
          <p className="text-xs text-red-400 mt-1">⚠️ Volume velocity anomaly detected</p>
        )}
      </div>

      {/* Exit Simulation */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-300">
          Exit Simulation (${formatNumber(profile.exitTimeline.targetPosition)} position)
        </h4>
        <div className="space-y-1">
          {profile.exitTimeline.bands.map((band, i) => (
            <ExitBandRow key={i} band={band} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 pt-1">
          <span>Total liquidatable: ${formatNumber(profile.exitTimeline.totalLiquidatable)}</span>
          <span>Est. time: {formatTime(profile.exitTimeline.timeToLiquidateMinutes)}</span>
        </div>
      </div>

      {/* Position Ceiling */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-300">Position Ceiling</span>
          <span className="text-lg font-bold text-blue-400">
            ${formatNumber(profile.positionCeiling)}
          </span>
        </div>
        <p className="text-xs text-blue-300/70 mt-1">
          Max recommended position before slippage becomes prohibitive
        </p>
      </div>

      {/* Raw Data Toggle (for power users) */}
      {profile.rawDepthBands && profile.rawDepthBands.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
            Raw Depth Bands
          </summary>
          <div className="mt-2 space-y-1 text-gray-400">
            {profile.rawDepthBands.map((band, i) => (
              <div key={i} className="flex justify-between">
                <span>{(band.slippage * 100).toFixed(1)}% slippage:</span>
                <span>${formatNumber(band.cumulativeDepth)} depth</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

// ============================================
// COMPACT VIEW (for list/grid display)
// ============================================

const CompactView: React.FC<{ profile: DepthProfile }> = ({ profile }) => {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${RISK_BG[profile.riskLevel]}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${RISK_COLORS[profile.riskLevel]} bg-black/30`}>
        {profile.healthScore}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm truncate">
            {profile.pair.baseToken.symbol}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${RISK_BG[profile.riskLevel]} ${RISK_COLORS[profile.riskLevel]}`}>
            {profile.riskLevel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>TVL ${formatCompact(profile.tvl)}</span>
          <span>Depth ${formatCompact(profile.realDepth2pct)}</span>
          <span>Cap ${formatCompact(profile.positionCeiling)}</span>
        </div>
      </div>
      {profile.washProbability > 50 && (
        <div className="text-xs text-red-400">🤖 {profile.washProbability}%</div>
      )}
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const MetricBox: React.FC<{ label: string; value: string; warning?: boolean }> = ({ 
  label, value, warning 
}) => (
  <div className={`rounded-lg bg-black/30 p-2 ${warning ? 'border border-red-500/30' : ''}`}>
    <div className="text-xs text-gray-400">{label}</div>
    <div className={`text-sm font-semibold ${warning ? 'text-red-400' : 'text-white'}`}>
      {value}
    </div>
  </div>
);

const ExitBandRow: React.FC<{ band: ExitBand }> = ({ band }) => {
  const colors = {
    '<1% slippage': 'bg-green-500/20 text-green-400',
    '1-5% slippage': 'bg-yellow-500/20 text-yellow-400',
    '5-25% slippage': 'bg-orange-500/20 text-orange-400',
    '25-50% slippage': 'bg-red-500/20 text-red-400',
    '>50% slippage (stuck)': 'bg-red-900/30 text-red-500',
  };

  return (
    <div className={`flex items-center justify-between text-xs rounded px-2 py-1 ${colors[band.label as keyof typeof colors] || 'bg-gray-700'}`}>
      <span>{band.label}</span>
      <span className="font-mono">
        ${formatCompact(band.amountUsd)} ({band.percentOfPosition}%)
      </span>
    </div>
  );
};

// ============================================
// UTILITIES
// ============================================

function formatNumber(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function formatCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function formatTime(minutes: number): string {
  if (minutes === Infinity || minutes > 1e6) return '∞';
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function getWashColor(probability: number): string {
  if (probability > 75) return 'text-red-500';
  if (probability > 50) return 'text-orange-400';
  if (probability > 25) return 'text-yellow-400';
  return 'text-green-400';
}

function getWashBarColor(probability: number): string {
  if (probability > 75) return 'bg-red-500';
  if (probability > 50) return 'bg-orange-500';
  if (probability > 25) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default LiquidityCard;
