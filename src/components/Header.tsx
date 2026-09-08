import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { FolderOpen, Download, Disc, Clock, Music, Moon, Keyboard, Sliders, Sparkles, Wifi, WifiOff, Settings, Bell, User } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setShortcutsOpen = usePlayerStore((state) => state.setShortcutsOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setWelcomeOpen = usePlayerStore((state) => state.setWelcomeOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const isOnline = usePlayerStore((state) => state.isOnline);
  const addToast = usePlayerStore((state) => state.addToast);
  const activeFilterPill = usePlayerStore((state) => state.activeFilterPill);
  const setActiveFilterPill = usePlayerStore((state) => state.setActiveFilterPill);

  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for PWA installation prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const totalDurationSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);

  const formatTimerRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="py-2 sm:py-3 border-b border-white/5 select-none mb-3 sm:mb-4 w-full min-w-0">
      {/* Mobile Bar: Spotify Caliber Top Bar with Avatar, Pills & Bell */}
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
              Spotify <span className="text-[#1DB954] font-medium text-xs">AURA</span>
            </span>
          </div>

          {/* Quick Icons */}
          <div className="flex items-center gap-1.5">
            {/* Notification Bell */}
            <button
              onClick={() => addToast('لا توجد إشعارات جديدة حالياً', undefined, 'info')}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              title="الإشعارات"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => setSleepTimerOpen(true)}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
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

            {/* Folder Import Button */}
            <button
              onClick={onOpenImport}
              className="px-2.5 py-1 rounded-full bg-[#1DB954] active:bg-[#1ed760] text-black text-xs font-bold flex items-center gap-1 shadow-md shadow-[#1DB954]/25"
              title="استيراد أغانيك"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="text-[10px]">استيراد</span>
            </button>
          </div>
        </div>

        {/* Filtering Pills: All, Music, Podcasts */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilterPill('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeFilterPill === 'all'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setActiveFilterPill('music')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
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
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeFilterPill === 'podcasts'
                ? 'bg-[#1DB954] text-black shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            البودكاست
          </button>
        </div>
      </div>

      {/* Desktop / Tablet Bar: Full stats & actions */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FA243C] to-[#FF5E7E] p-[1.5px] flex-shrink-0">
            <div className="w-full h-full bg-[#09090b] rounded-[10px] flex items-center justify-center">
              <Disc className="w-4 h-4 text-[#FA243C] animate-spin-slow" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white truncate">
                <span>مكتبتي الصوتية</span>
              </h2>
              <button
                onClick={onOpenImport}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95 cursor-pointer truncate"
                title="مجلد الأغاني المحفوظ - انقر للتحديث أو التغيير"
              >
                <FolderOpen className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{savedFolderName || 'Liked_Songs'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Music className="w-3 h-3 text-[#FA243C]" />
                <span>{tracks.length} مسار</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#FF2D55]" />
                <span>
                  {totalHours > 0 ? `${totalHours} س و ` : ''}
                  {totalMins} د
                </span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>محفوظ محلياً</span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Header Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setWelcomeOpen(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-amber-400 hover:text-amber-300 transition-colors"
            title="شاشة الترحيب السينمائية"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              sleepTimerRemaining !== null
                ? 'bg-[#FA243C] border-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-300'
            }`}
            title="مؤقت النوم الذكي"
          >
            <Moon className="w-4 h-4 text-[#FF456E]" />
            {sleepTimerRemaining !== null ? (
              <span className="font-mono text-xs text-white">{formatTimerRemaining(sleepTimerRemaining)}</span>
            ) : (
              <span>مؤقت النوم</span>
            )}
          </button>

          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#FF2D55] hover:text-[#FA243C] transition-colors"
            title="المعادل الصوتي و AutoMix"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white transition-colors"
            title="إدارة التخزين والمكتبة المحلية"
          >
            <Settings className="w-4 h-4 text-[#FA243C]" />
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white transition-colors hidden md:flex"
            title="اختصارات الكيبورد (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-all animate-pulse"
            >
              <Download className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>تثبيت</span>
            </button>
          )}

          <button
            onClick={onOpenImport}
            className="px-4 py-2.5 rounded-2xl bg-[#FA243C] hover:bg-[#FF375F] text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#FA243C]/25 active:scale-95 cursor-pointer"
            title="استيراد مجلد أغانٍ"
          >
            <FolderOpen className="w-4 h-4" />
            <span>استيراد أغانيك</span>
          </button>
        </div>
      </div>
    </header>
  );
};
