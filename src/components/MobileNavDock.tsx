import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Radio, Search, Library, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavDockProps {
  onOpenImport: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = () => {
  const { t, dir } = useTranslation();
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
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
      className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-4 max-w-md mx-auto z-40 apple-glass-dock rounded-[28px] p-1.5 flex items-center justify-around select-none shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.18)] transform-gpu border border-white/[0.14]"
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              triggerHaptic();
              setActiveTab(tab.id);
            }}
            className="relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all flex-1 cursor-pointer min-h-[44px]"
            aria-selected={isActive}
            role="tab"
          >
            {/* Sliding Liquid Active Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeNavTab"
                className="absolute inset-0 rounded-2xl bg-white/[0.12] border border-white/[0.14] shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className={`w-5 h-5 transition-all duration-200 ${
                isActive
                  ? 'text-[#FA243C] scale-110 drop-shadow-[0_0_10px_rgba(250,36,60,0.7)]'
                  : 'text-white/60 hover:text-white'
              }`}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
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
