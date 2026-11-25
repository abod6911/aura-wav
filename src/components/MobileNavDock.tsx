import React, { useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Home, Search, Library, Heart } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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
      className="fixed bottom-0 inset-x-0 w-full bg-[#101014]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 flex items-center justify-around select-none pointer-events-auto shrink-0 z-40 h-[calc(54px+env(safe-area-inset-bottom,0px))] after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-12 after:bg-[#101014] after:pointer-events-none"
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
            className="relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 transition-colors flex-1 cursor-pointer h-[54px] touch-manipulation select-none pointer-events-auto active:scale-95"
            aria-selected={isActive}
            role="tab"
          >
            <div className="relative">
              <Icon
                className={`w-[21px] h-[21px] transition-colors duration-150 ${
                  isActive ? 'text-[#1DB954]' : 'text-[#A1A1AA]'
                }`}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
            </div>
            <span
              className={`text-[10.5px] tracking-tight transition-colors duration-150 leading-none ${
                isActive ? 'text-[#1DB954] font-bold' : 'text-[#A1A1AA] font-medium'
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
