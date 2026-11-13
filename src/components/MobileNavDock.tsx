import React, { useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Radio, Search, Library, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

interface MobileNavDockProps {
  onOpenImport: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = () => {
  const { t, dir } = useTranslation();
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const lastTapRef = useRef<{ tabId: string; time: number }>({ tabId: '', time: 0 });

  const handleTabClick = (tabId: 'home' | 'search' | 'library' | 'favorites') => {
    triggerHaptic(8);
    const now = Date.now();
    const isDoubleTap = lastTapRef.current.tabId === tabId && now - lastTapRef.current.time < 500;
    lastTapRef.current = { tabId, time: now };

    if (activeTab === tabId && isDoubleTap) {
      // iOS Standard: Double tapping the active tab scrolls smoothly to top
      const scrollEl = document.querySelector('main');
      if (scrollEl) {
        scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (activeTab !== tabId) {
      setActiveTab(tabId);
    }
  };

  const tabs = [
    { id: 'home' as const, label: t.listenNow, icon: Radio },
    { id: 'search' as const, label: t.search, icon: Search },
    { id: 'library' as const, label: t.library, icon: Library },
    { id: 'favorites' as const, label: t.favorites, icon: Heart },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{
        backgroundColor: '#090910',
        paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
      }}
      className="w-full border-t border-white/[0.08] px-1 pt-1 flex items-center justify-around select-none pointer-events-auto shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.8)]"
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTabClick(tab.id);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabClick(tab.id);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all flex-1 cursor-pointer h-[44px] min-h-[44px] touch-manipulation select-none active:scale-95 pointer-events-auto"
            aria-selected={isActive}
            role="tab"
          >
            {/* Sliding Liquid Active Indicator with Apple Spring Physics */}
            {isActive && (
              <motion.div
                layoutId="activeMobileTab"
                className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-white/[0.08] border border-white/[0.1] shadow-sm pointer-events-none"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 36,
                  mass: 0.8,
                }}
              />
            )}
            <div
              className={`transition-transform duration-150 relative z-10 ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
            >
              <Icon
                className={`w-[20px] h-[20px] transition-colors duration-150 ${
                  isActive
                    ? 'text-[#FA243C]'
                    : 'text-white/60 hover:text-white'
                }`}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors duration-150 relative z-10 leading-tight ${
                isActive ? 'text-white font-bold' : 'text-white/60 font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
