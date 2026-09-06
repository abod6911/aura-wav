import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { FolderOpen, Download, Disc, Clock, Music, Moon, Keyboard, Sliders, Sparkles, Wifi, WifiOff } from 'lucide-react';

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
  const isOnline = usePlayerStore((state) => state.isOnline);

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
    <header className="flex items-center justify-between py-3 border-b border-white/5 select-none mb-4 w-full min-w-0">
      {/* Mobile Brand / Desktop Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 p-[1.5px] flex-shrink-0">
          <div className="w-full h-full bg-[#09090b] rounded-[10px] flex items-center justify-center">
            <Disc className="w-4 h-4 text-indigo-400 animate-spin-slow" />
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-black text-white truncate">
            <span>مكتبتي الصوتية</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3 text-indigo-400" />
              <span>{tracks.length} مسار</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              <span>
                {totalHours > 0 ? `${totalHours} س و ` : ''}
                {totalMins} د
              </span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>أوفلاين</span>
            </span>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Replay Welcome Animation */}
        <button
          onClick={() => setWelcomeOpen(true)}
          className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-amber-400 hover:text-amber-300 transition-colors"
          title="شاشة الترحيب السينمائية"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Sleep Timer Button */}
        <button
          onClick={() => setSleepTimerOpen(true)}
          className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
            sleepTimerRemaining !== null
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-300'
          }`}
          title="مؤقت النوم الذكي"
        >
          <Moon className="w-4 h-4 text-indigo-400" />
          {sleepTimerRemaining !== null ? (
            <span className="font-mono text-xs text-indigo-200">{formatTimerRemaining(sleepTimerRemaining)}</span>
          ) : (
            <span className="hidden sm:inline">مؤقت النوم</span>
          )}
        </button>

        {/* Equalizer Quick Access (Desktop Only, mobile has dock tab) */}
        <button
          onClick={() => setEqualizerOpen(true)}
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-purple-400 transition-colors hidden sm:flex"
          title="المعادل الصوتي و AutoMix"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          onClick={() => setShortcutsOpen(true)}
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white transition-colors hidden md:flex"
          title="اختصارات الكيبورد (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* PWA Install Button if available */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-all animate-pulse"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">تثبيت</span>
          </button>
        )}

        {/* Load Local Library Button */}
        <button
          onClick={onOpenImport}
          className="p-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
          title="استيراد مجلد أغانٍ"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">استيراد أغانيك</span>
        </button>
      </div>
    </header>
  );
};
