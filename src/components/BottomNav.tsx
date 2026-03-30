import { memo } from 'react';

interface BottomNavProps {
  activeView: string;
  onSwitch: (view: string) => void;
  newPairCount: number;
}

const VIEWS = [
  { id: 'dex',       icon: '🚀', label: 'DEX' },
  { id: 'new',       icon: '🆕', label: 'NEW' },
  { id: 'cex',       icon: '📊', label: 'CEX' },
  { id: 'analytics', icon: '💰', label: 'Track' },
  { id: 'settings',  icon: '⚙️', label: 'More' },
]; // 5 tabs — Log merged into More/Settings

export const BottomNav = memo(({ activeView, onSwitch, newPairCount }: BottomNavProps) => (
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
      </button>
    ))}
  </nav>
));
