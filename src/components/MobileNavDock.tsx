import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Music, Heart, Sliders, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavDockProps {
  onOpenImport: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = () => {
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);

  const tabs = [
    { id: 'library', label: 'المكتبة', icon: Music },
    { id: 'favorites', label: 'المفضلة', icon: Heart },
    { id: 'playlists', label: 'القوائم', icon: ListMusic },
  ] as const;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#07070c]/90 backdrop-blur-3xl border-t border-white/[0.08] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,8px)+6px)] flex items-center justify-around select-none shadow-[0_-8px_32px_rgba(0,0,0,0.8)]"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id && !isEqualizerOpen;
        return (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              setEqualizerOpen(false);
              setActiveTab(t.id);
            }}
            className="relative flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all"
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavGlow"
                className="absolute inset-0 rounded-xl bg-indigo-500/15 border border-indigo-500/25"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon
              className={`w-5 h-5 relative z-10 transition-colors ${
                isActive
                  ? t.id === 'favorites'
                    ? 'text-red-400'
                    : 'text-indigo-400'
                  : 'text-zinc-400'
              }`}
            />
            <span
              className={`text-[10px] font-bold relative z-10 transition-colors ${
                isActive ? 'text-white' : 'text-zinc-500'
              }`}
            >
              {t.label}
            </span>
          </motion.button>
        );
      })}

      {/* Equalizer & AutoMix tab */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setEqualizerOpen(!isEqualizerOpen)}
        className="relative flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all"
      >
        {isEqualizerOpen && (
          <motion.div
            layoutId="mobileNavGlow"
            className="absolute inset-0 rounded-xl bg-purple-500/15 border border-purple-500/25"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <Sliders
          className={`w-5 h-5 relative z-10 transition-colors ${
            isEqualizerOpen ? 'text-purple-400' : 'text-zinc-400'
          }`}
        />
        <span
          className={`text-[10px] font-bold relative z-10 transition-colors ${
            isEqualizerOpen ? 'text-white' : 'text-zinc-500'
          }`}
        >
          المعادل
        </span>
      </motion.button>
    </nav>
  );
};
