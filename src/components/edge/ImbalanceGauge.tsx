interface Props { value: number; ratio: number }

export function ImbalanceGauge({ value, ratio }: Props) {
  const pct = ((value + 1) / 2) * 100;
  const color = value > 0.15 ? 'bg-arb-green' : value < -0.15 ? 'bg-arb-red' : 'bg-arb-muted';
  return (
    <div className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted mb-2">Imbalance</h3>
      <div className="font-mono text-arb-text text-lg leading-tight">{ratio.toFixed(2)}x</div>
      <div className="h-2 bg-arb-bg3 rounded-full mt-2 relative overflow-hidden">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-arb-border" />
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.abs(value) * 50}%`, marginLeft: value < 0 ? `${50 + value * 50}%` : '50%' }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-arb-muted mt-1">
        <span>SELL</span><span>BUY</span>
      </div>
    </div>
  );
}
