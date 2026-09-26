import React, { useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { formatTimerRemaining } from '../utils/formatters';
import {
  FolderPlus,
  FolderOpen,
  Moon,
  Sliders,
  Settings,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useStorageStore } from '../stores/useStorageStore';

interface HeaderProps {
  onOpenImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport }) => {
  const { t, language, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const activeFilterPill = usePlayerStore((state) => state.activeFilterPill);
  const setActiveFilterPill = usePlayerStore((state) => state.setActiveFilterPill);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const addToast = usePlayerStore((state) => state.addToast);
  const isQuotaWarning = useStorageStore((state) => state.isQuotaWarning);
  const usagePercentage = useStorageStore((state) => state.usagePercentage);

  // Time-aware dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t.goodMorning;
    if (hour >= 12 && hour < 17) return t.goodAfternoon;
    if (hour >= 17 && hour < 22) return t.goodEvening;
    return t.peacefulNight;
  }, [t]);

  const totalDurationSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);

  return (
    <header className="py-2.5 sm:py-3.5 border-b border-white/[0.08] select-none mb-3 sm:mb-4 w-full min-w-0" dir={dir}>
      {/* Mobile Header Bar */}
      <div className="flex flex-col sm:hidden w-full gap-2.5">
        <div className="flex items-center justify-between w-full">
          {/* Brand & Dynamic Greeting */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-md shadow-[#FA243C]/20 flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
              title={t.settings}
              aria-label={t.settings}
            >
              <div className="w-full h-full bg-[#121218] rounded-full flex items-center justify-center text-white text-xs font-black">
                A
              </div>
            </button>
            <div className="flex flex-col">
              <span className="font-black text-white text-base tracking-tight leading-none">
                AURA<span className="text-[#FA243C]">.WAV</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                {activeTab === 'home' ? (isRTL ? 'استوديو Hi-Fi' : 'Hi-Fi Studio') : greeting}
              </span>
            </div>
          </div>

          {/* Mobile Right Actions */}
          <div className="flex items-center gap-1.5">
            {isQuotaWarning && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold animate-pulse cursor-pointer"
                title={`تحذير الذاكرة: ${usagePercentage}% ممتلئ`}
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>{usagePercentage}%</span>
              </button>
            )}
            {/* Quick Import Button */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] text-xs font-bold text-white transition-all cursor-pointer active:scale-95"
              title={t.importFolder}
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#FA243C]" />
              <span className="text-[11px]">{t.importMusic}</span>
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => setSleepTimerOpen(true)}
              className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                sleepTimerRemaining !== null
                  ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title={t.sleepTimer}
            >
              <Moon className="w-4 h-4" />
              {sleepTimerRemaining !== null && (
                <span className="font-mono text-[9px] absolute -bottom-1 bg-[#FA243C] px-1 rounded-full">{formatTimerRemaining(sleepTimerRemaining)}</span>
              )}
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              title={t.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setActiveFilterPill('all')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'bg-white/[0.08] text-zinc-300 hover:bg-white/[0.14]'
            }`}
          >
            {t.all}
          </button>
          <button
            onClick={() => setActiveFilterPill('music')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'music'
                ? 'bg-[#FA243C] text-white shadow-sm'
                : 'bg-white/[0.08] text-zinc-300 hover:bg-white/[0.14]'
            }`}
          >
            {t.music}
          </button>
          <button
            onClick={() => {
              setActiveFilterPill('podcasts');
              addToast(isRTL ? 'قسم البودكاست قيد التطوير' : 'Podcasts section coming soon', undefined, 'info');
            }}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilterPill === 'podcasts'
                ? 'bg-[#FA243C] text-white shadow-sm'
                : 'bg-white/[0.08] text-zinc-300 hover:bg-white/[0.14]'
            }`}
          >
            {t.podcasts}
          </button>
        </div>
      </div>

      {/* Desktop Header Bar */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        {/* Left: History Navigation & Saved Folder */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              onClick={() => setActiveTab('home')}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t.listenNow}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t.search}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title={t.importFolder}
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#FA243C]" />
              <span className="font-bold text-white">{savedFolderName || 'Liked_Songs'}</span>
              <span className="text-zinc-500 font-mono text-[11px]">({tracks.length} {t.songs})</span>
            </button>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span>{totalHours > 0 ? `${totalHours}h ` : ''}{totalMins}m</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {t.offlineReady}
              </span>
            </span>
          </div>
        </div>

        {/* Right: Desktop Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick Search */}
          {activeTab !== 'search' && (
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title={t.quickSearch}
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.quickSearch}</span>
            </button>
          )}

          {/* Storage Quota Warning Badge */}
          {isQuotaWarning && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all animate-pulse cursor-pointer shadow-md"
              title={`تحذير الذاكرة: تم استهلاك ${usagePercentage}% من المساحة التخزينية`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>مساحة التخزين {usagePercentage}%</span>
            </button>
          )}

          {/* Import Folder Action */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] hover:brightness-110 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#FA243C]/20 cursor-pointer"
            title={t.importFolder}
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t.importFolder}</span>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              sleepTimerRemaining !== null
                ? 'bg-[#FA243C] border-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08] text-zinc-300 hover:text-white'
            }`}
            title={t.sleepTimer}
          >
            <Moon className="w-3.5 h-3.5" />
            {sleepTimerRemaining !== null ? (
              <span className="font-mono text-xs">{formatTimerRemaining(sleepTimerRemaining)}</span>
            ) : (
              <span className="hidden md:inline">{t.sleepTimer}</span>
            )}
          </button>

          {/* Equalizer */}
          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={t.equalizer}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile Avatar Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-md shadow-[#FA243C]/20 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title={t.profile}
          >
            <div className="w-full h-full bg-[#121218] rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
