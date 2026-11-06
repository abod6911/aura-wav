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
      className="w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] max-w-md mx-auto apple-glass-dock rounded-[22px] sm:rounded-[24px] p-1 sm:p-1.5 flex items-center justify-around select-none shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] border border-white/[0.14] shrink-0"
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleTabClick(tab.id)}
            className="relative flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-2xl transition-colors flex-1 cursor-pointer min-h-[42px] sm:min-h-[44px]"
            aria-selected={isActive}
            role="tab"
          >
            {/* Sliding Liquid Active Indicator with Apple Spring Physics */}
            {isActive && (
              <motion.div
                layoutId="activeMobileTab"
                className="absolute inset-0 rounded-2xl bg-white/[0.10] border border-white/[0.12] shadow-sm -z-10"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 36,
                  mass: 0.8,
                }}
              />
            )}
            <motion.div
              animate={{ scale: isActive ? 1.08 : 1 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 36,
                mass: 0.8,
              }}
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#FA243C]'
                    : 'text-white/60 hover:text-white'
                }`}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
            </motion.div>
            <span
              className={`text-[10px] tracking-tight transition-colors duration-200 ${
                isActive ? 'text-white font-black' : 'text-white/60 font-medium'
              }`}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
};
