// ============================================
// OpportunityCard.tsx — ENHANCED with Liquidity Intelligence
// Replace your existing opportunity card with this
// ============================================

import React, { useState } from 'react';
import { ArbOpportunity } from '../integration/useArbScanner.enhanced';
import { LiquidityDepthCard } from '../components/LiquidityDepthCard';

interface OpportunityCardProps {
  opportunity: ArbOpportunity;
  onSelect?: (opp: ArbOpportunity) => void;
  expanded?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onSelect,
  expanded = false,
}) => {
  const [showLiquidity, setShowLiquidity] = useState(expanded);

  const riskColors = {
    LOW: 'border-green-500/30 bg-green-500/5',
    MODERATE: 'border-yellow-500/30 bg-yellow-500/5',
    HIGH: 'border-orange-500/30 bg-orange-500/5',
    CRITICAL: 'border-red-500/30 bg-red-500/5',
    UNKNOWN: 'border-gray-500/30 bg-gray-500/5',
  };

  const healthColor = opportunity.healthScore >= 75 ? 'text-green-400' :
    opportunity.healthScore >= 50 ? 'text-yellow-400' :
    opportunity.healthScore >= 25 ? 'text-orange-400' : 'text-red-400';

  const isGoodOpp = opportunity.isTradeable && opportunity.spreadPercent > 0.5;

  return (
    <div 
      className={`rounded-xl border transition-all duration-200 ${
        isGoodOpp ? riskColors[opportunity.riskLevel as keyof typeof riskColors] || riskColors.UNKNOWN : 'border-gray-800 bg-gray-900/50'
      } ${onSelect ? 'cursor-pointer hover:border-gray-600' : ''}`}
      onClick={() => onSelect?.(opportunity)}
    >
      {/* Header Row */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{opportunity.pair}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              opportunity.chain === 'solana' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {opportunity.chain.toUpperCase()}
            </span>

            {/* NEW: Tradeable badge */}
            {opportunity.isTradeable ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                ✓ TRADEABLE
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                ✗ BLOCKED
              </span>
            )}
          </div>

          <div className="text-right">
            <div className={`text-xl font-bold ${healthColor}`}>
              {opportunity.spreadPercent.toFixed(3)}%
            </div>
            <div className="text-xs text-gray-500">spread</div>
          </div>
        </div>

        {/* Price Row */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="text-xs text-gray-500 mb-1">Buy @ {opportunity.buyVenue}</div>
            <div className="text-sm font-mono text-white">${opportunity.buyPrice.toFixed(6)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="text-xs text-gray-500 mb-1">Sell @ {opportunity.sellVenue}</div>
            <div className="text-sm font-mono text-green-400">${opportunity.sellPrice.toFixed(6)}</div>
          </div>
        </div>

        {/* NEW: Key Liquidity Metrics (compact) */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <MetricPill 
            label="Net Profit" 
            value={`$${opportunity.netProfit.toFixed(2)}`}
            highlight={opportunity.netProfit > 5}
          />
          <MetricPill 
            label="Max Size" 
            value={`$${opportunity.positionCeiling.toLocaleString()}`}
            highlight
          />
          <MetricPill 
            label="Health" 
            value={`${opportunity.healthScore}/100`}
            color={healthColor}
          />
          <MetricPill 
            label="Risk" 
            value={opportunity.riskLevel}
            color={opportunity.riskLevel === 'LOW' ? 'text-green-400' : 
                  opportunity.riskLevel === 'MODERATE' ? 'text-yellow-400' :
                  opportunity.riskLevel === 'HIGH' ? 'text-orange-400' : 'text-red-400'}
          />
        </div>

        {/* NEW: Block reason (if not tradeable) */}
        {!opportunity.isTradeable && opportunity.tradeableReason && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-lg">⚠</span>
              <span className="text-sm text-red-300">{opportunity.tradeableReason}</span>
            </div>
          </div>
        )}

        {/* Toggle Liquidity Detail */}
        {opportunity.liquidityProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLiquidity(!showLiquidity);
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-2 border-t border-gray-800 transition-colors flex items-center justify-center gap-1"
          >
            {showLiquidity ? '▲ Hide' : '▼ Show'} Liquidity Analysis
          </button>
        )}
      </div>

      {/* Expanded Liquidity Detail */}
      {showLiquidity && opportunity.liquidityProfile && (
        <div className="border-t border-gray-800">
          <LiquidityDepthCard profile={opportunity.liquidityProfile} />
        </div>
      )}
    </div>
  );
};

const MetricPill: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}> = ({ label, value, highlight, color }) => (
  <div className={`rounded-lg p-2 text-center ${highlight ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-800/30'}`}>
    <div className={`text-xs font-bold ${color || 'text-white'}`}>{value}</div>
    <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
  </div>
);

export default OpportunityCard;
