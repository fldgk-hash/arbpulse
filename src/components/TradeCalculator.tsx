import { memo, useState, useEffect } from 'react';
import type { DexOpp, CexOpp } from '@/hooks/useArbScanner';
import { fmtPrice } from '@/hooks/useArbScanner';

interface TradeCalculatorProps {
  opp: (DexOpp | CexOpp) | null;
  onClose: () => void;
  onLog: (opp: DexOpp | CexOpp) => void;
  defaultTradeSize: number;
}

export const TradeCalculator = memo(({ opp, onClose, onLog, defaultTradeSize }: TradeCalculatorProps) => {
  const [size, setSize] = useState(defaultTradeSize);

  useEffect(() => { setSize(defaultTradeSize); }, [defaultTradeSize]);

  if (!opp) return null;

  const isDex = 'buyDex' in opp;
  const buyAt = isDex ? (opp as DexOpp).eB || (opp as DexOpp).buyPrice : (opp as CexOpp).buyAt;
  const sellAt = isDex ? (opp as DexOpp).eS || (opp as DexOpp).sellPrice : (opp as CexOpp).sellAt;
  const label = isDex ? `${(opp as DexOpp).symbol} — ${(opp as DexOpp).buyDex} → ${(opp as DexOpp).sellDex}` : `${(opp as CexOpp).label} — ${(opp as CexOpp).buyEx} → ${(opp as CexOpp).sellEx}`;

  // Dynamic fees per exchange type
  const isDexOpp = isDex;
  const buyFee = isDexOpp
    ? ((opp as DexOpp).buyDex?.includes('pancake') || (opp as DexOpp).buyDex?.includes('v3') ? 0.0005 : 0.003)
    : ((opp as CexOpp).buyEx === 'Kraken' ? 0.002 : 0.001);
  const sellFee = isDexOpp
    ? ((opp as DexOpp).sellDex?.includes('pancake') || (opp as DexOpp).sellDex?.includes('v3') ? 0.0005 : 0.003)
    : ((opp as CexOpp).sellEx === 'Kraken' ? 0.002 : 0.001);
  const feeRate = buyFee + sellFee;

  const qty = size / buyAt;
  const gross = (sellAt - buyAt) * qty;
  const fees = size * feeRate;
  const net = gross - fees;
  const roi = (net / size) * 100;
  const bePct = (feeRate / (sellAt / buyAt - 1)) * 100;

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-arb-bg2 border border-arb-border2 rounded-xl w-full max-w-[380px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3.5 px-4 border-b border-arb-border">
          <span className="font-sans font-semibold text-[14px] text-arb-head">Trade Calculator</span>
          <button onClick={onClose} className="bg-transparent border-none text-arb-muted cursor-pointer text-[16px] px-1.5 py-0.5 rounded hover:text-arb-red">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="font-sans font-bold text-[15px] text-arb-cyan">{label}</div>

          <div className="grid grid-cols-2 gap-2">
            <CalcItem label="Buy Price" value={`$${fmtPrice(buyAt)}`} />
            <CalcItem label="Sell Price" value={`$${fmtPrice(sellAt)}`} />
            <CalcItem label="Spread" value={`${opp.spreadPct.toFixed(3)}%`} cls="text-arb-green" />
            <CalcItem label={`Fees (${(feeRate*100).toFixed(2)}%)`} value={`$${fees.toFixed(2)}`} cls="text-arb-amber" />
          </div>

          <div>
            <label className="text-[9px] text-arb-muted uppercase tracking-wider">Trade Size ($)</label>
            <input type="number" value={size} step={100} min={100}
              onChange={e => setSize(parseFloat(e.target.value) || 1000)}
              className="w-full bg-arb-bg3 border border-arb-border2 text-arb-head p-2 px-2.5 font-mono text-xs outline-none mt-1 rounded focus:border-arb-green" />
          </div>

          <div className="bg-arb-bg3 rounded-md p-3 flex flex-col gap-1.5">
            <CalcRow label="Gross Profit" value={`$${gross.toFixed(2)}`} cls="text-arb-green" />
            <CalcRow label="Net Profit" value={`$${net.toFixed(2)}`} cls={net >= 0 ? 'text-arb-green text-[18px]' : 'text-arb-red text-[18px]'} />
            <CalcRow label="ROI" value={`${roi.toFixed(3)}%`} cls="text-arb-amber" />
            <CalcRow label="Break-even spread" value={`${bePct.toFixed(4)}%`} cls="text-arb-muted" />
          </div>

          <button onClick={() => { onLog(opp); onClose(); }}
            className="w-full p-2.5 bg-transparent border border-arb-green text-arb-green font-mono text-[10px] tracking-[2px] uppercase cursor-pointer rounded hover:bg-arb-green/10 transition-colors">
            📌 LOG THIS OPPORTUNITY
          </button>
        </div>
      </div>
    </div>
  );
});

function CalcItem({ label, value, cls = 'text-arb-head' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-arb-bg3 rounded p-2 px-2.5">
      <div className="text-[9px] text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[13px] font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function CalcRow({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-arb-muted">{label}</span>
      <span className={`font-semibold ${cls}`}>{value}</span>
    </div>
  );
}
