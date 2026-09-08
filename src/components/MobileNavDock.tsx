import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Home, Search, Library, Sparkles, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavDockProps {
  onOpenImport: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = () => {
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const addToast = usePlayerStore((state) => state.addToast);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  };

  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'search', label: 'بحث', icon: Search },
    { id: 'library', label: 'مكتبتك', icon: Library },
    { id: 'premium', label: 'بريميوم', icon: Sparkles },
  ] as const;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,8px)+6px)] flex items-center justify-around select-none shadow-[0_-8px_32px_rgba(0,0,0,0.85)]"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              triggerHaptic();
              if (t.id === 'premium') {
                addToast('أنت تستمتع حالياً بجميع مميزات بريميوم مجاناً مدى الحياة!', undefined, 'success');
              }
              setActiveTab(t.id);
            }}
            className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all flex-1"
          >
            <Icon
              className={`w-5 h-5 transition-colors ${
                isActive ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-bold transition-colors ${
                isActive ? 'text-white font-black' : 'text-zinc-500'
              }`}
            >
              {t.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
};
