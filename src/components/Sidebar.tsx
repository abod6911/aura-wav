import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  Music,
  Heart,
  ListMusic,
  Sliders,
  FolderPlus,
  WifiOff,
  Disc,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onOpenImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenImport }) => {
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const tracks = usePlayerStore((state) => state.tracks);
  const favorites = usePlayerStore((state) => state.favorites);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const cleanAndRepairLibrary = usePlayerStore((state) => state.cleanAndRepairLibrary);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between p-6 border-l border-white/5 bg-[#0e0e14]/70 backdrop-blur-2xl z-30 select-none">
      {/* Brand & Logo */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-[1.5px] shadow-lg shadow-indigo-600/20">
            <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
              <Disc className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">
              AURA<span className="text-indigo-400">.WAV</span>
            </h1>
            <p className="text-[10px] text-aura-muted font-mono tracking-widest uppercase">
              Pro Audio Player
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-aura-muted uppercase tracking-wider px-3">
            المكتبة والتصفح
          </span>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-aura-textSecondary hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4" />
              <span>جميع الأغاني</span>
            </div>
            <span className="text-xs opacity-75 font-mono">{tracks.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'favorites'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                : 'text-aura-textSecondary hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4" />
              <span>المفضلة</span>
            </div>
            <span className="text-xs opacity-75 font-mono">{favorites.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'playlists'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-aura-textSecondary hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <ListMusic className="w-4 h-4" />
              <span>قوائم التشغيل</span>
            </div>
          </button>
        </div>

        {/* Audio Tools */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-aura-muted uppercase tracking-wider px-3">
            أدوات الصوت
          </span>

          <button
            onClick={() => setEqualizerOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-aura-textSecondary hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>المعادل & AutoMix</span>
            </div>
            {automixEnabled && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-3">
        {/* Active Persistent Folder Indicator */}
        <div className="p-3 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>المجلد المحفوظ:</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="محفوظ محلياً" />
          </div>
          <p className="text-xs font-bold text-white truncate" dir="auto">
            {savedFolderName || 'Liked_Songs'}
          </p>
          <p className="text-[10px] text-zinc-400">
            {tracks.length} مسار مخزن ومحفوظ أوفلاين
          </p>
        </div>

        {/* Import Folder Action */}
        <button
          onClick={onOpenImport}
          className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <FolderPlus className="w-4 h-4 text-indigo-400" />
          <span>تغيير أو استيراد مجلد</span>
        </button>

        {/* Repair & Clean Library */}
        <button
          onClick={cleanAndRepairLibrary}
          title="فحص وتنظيف المكتبة ودمج المسارات المكررة"
          className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>تنظيف وفحص المكتبة</span>
        </button>

        {/* Offline PWA Badge */}
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-400">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-[11px]">يعمل 100% أوفلاين بدون إنترنت</span>
        </div>
      </div>
    </aside>
  );
};
