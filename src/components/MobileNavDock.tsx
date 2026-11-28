import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Home, Search, Library, Heart } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { LUXURY_SPRING } from '../utils/motion';

interface MobileNavDockProps {
  onOpenImport?: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = () => {
  const { isRTL, dir } = useTranslation();
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const lastTapRef = useRef<{ tabId: string; time: number }>({ tabId: '', time: 0 });

  const handleTabClick = useCallback((tabId: 'home' | 'search' | 'library' | 'favorites') => {
    triggerHaptic(8);
    const now = Date.now();
    const isDoubleTap = lastTapRef.current.tabId === tabId && now - lastTapRef.current.time < 500;
    lastTapRef.current = { tabId, time: now };

    if (activeTab === tabId && isDoubleTap) {
      // iOS Standard: Double tapping the active tab scrolls smoothly to top
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const scrollEl = document.querySelector('main');
        scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (activeTab !== tabId) {
      setActiveTab(tabId);
    }
  }, [activeTab, setActiveTab]);

  const tabs = [
    { id: 'home' as const, label: isRTL ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'search' as const, label: isRTL ? 'بحث' : 'Search', icon: Search },
    { id: 'library' as const, label: isRTL ? 'مكتبتك' : 'Library', icon: Library },
    { id: 'favorites' as const, label: isRTL ? 'المفضلة' : 'Favorites', icon: Heart },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      className="fixed bottom-0 inset-x-0 w-full bg-[#0C0C10]/[0.96] backdrop-blur-md border-t border-white/[0.08] px-2 flex items-start justify-around select-none pointer-events-auto shrink-0 z-40 min-h-[calc(60px+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            type="button"
            whileTap={{ scale: 0.9 }}
            transition={LUXURY_SPRING}
            onClick={(e) => {
              e.stopPropagation();
              handleTabClick(tab.id);
            }}
            className="relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 transition-colors flex-1 cursor-pointer h-[60px] touch-manipulation select-none pointer-events-auto"
            aria-selected={isActive}
            role="tab"
          >
            {isActive && (
              <motion.span
                layoutId="mobile-nav-active-bar"
                transition={LUXURY_SPRING}
                className="absolute top-0 w-7 h-[3px] rounded-b-full bg-[#1DB954] shadow-[0_0_10px_rgba(29,185,84,0.85)]"
              />
            )}
            <motion.div
              animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
              transition={LUXURY_SPRING}
              className="relative px-3 py-0.5 rounded-full"
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active-bg"
                  transition={LUXURY_SPRING}
                  className="absolute inset-0 rounded-full bg-[#1DB954]/14 border border-[#1DB954]/25"
                />
              )}
              <Icon
                className={`relative z-10 w-[20px] h-[20px] transition-colors duration-150 ${
                  isActive ? 'text-[#1DB954]' : 'text-[#A1A1AA]'
                }`}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
            </motion.div>
            <span
              className={`text-[10.5px] tracking-tight transition-colors duration-150 leading-none ${
                isActive ? 'text-[#1DB954] font-bold' : 'text-[#A1A1AA] font-medium'
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
