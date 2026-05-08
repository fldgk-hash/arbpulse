import { useEffect, useRef } from 'react';

export function CvdChart({ value }: { value: number }) {
  const ref = useRef<number[]>([]);
  ref.current.push(value);
  if (ref.current.length > 60) ref.current.shift();
  const arr = ref.current;
  const max = Math.max(...arr.map(Math.abs), 1);
  const points = arr.map((v, i) => {
    const x = (i / Math.max(arr.length - 1, 1)) * 100;
    const y = 50 - (v / max) * 45;
    return `${x},${y}`;
  }).join(' ');
  const last = value;
  const color = last >= 0 ? 'hsl(var(--arb-green, 142 76% 50%))' : 'hsl(var(--arb-red, 0 84% 60%))';

  return (
    <section className="bg-arb-bg2 rounded-md border border-arb-border p-2">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-[10px] font-bold tracking-wider uppercase text-arb-muted">CVD (60s)</h3>
        <span className={`font-mono text-xs ${last >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>{last >= 0 ? '+' : ''}${(last / 1000).toFixed(1)}k</span>
      </div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-16">
        <line x1="0" y1="50" x2="100" y2="50" stroke="hsl(var(--arb-border))" strokeWidth="0.3" strokeDasharray="1,1" />
        {arr.length > 1 && <polyline points={points} fill="none" stroke={color} strokeWidth="1" />}
      </svg>
    </section>
  );
}
