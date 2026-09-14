import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Radio,
  Search,
  Library,
  Heart,
  Plus,
  Music,
  Sliders,
  FolderPlus,
  SlidersHorizontal,
  FolderOpen,
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
  const playlists = usePlayerStore((state) => state.playlists);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  return (
    <aside
      className="hidden lg:flex w-72 flex-col justify-between p-3.5 gap-3 bg-[#0a0a10]/80 backdrop-blur-3xl border-r border-white/[0.08] z-30 select-none h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-none"
      dir={dir}
    >
      <div className="space-y-3">
        {/* Top Navigation Block: Apple Music Glass Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 space-y-2.5 backdrop-blur-xl">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] flex items-center justify-center shadow-lg shadow-[#FA243C]/25">
              <Radio className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white leading-none">
                AURA<span className="text-[#FA243C]">.WAV</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium leading-none mt-1">
                {t.brandSub}
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-white bg-gradient-to-r from-[#FA243C]/25 to-[#FF375F]/15 border border-[#FA243C]/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Radio className={`w-4.5 h-4.5 ${activeTab === 'home' ? 'text-[#FA243C]' : ''}`} />
            <span>{t.listenNow}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('search');
              setTimeout(() => document.getElementById('library-search-input')?.focus(), 50);
            }}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'text-white bg-gradient-to-r from-[#FA243C]/25 to-[#FF375F]/15 border border-[#FA243C]/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Search className={`w-4.5 h-4.5 ${activeTab === 'search' ? 'text-[#FA243C]' : ''}`} />
            <span>{t.search}</span>
          </button>
        </div>

        {/* Library Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2 backdrop-blur-xl">
          <div className="flex items-center justify-between px-2 py-1 text-zinc-400">
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              <Library className={`w-4 h-4 ${activeTab === 'library' ? 'text-[#FA243C]' : ''}`} />
              <span>{t.library}</span>
            </button>
            <button
              onClick={onOpenImport}
              title={t.importFolder}
              className="p-1 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FA243C]" />
            </button>
          </div>

          {/* Liked Songs Tile */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-white/[0.1] border border-white/10'
                : 'hover:bg-white/[0.05]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FA243C] to-[#FF375F] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#FA243C]/20">
              <Heart className="w-4.5 h-4.5 fill-white text-white" />
            </div>
            <div className="min-w-0 text-start flex-1">
              <h4 className="text-xs font-bold text-white truncate">{t.favorites}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {favorites.length} {t.songs}
              </p>
            </div>
          </button>

          {/* All Songs Link */}
          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white/[0.1] border border-white/10'
                : 'hover:bg-white/[0.05]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 border border-white/10">
              <Music className="w-4.5 h-4.5 text-[#FA243C]" />
            </div>
            <div className="min-w-0 text-start flex-1">
              <h4 className="text-xs font-bold text-white truncate">{t.library}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {tracks.length} {t.songs}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2 backdrop-blur-xl">
        <button
          onClick={() => setEqualizerOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-[#FA243C]" />
          <span>{t.equalizer}</span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
          <span>{t.settings}</span>
        </button>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500 font-mono px-1">
          <span className="truncate max-w-[120px]">{savedFolderName || 'Liked_Songs'}</span>
          <span className="text-emerald-400">{t.offlineReady}</span>
        </div>
      </div>
    </aside>
  );
};
