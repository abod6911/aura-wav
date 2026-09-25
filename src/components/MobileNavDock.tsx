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
      className="md:hidden fixed bottom-6 inset-x-4 max-w-md mx-auto z-40 bg-[#12121a]/85 backdrop-blur-3xl border border-white/[0.12] rounded-3xl p-1.5 flex items-center justify-around select-none shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)]"
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
            className="relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all flex-1 cursor-pointer"
          >
            {/* Sliding Liquid Active Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeNavTab"
                className="absolute inset-0 rounded-2xl bg-white/[0.10] border border-white/[0.12] shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className={`w-5 h-5 transition-all duration-200 ${
                isActive
                  ? 'text-[#FA243C] scale-110 drop-shadow-[0_0_10px_rgba(250,36,60,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            <span
              className={`text-[10px] tracking-tight transition-colors duration-200 ${
                isActive ? 'text-white font-black' : 'text-zinc-400 font-medium'
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
