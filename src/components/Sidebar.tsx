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
      className="hidden lg:flex w-72 flex-col justify-between p-3.5 gap-3.5 bg-[#08080c]/85 backdrop-blur-3xl border-r border-white/[0.08] z-30 select-none h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-none"
      dir={dir}
    >
      <div className="space-y-3.5">
        {/* Brand Block: Apple Music Squircle Header */}
        <div className="bg-white/[0.04] border border-white/[0.1] rounded-[22px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] flex items-center justify-center shadow-lg shadow-[#FA243C]/35">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white leading-tight flex items-center gap-1.5">
                AURA<span className="text-[#FA243C]">.WAV</span>
                <span className="apple-badge text-[8px] bg-[#FA243C]/20 border-[#FA243C]/30 text-[#FA243C]">PRO</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium leading-none mt-0.5">
                {t.brandSub}
              </span>
            </div>
          </div>

          {/* Section: Apple Music Navigation */}
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3 py-1">
              Apple Music
            </div>
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold apple-spring cursor-pointer ${
                activeTab === 'home'
                  ? 'text-white bg-gradient-to-r from-[#FA243C] to-[#FF375F] shadow-[0_4px_16px_rgba(250,36,60,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Radio className="w-4 h-4 flex-shrink-0" />
              <span>{t.listenNow}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                setTimeout(() => document.getElementById('library-search-input')?.focus(), 50);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold apple-spring cursor-pointer ${
                activeTab === 'search'
                  ? 'text-white bg-gradient-to-r from-[#FA243C] to-[#FF375F] shadow-[0_4px_16px_rgba(250,36,60,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span>{t.search}</span>
            </button>
          </div>
        </div>

        {/* Section: Library */}
        <div className="bg-white/[0.04] border border-white/[0.1] rounded-[22px] p-3.5 space-y-2 backdrop-blur-2xl">
          <div className="flex items-center justify-between px-2 py-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
              {t.library}
            </span>
            <button
              onClick={onOpenImport}
              title={t.importFolder}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FA243C]" />
            </button>
          </div>

          {/* Liked Songs Tile */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl apple-spring cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-white/[0.12] border border-white/15'
                : 'hover:bg-white/[0.05]'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FA243C] to-[#FF375F] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#FA243C]/25">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <div className="min-w-0 text-start flex-1">
              <h4 className="text-xs font-bold text-white truncate">{t.favorites}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
                {favorites.length} {t.songs}
              </p>
            </div>
          </button>

          {/* All Songs Link */}
          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl apple-spring cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white/[0.12] border border-white/15'
                : 'hover:bg-white/[0.05]'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center flex-shrink-0 border border-white/10">
              <Music className="w-4 h-4 text-[#FA243C]" />
            </div>
            <div className="min-w-0 text-start flex-1">
              <h4 className="text-xs font-bold text-white truncate">{t.library}</h4>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
                {tracks.length} {t.songs}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Footer Actions: Apple Hi-Fi Studio & Settings */}
      <div className="bg-white/[0.04] border border-white/[0.1] rounded-[22px] p-3.5 space-y-2.5 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
          <span>Apple Audio Engine</span>
          <span className="apple-badge text-[8px] bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
            Hi-Res
          </span>
        </div>

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

        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400 font-mono px-1">
          <span className="truncate max-w-[130px] font-sans font-medium text-zinc-300">{savedFolderName || 'Liked_Songs'}</span>
          <span className="text-emerald-400 font-bold">{t.offlineReady}</span>
        </div>
      </div>
    </aside>
  );
};
