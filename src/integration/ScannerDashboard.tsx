// ============================================
// ScannerDashboard.tsx — Full integration example
// Shows liquidity stats, filters, and opportunity cards
// ============================================

import React, { useState, useEffect } from 'react';
import { useArbScanner, ScannerConfig } from '../integration/useArbScanner.enhanced';
import { OpportunityCard } from '../integration/OpportunityCard.enhanced';
import { TokenPair } from '../engine/types/liquidity.types';

interface ScannerDashboardProps {
  initialPairs?: TokenPair[];
  autoScan?: boolean;
  scanInterval?: number;
}

export const ScannerDashboard: React.FC<ScannerDashboardProps> = ({
  initialPairs = [],
  autoScan = false,
  scanInterval = 30000,
}) => {
  const [config, setConfig] = useState<Partial<ScannerConfig>>({
    minSpread: 0.5,
    minProfit: 1.0,
    enableLiquidityCheck: true,
    minHealthScore: 40,
    maxWashProbability: 75,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);

  const {
    opportunities,
    filteredOpportunities,
    scanning,
    analyzingLiquidity,
    scanCount,
    lastScan,
    liquidityStats,
    scan,
    config: activeConfig,
  } = useArbScanner(config);

  // Auto-scan on mount and interval
  useEffect(() => {
    if (initialPairs.length > 0) {
      scan(initialPairs);
    }

    if (autoScan && scanInterval > 0) {
      const interval = setInterval(() => {
        if (initialPairs.length > 0) scan(initialPairs);
      }, scanInterval);
      return () => clearInterval(interval);
    }
  }, [initialPairs, autoScan, scanInterval]);

  const goodOpps = filteredOpportunities.filter(o => o.isTradeable);
  const blockedOpps = filteredOpportunities.filter(o => !o.isTradeable);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">ArbPulse Pro</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                +Liquidity Intelligence
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Scan Status */}
              <div className="flex items-center gap-2 text-sm">
                {scanning ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span className="text-yellow-400">
                      {analyzingLiquidity ? 'Analyzing depth...' : 'Scanning...'}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">
                    Last scan: {lastScan ? lastScan.toLocaleTimeString() : 'Never'}
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
              >
                ⚙ Filters
              </button>

              <button
                onClick={() => initialPairs.length > 0 && scan(initialPairs)}
                disabled={scanning}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {scanning ? 'Scanning...' : '⟳ Scan Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Stats Bar */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="grid grid-cols-5 gap-4">
            <StatBox 
              label="Total Checked" 
              value={liquidityStats.totalChecked} 
              color="text-gray-400"
            />
            <StatBox 
              label="✓ Tradeable" 
              value={liquidityStats.tradeableCount}
              color="text-green-400"
              highlight
            />
            <StatBox 
              label="✗ Blocked" 
              value={liquidityStats.skippedCount}
              color="text-red-400"
            />
            <StatBox 
              label="Avg Health" 
              value={`${liquidityStats.avgHealthScore}/100`}
              color={liquidityStats.avgHealthScore >= 60 ? 'text-green-400' : 
                     liquidityStats.avgHealthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}
            />
            <StatBox 
              label="Scans" 
              value={scanCount}
              color="text-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <FilterSlider 
                label="Min Spread %"
                value={config.minSpread || 0.5}
                min={0.1} max={5} step={0.1}
                onChange={(v) => setConfig(prev => ({ ...prev, minSpread: v }))}
              />
              <FilterSlider 
                label="Min Health Score"
                value={config.minHealthScore || 40}
                min={0} max={100} step={5}
                onChange={(v) => setConfig(prev => ({ ...prev, minHealthScore: v }))}
              />
              <FilterSlider 
                label="Max Wash Probability %"
                value={config.maxWashProbability || 75}
                min={0} max={100} step={5}
                onChange={(v) => setConfig(prev => ({ ...prev, maxWashProbability: v }))}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="enableLiquidity"
                checked={config.enableLiquidityCheck}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  enableLiquidityCheck: e.target.checked 
                }))}
                className="rounded border-gray-600"
              />
              <label htmlFor="enableLiquidity" className="text-sm text-gray-400">
                Enable Liquidity Intelligence (slower but safer)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <TabButton 
            active={selectedOpp === null}
            onClick={() => setSelectedOpp(null)}
            label={`Tradeable (${goodOpps.length})`}
            color="green"
          />
          <TabButton 
            active={selectedOpp === 'blocked'}
            onClick={() => setSelectedOpp('blocked')}
            label={`Blocked (${blockedOpps.length})`}
            color="red"
          />
          <TabButton 
            active={selectedOpp === 'all'}
            onClick={() => setSelectedOpp('all')}
            label={`All (${filteredOpportunities.length})`}
            color="gray"
          />
        </div>

        {/* Opportunity Grid */}
        <div className="grid gap-4">
          {selectedOpp === null && goodOpps.length === 0 && (
            <EmptyState message="No tradeable opportunities found. Adjust filters or wait for next scan." />
          )}

          {selectedOpp === 'blocked' && blockedOpps.length === 0 && (
            <EmptyState message="No blocked opportunities. All scanned pairs passed liquidity checks." />
          )}

          {(selectedOpp === null ? goodOpps : 
            selectedOpp === 'blocked' ? blockedOpps : 
            filteredOpportunities).map(opp => (
            <OpportunityCard 
              key={opp.id} 
              opportunity={opp}
              onSelect={(o) => console.log('Selected:', o.pair)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-components
const StatBox: React.FC<{
  label: string;
  value: string | number;
  color: string;
  highlight?: boolean;
}> = ({ label, value, color, highlight }) => (
  <div className={`text-center p-2 rounded-lg ${highlight ? 'bg-gray-800/50' : ''}`}>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
  </div>
);

const FilterSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}> = ({ active, onClick, label, color }) => {
  const colorClasses = {
    green: active ? 'text-green-400 border-green-400' : 'text-gray-500 border-transparent hover:text-gray-300',
    red: active ? 'text-red-400 border-red-400' : 'text-gray-500 border-transparent hover:text-gray-300',
    gray: active ? 'text-white border-white' : 'text-gray-500 border-transparent hover:text-gray-300',
  };

  return (
    <button
      onClick={onClick}
      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      {label}
    </button>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12 text-gray-500">
    <div className="text-4xl mb-3">📊</div>
    <p className="text-sm">{message}</p>
  </div>
);

export default ScannerDashboard;
