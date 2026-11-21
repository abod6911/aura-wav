import React, { useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Radio, Search, Library, Heart } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface MobileNavDockProps {
  onOpenImport?: () => void;
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
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      className="w-full bg-[#121215]/95 backdrop-blur-2xl backdrop-saturate-180 border-t border-white/[0.08] px-2 flex items-center justify-around select-none pointer-events-auto shrink-0 z-50 h-[calc(50px+env(safe-area-inset-bottom,0px))]"
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
            className="relative flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all flex-1 cursor-pointer h-[50px] touch-manipulation select-none apple-btn-tactile pointer-events-auto"
            aria-selected={isActive}
            role="tab"
          >
            <div className="relative">
              <Icon
                className={`w-[21px] h-[21px] transition-colors duration-150 ${
                  isActive ? 'text-[#FA2D48]' : 'text-[#8E8E93]'
                }`}
                strokeWidth={1.9}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors duration-150 leading-none ${
                isActive ? 'text-[#FA2D48] font-semibold' : 'text-[#8E8E93] font-medium'
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
