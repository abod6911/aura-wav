import React, { useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Car,
  Radio,
  UploadCloud,
} from 'lucide-react';
import { syncPartyService, SyncRoomState } from '../services/syncPartyService';
import { useStorageStore } from '../stores/useStorageStore';
import { CloudStatusBadge } from './cloud/CloudStatusBadge';

interface HeaderProps {
  onOpenImport: () => void;
  isScrolled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport, isScrolled = false }) => {
  const { t, language, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const currentUser = usePlayerStore((state) => state.currentUser);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSyncPartyOpen = usePlayerStore((state) => state.setSyncPartyOpen);
  const [syncRoomState, setSyncRoomState] = React.useState<SyncRoomState>(syncPartyService.getState());

  React.useEffect(() => {
    return syncPartyService.subscribe(setSyncRoomState);
  }, []);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const setCarModeOpen = usePlayerStore((state) => state.setCarModeOpen);
  const setSpotlightOpen = usePlayerStore((state) => state.setSpotlightOpen);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);
  const activeTab = usePlayerStore((state) => state.activeTab);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const activeFilterPill = usePlayerStore((state) => state.activeFilterPill);
  const setActiveFilterPill = usePlayerStore((state) => state.setActiveFilterPill);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const addToast = usePlayerStore((state) => state.addToast);
  const isQuotaWarning = useStorageStore((state) => state.isQuotaWarning);
  const usagePercentage = useStorageStore((state) => state.usagePercentage);

  const [hour] = useState(() => new Date().getHours());
  // Time-aware dynamic greeting
  const greeting = useMemo(() => {
    if (hour >= 5 && hour < 12) return t.goodMorning;
    if (hour >= 12 && hour < 17) return t.goodAfternoon;
    if (hour >= 17 && hour < 22) return t.goodEvening;
    return t.peacefulNight;
  }, [t, hour]);

  const totalDurationSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);

  return (
    <header
      className="select-none w-full min-w-0 bg-[#060608]/96 backdrop-blur-2xl border-b border-white/[0.08] px-3 sm:px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2.5 shrink-0 z-30 transition-all specular-highlight-subtle pointer-events-auto"
      dir={dir}
    >
      {/* Mobile Header Bar */}
      <div className="flex flex-col sm:hidden w-full gap-2">
        <div className="flex items-center justify-between w-full min-w-0">
          {/* Brand & Dynamic Greeting */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 min-w-[32px] min-h-[32px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-md shadow-[#FA243C]/25 flex-shrink-0 cursor-pointer aura-tap-btn"
              title={currentUser ? currentUser.name : t.settings}
              aria-label={t.settings}
            >
              <div className="w-full h-full bg-[#101018] rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-white text-xs font-black overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.[0]?.toUpperCase() || 'A'
                )}
              </div>
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-black text-white text-[15px] sm:text-base tracking-tight leading-none flex items-center gap-1.5 truncate">
                <bdi dir="ltr" className="inline-flex items-center">
                  AURA<span className="text-[#FA243C]">.WAV</span>
                </bdi>
                <span className="apple-badge text-[7.5px] sm:text-[8px] bg-[#FA243C]/15 border-[#FA243C]/30 text-[#FA243C] px-1 py-0.5 shrink-0">ALAC</span>
              </span>
              <span className="text-[9.5px] sm:text-[10px] text-zinc-400 font-medium leading-tight mt-0.5 truncate">
                {currentUser ? `مرحباً، ${currentUser.name}` : (activeTab === 'home' ? (isRTL ? 'استوديو Apple Hi-Fi' : 'Apple Hi-Fi Studio') : greeting)}
              </span>
            </div>
          </div>

          {/* Mobile Right Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ps-1">
            {isQuotaWarning && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[9.5px] font-bold animate-pulse cursor-pointer aura-tap-btn shrink-0"
                title={`تحذير الذاكرة: ${usagePercentage}% ممتلئ`}
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>{usagePercentage}%</span>
              </button>
            )}

            {/* Quick Import Button */}
            <button
              onClick={onOpenImport}
              className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 min-w-[30px] sm:min-w-[34px] min-h-[30px] sm:min-h-[34px] rounded-full apple-glass-pill flex items-center justify-center text-white aura-tap-btn cursor-pointer shrink-0"
              title={t.importFolder}
              aria-label={t.importFolder}
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#FA243C]" />
            </button>

            {/* Cloud Uploader Button */}
            <button
              onClick={() => setCloudUploaderOpen(true)}
              className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 min-w-[30px] sm:min-w-[34px] min-h-[30px] sm:min-h-[34px] rounded-full apple-glass-pill flex items-center justify-center text-sky-400 aura-tap-btn cursor-pointer shrink-0"
              title="رفع للسحابة"
              aria-label="Cloud Uploader"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {/* Sync Party */}
            <button
              onClick={() => setSyncPartyOpen(true)}
              className={`w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 min-w-[30px] sm:min-w-[34px] min-h-[30px] sm:min-h-[34px] rounded-full text-xs font-bold flex items-center justify-center aura-tap-btn cursor-pointer relative shrink-0 ${
                syncRoomState.roomId
                  ? 'bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/40 animate-pulse'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title={syncRoomState.roomId ? `${t.syncParty}: ${syncRoomState.roomId}` : t.syncParty}
              aria-label={t.syncParty}
            >
              <Radio className="w-3.5 h-3.5" />
              {syncRoomState.roomId && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-0.5 right-0.5 border border-black" />
              )}
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => setSleepTimerOpen(true)}
              className={`w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 min-w-[30px] sm:min-w-[34px] min-h-[30px] sm:min-h-[34px] rounded-full text-xs font-bold flex items-center justify-center aura-tap-btn cursor-pointer relative shrink-0 ${
                sleepTimerRemaining !== null
                  ? 'bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title={t.sleepTimer}
              aria-label={t.sleepTimer}
            >
              <Moon className="w-3.5 h-3.5" />
              {sleepTimerRemaining !== null && (
                <span className="font-mono text-[7px] absolute -bottom-1 bg-[#FA243C] px-1 rounded-full font-bold">{formatTimerRemaining(sleepTimerRemaining)}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Filter Pills - only on Home feed */}
        {activeTab === 'home' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              onClick={() => setActiveFilterPill('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold apple-spring cursor-pointer shrink-0 ${
                activeFilterPill === 'all'
                  ? 'bg-white text-black shadow-md'
                  : 'apple-glass-pill text-zinc-300'
              }`}
            >
              {t.all}
            </button>
            <button
              onClick={() => setActiveFilterPill('music')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold apple-spring cursor-pointer shrink-0 ${
                activeFilterPill === 'music'
                  ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                  : 'apple-glass-pill text-zinc-300'
              }`}
            >
              {t.music}
            </button>
            <button
              onClick={() => {
                setActiveFilterPill('podcasts');
                addToast(isRTL ? 'قسم البودكاست قيد التطوير' : 'Podcasts section coming soon', undefined, 'info');
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold apple-spring cursor-pointer shrink-0 ${
                activeFilterPill === 'podcasts'
                  ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                  : 'apple-glass-pill text-zinc-300'
              }`}
            >
              {t.podcasts}
            </button>
          </div>
        )}
      </div>

      {/* Desktop Header Bar */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        {/* Left: History Navigation & Saved Folder */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              onClick={() => setActiveTab('home')}
              className="w-8 h-8 rounded-full apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
              title={t.listenNow}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="w-8 h-8 rounded-full apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
              title={t.search}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Unified Library Status Pill */}
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl apple-glass-pill hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium apple-spring cursor-pointer border border-white/10 shadow-sm"
              title={`${t.importFolder} - انقر لتغيير أو استيراد مجلد الموسيقى`}
            >
              <FolderOpen className="w-4 h-4 text-[#FA243C]" />
              <span className="font-bold text-white">{savedFolderName || 'Liked_Songs'}</span>
              <span className="text-white/30">•</span>
              <span className="text-zinc-300 font-mono text-[11px]">{tracks.length} {t.songs}</span>
              <span className="text-white/30">•</span>
              <span className="text-[#FF375F] font-bold text-[11px]">{t.importFolder}</span>
            </button>
            <span className="hidden lg:inline-flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="font-mono">{totalHours > 0 ? `${totalHours}h ` : ''}{totalMins}m</span>
              <span>•</span>
              <span className="apple-badge bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
                <ShieldCheck className="w-2.5 h-2.5" />
                LOSSLESS ALAC
              </span>
            </span>
          </div>
        </div>

        {/* Right: Desktop Actions (Uniform w-10 h-10 rounded-2xl Controls) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Cupertino Search Pill (Spotlight Command Palette) */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="flex items-center gap-3 px-3.5 py-2 rounded-2xl apple-glass-pill text-white/70 hover:text-white text-xs font-medium apple-spring cursor-pointer group border border-white/10"
            title={t.quickSearch}
            aria-label="Spotlight search"
          >
            <Search className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
            <span>{t.quickSearch}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/60 font-mono">⌘K</kbd>
          </button>

          {/* Storage Quota Warning Badge */}
          {isQuotaWarning && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all animate-pulse cursor-pointer shadow-md"
              title={`تحذير الذاكرة: تم استهلاك ${usagePercentage}% من المساحة التخزينية`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>مساحة التخزين {usagePercentage}%</span>
            </button>
          )}

          {/* Sleep Timer */}
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center apple-spring cursor-pointer relative ${
              sleepTimerRemaining !== null
                ? 'bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/30'
                : 'apple-glass-pill text-zinc-300 hover:text-white'
            }`}
            title={sleepTimerRemaining !== null ? `مؤقت النوم: ${formatTimerRemaining(sleepTimerRemaining)}` : t.sleepTimer}
          >
            <Moon className="w-4 h-4" />
            {sleepTimerRemaining !== null && (
              <span className="font-mono text-[8px] absolute -bottom-1 bg-[#FA243C] px-1 rounded-full font-bold">{formatTimerRemaining(sleepTimerRemaining)}</span>
            )}
          </button>

          {/* Sync Party Trigger */}
          <button
            onClick={() => setSyncPartyOpen(true)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center apple-spring cursor-pointer relative ${
              syncRoomState.roomId
                ? 'bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/40 animate-pulse'
                : 'apple-glass-pill text-zinc-300 hover:text-white'
            }`}
            title={syncRoomState.roomId ? `${t.syncParty}: ${syncRoomState.roomId}` : t.syncParty}
            aria-label={t.syncParty}
          >
            <Radio className="w-4 h-4" />
            {syncRoomState.roomId && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-1.5 border border-black" />
            )}
          </button>

          {/* Equalizer */}
          <button
            onClick={() => setEqualizerOpen(true)}
            className="w-10 h-10 rounded-2xl apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
            title={t.equalizer}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* CarPlay / Car Mode Trigger */}
          <button
            onClick={() => setCarModeOpen(true)}
            className="w-10 h-10 rounded-2xl apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
            title="وضع القيادة في السيارة / Apple CarPlay Mode"
          >
            <Car className="w-4 h-4 text-[#FA243C]" />
          </button>

          {/* Cloud Sync Status Badge */}
          <CloudStatusBadge />

          {/* Cloud Uploader Trigger */}
          <button
            onClick={() => setCloudUploaderOpen(true)}
            className="w-10 h-10 rounded-2xl apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
            title="رفع ملفات موسيقية إلى السحابة (Cloud Uploader)"
            aria-label="Cloud Uploader"
          >
            <UploadCloud className="w-4 h-4 text-sky-400" />
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 rounded-2xl apple-glass-pill text-zinc-300 hover:text-white flex items-center justify-center apple-spring cursor-pointer"
            title={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile Avatar Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-md shadow-[#FA243C]/25 flex-shrink-0 cursor-pointer apple-spring"
            title={currentUser ? currentUser.name : t.profile}
          >
            <div className="w-full h-full bg-[#101018] rounded-[14px] flex items-center justify-center text-white text-xs font-black overflow-hidden">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.[0]?.toUpperCase() || 'A'
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
