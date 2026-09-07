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
  HardDrive,
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
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const cleanAndRepairLibrary = usePlayerStore((state) => state.cleanAndRepairLibrary);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  return (
    <aside className="hidden lg:flex w-72 flex-col justify-between p-5 border-l border-white/[0.08] bg-[#0a0a10]/85 backdrop-blur-3xl z-30 select-none h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
      {/* Brand & Logo */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] via-[#FF2D55] to-[#FF5E7E] p-[1.5px] shadow-lg shadow-[#FA243C]/25">
            <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
              <Disc className="w-5 h-5 text-[#FA243C] animate-spin-slow" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">
              AURA<span className="text-[#FA243C]">.WAV</span>
            </h1>
            <p className="text-[10px] text-aura-muted font-mono tracking-widest uppercase">
              Apple Music Edition
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
                : 'text-aura-textSecondary hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 fill-current" />
              <span>المفضلة</span>
            </div>
            <span className="text-xs opacity-75 font-mono">{favorites.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
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
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-aura-textSecondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-[#FF375F]" />
              <span>المعادل & AutoMix</span>
            </div>
            {automixEnabled && (
              <span className="w-2 h-2 rounded-full bg-[#FA243C] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-aura-textSecondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-[#FA243C]" />
              <span>إدارة التخزين والمكتبة</span>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-3">
        {/* Active Persistent Folder Luxury Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FA243C]/15 via-white/[0.03] to-white/[0.01] border border-[#FA243C]/25 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#FF456E] flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>المجلد المحفوظ</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>محفوظ</span>
            </span>
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-black text-white truncate" dir="auto">
              {savedFolderName || 'Liked_Songs'}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium">
              {tracks.length} مسار مخزن ومحفوظ أوفلاين
            </p>
          </div>

          <button
            onClick={onOpenImport}
            className="w-full py-2 px-3 rounded-xl bg-[#FA243C]/20 hover:bg-[#FA243C]/35 border border-[#FA243C]/35 hover:border-[#FA243C]/60 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#FF456E]" />
            <span>تغيير أو تحديث المجلد</span>
          </button>
        </div>

        {/* Repair & Clean Library */}
        <button
          onClick={cleanAndRepairLibrary}
          title="فحص وتنظيف المكتبة ودمج المسارات المكررة"
          className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FA243C]" />
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
