import React, { useEffect, useState, useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTimerRemaining } from '../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  FolderOpen,
  Moon,
  Sliders,
  Settings,
  Bell,
  Search,
  User,
} from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const activeFilterPill = usePlayerStore((state) => state.activeFilterPill);
  const setActiveFilterPill = usePlayerStore((state) => state.setActiveFilterPill);
  const addToast = usePlayerStore((state) => state.addToast);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  // Dynamic Arabic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'صباح الخير';
    if (hour >= 12 && hour < 18) return 'مساء الخير';
    return 'ليلة سعيدة وموسيقى هادئة';
  }, []);

  const totalDurationSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);



  return (
    <header className="py-2 sm:py-3 border-b border-white/5 select-none mb-3 sm:mb-4 w-full min-w-0">
      {/* Mobile Top Bar */}
      <div className="flex flex-col sm:hidden w-full gap-2.5">
        <div className="flex items-center justify-between w-full">
          {/* Profile Avatar & Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1DB954] to-[#1ed760] p-[1.5px] shadow-md flex-shrink-0"
              title="الملف الشخصي والإعدادات"
            >
              <div className="w-full h-full bg-[#181818] rounded-full flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
            </button>
            <span className="font-black text-white text-base tracking-tight">
              AURA<span className="text-[#1DB954]">.WAV</span>
            </span>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Import Button */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
              title="استيراد مجلد أو ملفات"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#1DB954]" />
              <span className="text-[11px]">استيراد</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => addToast('لا توجد إشعارات جديدة حالياً', undefined, 'info')}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="الإشعارات"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => setSleepTimerOpen(true)}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                sleepTimerRemaining !== null
                  ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
              title="مؤقت النوم الذكي"
            >
              <Moon className="w-4 h-4" />
              {sleepTimerRemaining !== null && (
                <span className="font-mono text-[10px]">{formatTimerRemaining(sleepTimerRemaining)}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilterPill('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'all'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setActiveFilterPill('music')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'music'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            الموسيقى
          </button>
          <button
            onClick={() => {
              setActiveFilterPill('podcasts');
              addToast('قسم البودكاست قيد التحديث', undefined, 'info');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'podcasts'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            البودكاست
          </button>
        </div>
      </div>

      {/* Desktop Top Bar: Clean Spotify Aesthetic */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        {/* Left: Navigation Arrows & Library Folder Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              onClick={() => setActiveTab('home')}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="رجوع للرئيسية"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="الانتقال للبحث"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title="مجلد الموسيقى المحفوظ - انقر للتحديث أو إضافة مجلد جديد"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#1DB954]" />
              <span className="font-bold text-white">{savedFolderName || 'Liked_Songs'}</span>
              <span className="text-zinc-500 font-mono text-[11px]">({tracks.length} أغنية)</span>
            </button>
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <span>{totalHours > 0 ? `${totalHours} س و ` : ''}{totalMins} د</span>
              <span>•</span>
              <span className="text-[#1DB954] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                أوفلاين 100%
              </span>
            </span>
          </div>
        </div>

        {/* Right: Sleek Action Buttons (NO bright red buttons!) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Subtle Search Trigger */}
          {activeTab !== 'search' && (
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title="البحث في كل الموسيقى"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>بحث سريع</span>
            </button>
          )}

          {/* Import Folder Action (Clean Spotify Green Accent) */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#1DB954]/20 cursor-pointer"
            title="استيراد مجلد أو ملفات أغانٍ جديدة"
          >
            <FolderPlus className="w-4 h-4 fill-black text-black" />
            <span>استيراد مجلد</span>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              sleepTimerRemaining !== null
                ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-md shadow-[#1DB954]/30'
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-white'
            }`}
            title="مؤقت النوم الذكي"
          >
            <Moon className="w-3.5 h-3.5" />
            {sleepTimerRemaining !== null ? (
              <span className="font-mono text-xs">{formatTimerRemaining(sleepTimerRemaining)}</span>
            ) : (
              <span className="hidden md:inline">مؤقت النوم</span>
            )}
          </button>

          {/* Equalizer */}
          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="المعادل الصوتي"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Settings / Storage */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="إدارة التخزين والمكتبة"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile Avatar */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1DB954] to-[#1ed760] p-[1.5px] shadow-md flex-shrink-0 cursor-pointer"
            title="الملف الشخصي"
          >
            <div className="w-full h-full bg-[#181818] rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
