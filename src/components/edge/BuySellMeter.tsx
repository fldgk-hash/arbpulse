interface Props { buy: number; sell: number }
export function BuySellMeter({ buy, sell }: Props) {
  const total = buy + sell || 1;
  const buyPct = (buy / total) * 100;
  return (
    <div className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Buy vs Sell (60s)</h3>
      <div className="font-mono text-arb-text text-lg leading-tight">${((buy + sell) / 1000).toFixed(0)}k</div>
      <div className="h-2 flex rounded-full overflow-hidden mt-2 bg-arb-bg3">
        <div className="bg-arb-green" style={{ width: `${buyPct}%` }} />
        <div className="bg-arb-red" style={{ width: `${100 - buyPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono mt-1">
        <span className="text-arb-green">B ${(buy / 1000).toFixed(1)}k</span>
        <span className="text-arb-red">S ${(sell / 1000).toFixed(1)}k</span>
      </div>
    </div>
  );
}
