import { memo } from 'react';

interface BottomNavProps {
  activeView: string;
  onSwitch: (view: string) => void;
  newPairCount: number;
  errorLogCount?: number; // count of err/warn log entries β€” badge on More tab
}

const VIEWS = [
  { id: 'dex',       icon: 'π€', label: 'DEX' },
  { id: 'new',       icon: 'π†•', label: 'NEW' },
  { id: 'cex',       icon: 'π“', label: 'CEX' },
  { id: 'analytics', icon: 'π’°', label: 'TRACK' },
  { id: 'settings',  icon: 'β™οΈ', label: 'MORE' },
]; // MORE tab = Log Panel + Settings (both visible on scroll)

export const BottomNav = memo(({ activeView, onSwitch, newPairCount, errorLogCount = 0 }: BottomNavProps) => (
  <nav className="lg:hidden grid bg-arb-bg2 border-t border-arb-border2 flex-shrink-0"
    style={{ gridTemplateColumns: `repeat(${VIEWS.length}, 1fr)`, height: '60px' }}>
    {VIEWS.map(v => (
      <button
        key={v.id}
        onClick={() => onSwitch(v.id)}
        className={`flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer transition-colors relative font-mono text-[8px] tracking-wider uppercase ${activeView === v.id ? 'text-arb-green' : 'text-arb-muted hover:text-arb-green'}`}
      >
        <span className="text-[16px] leading-none">{v.icon}</span>
        <span>{v.label}</span>
        {v.id === 'new' && newPairCount > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-3 bg-arb-red text-white text-[7px] px-1 rounded-full min-w-[14px] text-center animate-pulse">
            {newPairCount > 99 ? '99+' : newPairCount}
          </span>
        )}
        {v.id === 'settings' && errorLogCount > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-3 bg-arb-amber text-black text-[7px] px-1 rounded-full min-w-[14px] text-center font-bold">
            {errorLogCount > 9 ? '9+' : errorLogCount}
          </span>
        )}
      </button>
    ))}
  </nav>
));
