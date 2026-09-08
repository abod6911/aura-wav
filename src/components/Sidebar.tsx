import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Music,
  Sliders,
  FolderPlus,
  WifiOff,
  Sparkles,
  HardDrive,
  ListMusic
} from 'lucide-react';

interface SidebarProps {
  onOpenImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenImport }) => {
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const tracks = usePlayerStore((state) => state.tracks);
  const favorites = usePlayerStore((state) => state.favorites);
  const playlists = usePlayerStore((state) => state.playlists);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  return (
    <aside className="hidden lg:flex w-72 flex-col justify-between p-3 gap-2 bg-[#121212] z-30 select-none h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
      <div className="space-y-2">
        {/* Top Navigation Block (Home & Search) */}
        <div className="bg-[#181818] rounded-xl p-4 space-y-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
              <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.308a.747.747 0 0 1-1.028.248c-2.816-1.722-6.36-2.112-10.536-1.157a.75.75 0 1 1-.336-1.462c4.568-1.044 8.496-.595 11.652 1.343a.75.75 0 0 1 .248 1.028zm1.47-3.267a.936.936 0 0 1-1.287.308c-3.224-1.982-8.138-2.555-11.95-1.398a.937.937 0 1 1-.546-1.791c4.356-1.322 9.774-.682 13.475 1.594a.936.936 0 0 1 .308 1.287zm.126-3.41c-3.864-2.294-10.245-2.507-13.927-1.389a1.124 1.124 0 1 1-.655-2.152c4.234-1.286 11.284-1.037 15.727 1.601a1.124 1.124 0 1 1-1.145 1.94z"/>
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-white">
              Spotify <span className="text-[#1DB954] font-medium text-xs">AURA</span>
            </span>
          </div>

          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-4 px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-white bg-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#1DB954]' : ''}`} />
            <span>الرئيسية</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('search');
              setTimeout(() => document.getElementById('library-search-input')?.focus(), 50);
            }}
            className={`w-full flex items-center gap-4 px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'text-white bg-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className={`w-5 h-5 ${activeTab === 'search' ? 'text-[#1DB954]' : ''}`} />
            <span>بحث</span>
          </button>
        </div>

        {/* Library Card */}
        <div className="bg-[#181818] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-zinc-400">
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-3 text-sm font-bold hover:text-white transition-colors cursor-pointer"
            >
              <Library className={`w-5 h-5 ${activeTab === 'library' ? 'text-[#1DB954]' : ''}`} />
              <span>مكتبتك الموسيقية</span>
            </button>
            <button
              onClick={onOpenImport}
              title="إضافة مسارات أو مجلد جديد"
              className="p-1 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Pinned Liked Songs Tile (Spotify Iconic Purple Gradient) */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'favorites' ? 'bg-[#282828]' : 'hover:bg-[#202020]'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow-md">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <div className="min-w-0 text-right flex-1">
              <h4 className="text-sm font-bold text-white truncate">الأغاني المعجب بها</h4>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                مقطع صوتي • {favorites.length}
              </p>
            </div>
          </button>

          {/* All Songs Link */}
          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'library' ? 'bg-[#282828]' : 'hover:bg-[#202020]'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center flex-shrink-0 border border-white/5">
              <Music className="w-5 h-5 text-[#1DB954]" />
            </div>
            <div className="min-w-0 text-right flex-1">
              <h4 className="text-sm font-bold text-white truncate">جميع المقاطع الصوتية</h4>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {tracks.length} أغنية
              </p>
            </div>
          </button>

          {/* Playlists View Link */}
          <button
            onClick={() => setActiveTab('playlists')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'playlists' ? 'bg-[#282828]' : 'hover:bg-[#202020]'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center flex-shrink-0 border border-white/5">
              <ListMusic className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0 text-right flex-1">
              <h4 className="text-sm font-bold text-white truncate">قوائم التشغيل</h4>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {playlists.length} قائمة
              </p>
            </div>
          </button>
        </div>

        {/* Quick Audio Tools */}
        <div className="bg-[#181818] rounded-xl p-3 space-y-1">
          <button
            onClick={() => setEqualizerOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#1DB954]" />
              <span>المعادل الصوتي & AutoMix</span>
            </div>
            {automixEnabled && (
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-zinc-400" />
              <span>إدارة التخزين والمكتبة</span>
            </div>
          </button>
        </div>
      </div>

      {/* Persistent Folder Status Footer */}
      <div className="bg-[#181818] rounded-xl p-3 space-y-2 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
            <FolderPlus className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>المجلد المتصل</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>متصل</span>
          </span>
        </div>
        <p className="text-xs font-bold text-white truncate" dir="auto">
          {savedFolderName || 'Liked_Songs'}
        </p>
        <button
          onClick={onOpenImport}
          className="w-full py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>تغيير المجلد</span>
        </button>
      </div>
    </aside>
  );
};
