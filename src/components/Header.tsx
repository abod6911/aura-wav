import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { formatTimerRemaining } from '../utils/formatters';
import {
  FolderPlus,
  Moon,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Car,
  Radio,
  UploadCloud,
  X,
} from 'lucide-react';
import { syncPartyService, SyncRoomState } from '../services/syncPartyService';
import { useStorageStore } from '../stores/useStorageStore';

interface HeaderProps {
  onOpenImport: () => void;
  isScrolled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport, isScrolled = false }) => {
  const { t, isRTL, dir } = useTranslation();
  const currentUser = usePlayerStore((state) => state.currentUser);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setSyncPartyOpen = usePlayerStore((state) => state.setSyncPartyOpen);
  const [syncRoomState, setSyncRoomState] = useState<SyncRoomState>(syncPartyService.getState());

  useEffect(() => {
    return syncPartyService.subscribe(setSyncRoomState);
  }, []);

  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const setCarModeOpen = usePlayerStore((state) => state.setCarModeOpen);
  const setSpotlightOpen = usePlayerStore((state) => state.setSpotlightOpen);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const isQuotaWarning = useStorageStore((state) => state.isQuotaWarning);
  const usagePercentage = useStorageStore((state) => state.usagePercentage);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  return (
    <header
      style={{
        backgroundColor: '#09090B',
      }}
      className="select-none w-full min-w-0 border-b border-white/[0.04] px-4 sm:px-8 py-3 shrink-0 z-30 transition-all pointer-events-auto"
      dir={dir}
    >
      {/* ── Mobile Header Bar (Preserved for Mobile) ── */}
      <div className="flex items-center justify-between sm:hidden w-full min-w-0">
        {/* Brand & User Profile */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-[#161622] border border-white/[0.12] p-0.5 shadow-sm flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            title={currentUser ? currentUser.name : t.settings}
            aria-label={t.settings}
          >
            <div className="w-full h-full bg-[#101018] rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover shrink-0 aspect-square" />
              ) : (
                currentUser?.name?.[0]?.toUpperCase() || 'A'
              )}
            </div>
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-extrabold text-white text-[15px] tracking-tight leading-none flex items-center gap-1.5">
              <bdi dir="ltr" className="inline-flex items-center">
                AURA<span className="text-[#FA2D48]">.WAV</span>
              </bdi>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5 truncate">
              {currentUser ? currentUser.name : (isRTL ? 'ضيف' : 'Guest')}
            </span>
          </div>
        </div>

        {/* Mobile Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ps-1">
          {isQuotaWarning && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold animate-pulse cursor-pointer shrink-0"
              title={`تحذير الذاكرة: ${usagePercentage}% ممتلئ`}
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>{usagePercentage}%</span>
            </button>
          )}

          {/* Quick Import Button */}
          <button
            onClick={onOpenImport}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white cursor-pointer shrink-0 transition-colors"
            title={t.importFolder}
            aria-label={t.importFolder}
          >
            <FolderPlus className="w-4 h-4 text-[#FA2D48]" />
          </button>

          {/* Sleep Timer (if active) */}
          {sleepTimerRemaining !== null && (
            <button
              onClick={() => setSleepTimerOpen(true)}
              className="h-9 px-2.5 rounded-full bg-[#FA2D48]/20 border border-[#FA2D48]/40 text-[#FA2D48] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
              title={t.sleepTimer}
              aria-label={t.sleepTimer}
            >
              <Moon className="w-3 h-3" />
              <span className="text-[9.5px]">{formatTimerRemaining(sleepTimerRemaining)}</span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer shrink-0 transition-colors"
            title={t.settings}
            aria-label={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Desktop Header Bar (Ultra-Clean 3-Zone Architecture) ── */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        {/* Zone 1 (Right in RTL): Subtle Back / Forward Navigation Buttons */}
        <div className="flex items-center gap-1.5" dir="ltr">
          <button
            onClick={() => setActiveTab('home')}
            className="w-8 h-8 rounded-full bg-[#18181C] hover:bg-[#202026] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.04]"
            title={t.listenNow}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className="w-8 h-8 rounded-full bg-[#18181C] hover:bg-[#202026] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.04]"
            title={t.search}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 2 (Center / Right): Single Elegant Search Bar */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={() => setSpotlightOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#18181C] hover:bg-[#202026] text-zinc-400 hover:text-zinc-200 text-xs font-normal border border-white/[0.05] transition-colors cursor-pointer group shadow-sm"
            title={t.quickSearch}
            aria-label="Spotlight search"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              <span className="text-zinc-400 group-hover:text-zinc-200">{t.quickSearch}</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-zinc-500 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Zone 3 (Left in RTL): Profile Avatar with Refined Secondary Dropdown */}
        <div className="relative flex items-center" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-8 h-8 rounded-full bg-[#18181C] border border-white/[0.08] hover:border-white/20 flex items-center justify-center text-xs font-bold text-white transition-all cursor-pointer overflow-hidden shadow-sm"
            title={currentUser ? currentUser.name : t.profile}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser?.name?.[0]?.toUpperCase() || 'A'
            )}
          </button>

          {/* Clean secondary dropdown menu */}
          {isProfileMenuOpen && (
            <div
              className="absolute top-10 start-0 min-w-[210px] bg-[#16161A] border border-white/[0.08] rounded-xl p-1.5 shadow-2xl backdrop-blur-2xl z-50 text-xs text-zinc-300 animate-fadeIn"
            >
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <span className="font-semibold text-white block truncate">{currentUser?.name || 'مستخدم AuraWave'}</span>
                <span className="text-[10px] text-zinc-500 block truncate">{currentUser?.email || 'جلسة محلية'}</span>
              </div>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setSettingsOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-start transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.settings}</span>
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setCloudUploaderOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-start transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />
                <span>رفع ملفات للسحابة</span>
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setCarModeOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-start transition-colors cursor-pointer"
              >
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                <span>وضع قيادة السيارة (CarPlay)</span>
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setSleepTimerOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-start transition-colors cursor-pointer"
              >
                <Moon className="w-3.5 h-3.5 text-zinc-400" />
                <span>مؤقت النوم</span>
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); setSyncPartyOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-start transition-colors cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.syncParty}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
