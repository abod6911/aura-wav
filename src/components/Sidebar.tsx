import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Radio,
  Search,
  Heart,
  Music,
  Sliders,
  UploadCloud,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  onOpenImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenImport }) => {
  const { t, isRTL, dir } = useTranslation();
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const tracks = usePlayerStore((state) => state.tracks);
  const favorites = usePlayerStore((state) => state.favorites);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);

  return (
    <aside
      className="hidden lg:flex w-64 min-w-[256px] max-w-[256px] h-screen bg-[#111114] border-l rtl:border-l ltr:border-r border-white/[0.06] flex-col justify-between select-none z-30 shrink-0 pb-24"
      dir={dir}
    >
      <div className="flex flex-col min-h-0">
        {/* Brand Block: Clean Minimalist AURA.WAV */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FA2D48] flex items-center justify-center text-white shadow-sm shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white" dir="ltr">
            AURA<span className="text-[#FA2D48]">.WAV</span>
          </span>
        </div>

        {/* Section: Main Navigation */}
        <nav className="px-3 space-y-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              activeTab === 'home'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>{t.listenNow}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('search');
              setTimeout(() => document.getElementById('library-search-input')?.focus(), 50);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <Search className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>{t.search}</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4 shrink-0 text-zinc-400" />
              <span>{t.library}</span>
            </div>
            <span className="tabular-nums text-[11px] text-zinc-500 font-normal">
              {tracks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 shrink-0 text-zinc-400" />
              <span>{t.favorites}</span>
            </div>
            {favorites.length > 0 && (
              <span className="tabular-nums text-[11px] text-zinc-500 font-normal">
                {favorites.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tools Section at Bottom */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={() => setEqualizerOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4 shrink-0 text-zinc-400" />
          <span>المعادل الصوتي (DSP)</span>
        </button>

        <button
          onClick={() => {
            onOpenImport();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 shrink-0 text-zinc-400" />
          <span>استيراد / السحابة</span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
          <span>{t.settings}</span>
        </button>
      </div>
    </aside>
  );
};
