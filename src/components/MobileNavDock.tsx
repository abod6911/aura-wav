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
        navigator.vibrate(8);
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0e0e16]/96 backdrop-blur-2xl border-t border-white/[0.12] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,8px)+6px)] flex items-center justify-around select-none shadow-[0_-8px_32px_rgba(0,0,0,0.92)]"
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              triggerHaptic();
              setActiveTab(tab.id);
            }}
            className="relative flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-all flex-1 cursor-pointer"
          >
            {/* Active Glow Accent Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeDockPill"
                className="absolute inset-0 rounded-2xl bg-white/[0.06] -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <Icon
              className={`w-5 h-5 transition-transform duration-200 ${
                isActive
                  ? 'text-[#FA243C] scale-110 drop-shadow-[0_0_8px_rgba(250,36,60,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            <span
              className={`text-[10px] tracking-tight transition-colors duration-200 ${
                isActive ? 'text-white font-black' : 'text-zinc-500 font-medium'
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
