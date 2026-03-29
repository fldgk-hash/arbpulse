import { memo, useMemo } from 'react';
import type { ScannerState } from '@/hooks/useArbScanner';
import { fmtPrice, SYMBOLS } from '@/hooks/useArbScanner';

interface AnalyticsViewProps {
  state: ScannerState;
  onClearHistory: () => void;
  onExportCSV: () => void;
}

const COMP_SYMS = ['BTC','ETH','SOL','BNB','XRP','DOGE','AVAX','LINK','ADA','DOT','UNI','LTC','NEAR','AAVE'];

export const AnalyticsView = memo(({ state, onClearHistory, onExportCSV }: AnalyticsViewProps) => {
  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">
      {/* Session PnL Hero */}
      <div className="bg-arb-bg2 border border-arb-border rounded-lg p-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[9px] tracking-[2px] uppercase text-arb-muted mb-0.5">Session PnL</div>
          <div className={`font-sans text-[26px] font-bold ${state.sessionPnl >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>
            ${state.sessionPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-arb-muted mt-0.5">{state.history.length} logged · {state.wins} wins</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onExportCSV} className="bg-transparent border border-arb-cyan text-arb-cyan px-2.5 py-1 text-[9px] rounded-full cursor-pointer font-mono hover:bg-arb-cyan/10 transition-colors">
            ⬇ CSV
          </button>
          <button onClick={onClearHistory} className="bg-transparent border border-arb-red text-arb-red px-2.5 py-1 text-[9px] rounded-full cursor-pointer font-mono hover:bg-arb-red/10 transition-colors">
            ✕ Clear
          </button>
        </div>
      </div>

      {/* Price Comparison Table */}
      <PriceCompTable prices={state.prices} />

      {/* History */}
      <div className="bg-arb-bg2 border border-arb-border rounded-lg flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-between p-2.5 px-3 border-b border-arb-border flex-shrink-0">
          <span className="font-sans font-semibold text-[12px] text-arb-head">Opportunity History</span>
          <span className="text-[9px] text-arb-muted">{state.history.length} logged</span>
        </div>
        <div className="flex flex-col gap-1.5 p-2.5 flex-1 overflow-y-auto">
          {state.history.length === 0 ? (
            <div className="text-center py-8 text-arb-muted text-[11px] leading-relaxed">
              No opportunities logged yet.<br />Press LOG on any opportunity card to save it here.
            </div>
          ) : (
            state.history.map((e, i) => (
              <div key={i} className="bg-arb-bg3 border border-arb-border rounded-md p-2.5 px-3 flex items-center gap-2.5 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[13px] text-arb-head flex items-center gap-1.5">
                    {e.sym}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${e.type === 'DEX' ? 'bg-arb-cyan/10 text-arb-cyan' : 'bg-arb-purple/10 text-arb-purple'}`}>{e.type}</span>
                  </div>
                  <div className="text-[9px] text-arb-muted mt-0.5">{e.route}</div>
                  <div className="text-[9px] text-arb-muted">{e.tsDisplay}</div>
                </div>
                <div className="text-right">
                  <div className={`font-sans font-bold text-[15px] ${e.net >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>${e.net.toFixed(2)}</div>
                  <div className="text-[9px] text-arb-muted">{e.spread.toFixed(3)}%</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

function PriceCompTable({ prices }: { prices: Record<string, any> }) {
  // Simplified price comparison — shows Binance prices only since we have those in state
  // In production this would compare all 4 exchange prices
  return (
    <div className="bg-arb-bg2 border border-arb-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2.5 px-3 border-b border-arb-border flex-shrink-0">
        <span className="font-sans font-semibold text-[12px] text-arb-head">Live Prices</span>
        <span className="text-[9px] text-arb-muted">Updated {new Date().toLocaleTimeString()}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[300px] text-[11px]">
          <thead>
            <tr>
              {['PAIR', 'PRICE', '24H %'].map(h => (
                <th key={h} className="text-[8px] tracking-[2px] uppercase text-arb-muted px-3 py-2 border-b border-arb-border text-left font-semibold bg-arb-bg3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMP_SYMS.map(sym => {
              const p = prices[sym];
              if (!p?.price) return null;
              const chg = p.chg24 ?? 0;
              return (
                <tr key={sym} className="hover:bg-arb-blue/[0.03]">
                  <td className="px-3 py-1.5 border-b border-arb-border/30 text-arb-head font-medium">{sym}</td>
                  <td className="px-3 py-1.5 border-b border-arb-border/30 tabular-nums">${fmtPrice(p.price)}</td>
                  <td className={`px-3 py-1.5 border-b border-arb-border/30 font-semibold ${chg >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>
                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
