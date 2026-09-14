import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  X,
  HardDrive,
  FolderPlus,
  RefreshCw,
  Trash2,
  Database,
  Sparkles,
  AlertTriangle,
  Languages,
  ShieldCheck,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Flame,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenImport }) => {
  const { t, language, setLanguage, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const storageStats = usePlayerStore((state) => state.storageStats);
  const refreshStorageStats = usePlayerStore((state) => state.refreshStorageStats);
  const clearLocalLibrary = usePlayerStore((state) => state.clearLocalLibrary);
  const rescanLibrary = usePlayerStore((state) => state.rescanLibrary);
  const addToast = usePlayerStore((state) => state.addToast);

  // Audio settings from store
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);
  const reactiveVisualsEnabled = usePlayerStore((state) => state.reactiveVisualsEnabled);
  const setReactiveVisualsEnabled = usePlayerStore((state) => state.setReactiveVisualsEnabled);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingStats(true);
      refreshStorageStats().finally(() => setIsLoadingStats(false));
    }
  }, [isOpen, refreshStorageStats]);

  if (!isOpen) return null;

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearLocalLibrary();
      setShowConfirmClear(false);
      addToast(isRTL ? 'تم تفريغ المكتبة بنجاح' : 'Library cleared successfully', undefined, 'info');
    } finally {
      setIsClearing(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    try {
      await rescanLibrary();
      addToast(isRTL ? 'تم تحديث ملفات المكتبة بنجاح' : 'Library rescanned successfully', undefined, 'success');
    } finally {
      setIsRescanning(false);
    }
  };

  const handleLanguageChange = (newLang: 'ar' | 'en') => {
    if (newLang === language) return;
    setLanguage(newLang);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    addToast(
      newLang === 'ar' ? 'تم تحويل لغة التطبيق إلى العربية' : 'Language switched to English (US)',
      undefined,
      'success'
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        />

        {/* Modal Window: iOS Grouped Preferences Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[90vh] bg-[#0d0d14]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 flex flex-col gap-5 z-10"
          dir={dir}
        >
          {/* Ambient Lighting Accents */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#FA243C]/15 filter blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#1DB954]/15 filter blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-lg shadow-[#FA243C]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0d0d14] rounded-[14px] flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-[#FA243C]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {t.settingsTitle}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Apple Music iOS Experience
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Language & Display Group */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#FA243C]" />
                <span>{t.languageAndDisplay}</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                {language === 'ar' ? 'العربية' : 'English (US)'}
              </span>
            </div>

            {/* Segmented iOS Style Language Switcher */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold mb-2 block">
                {t.languageLabel}
              </label>
              <div className="p-1 rounded-xl bg-black/40 border border-white/[0.08] flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('ar')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'ar'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>العربية</span>
                  {language === 'ar' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>English (US)</span>
                  {language === 'en' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              </div>
            </div>

            {/* Reactive Visuals Toggle */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.ambientGlowLabel}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">{t.ambientGlowSub}</p>
              </div>
              <button
                type="button"
                onClick={() => setReactiveVisualsEnabled(!reactiveVisualsEnabled)}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  reactiveVisualsEnabled ? 'bg-[#FA243C]' : 'bg-white/10'
                }`}
              >
                <motion.div
                  layout
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md ${
                    reactiveVisualsEnabled ? (isRTL ? '-translate-x-5.5' : 'translate-x-5.5') : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Pro Audio & DSP Suite */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1DB954]" />
                <span>{t.proAudioTitle}</span>
              </span>
              <span className="text-[10px] font-mono text-[#1ed760] bg-[#1DB954]/15 px-2 py-0.5 rounded-full border border-[#1DB954]/30">
                DSP 32-bit
              </span>
            </div>

            {/* AutoMix Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t.autoMixTransition}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">{t.autoMixSub}</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoMix(!automixEnabled)}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  automixEnabled ? 'bg-[#1DB954]' : 'bg-white/10'
                }`}
              >
                <motion.div
                  layout
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md ${
                    automixEnabled ? (isRTL ? '-translate-x-5.5' : 'translate-x-5.5') : ''
                  }`}
                />
              </button>
            </div>

            {/* Vocal Isolation Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t.vocalIsolation}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isRTL ? 'تخفيف أو إخفاء الفوكال الغنائي كاريوكي' : 'Attenuate vocals for instant karaoke'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKaraokeMode(!karaokeMode)}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  karaokeMode ? 'bg-purple-600' : 'bg-white/10'
                }`}
              >
                <motion.div
                  layout
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md ${
                    karaokeMode ? (isRTL ? '-translate-x-5.5' : 'translate-x-5.5') : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. Storage Metric & Library Group */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>{t.storageTitle}</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                {storageStats?.engine === 'opfs' ? 'OPFS' : 'IndexedDB'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <h4 className="text-xl font-black text-white tracking-tight">
                  {isLoadingStats ? (
                    <span className="text-sm text-zinc-400 font-normal">...</span>
                  ) : (
                    <span>
                      {tracks.length} {t.songs} •{' '}
                      <span className="text-[#1ed760] font-mono">{storageStats?.formattedSize || '0 MB'}</span>
                    </span>
                  )}
                </h4>
                {storageStats?.usagePercentage !== undefined && storageStats.usagePercentage > 0 && (
                  <span className="text-xs text-zinc-400 font-mono">
                    {storageStats.usagePercentage}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1DB954] to-[#34D399] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(29, 185, 84,0.5)]"
                  style={{ width: `${Math.max(5, storageStats?.usagePercentage || 12)}%` }}
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.offlineReady}</span>
              </span>
              <span className="truncate max-w-[150px] font-mono text-zinc-500">
                {savedFolderName || 'Liked_Songs'}
              </span>
            </div>
          </div>

          {/* 4. Action Buttons */}
          <div className="space-y-2.5">
            {/* Add More Tracks */}
            <button
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#FA243C]/20"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{t.importFolder}</span>
            </button>

            {/* Rescan / Refresh */}
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-purple-400 ${isRescanning ? 'animate-spin' : ''}`} />
              <span>{isRescanning ? (isRTL ? 'جاري الفحص...' : 'Scanning...') : t.rescanLibrary}</span>
            </button>

            {/* Force Reload */}
            <button
              onClick={async () => {
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const reg of registrations) {
                    await reg.unregister();
                  }
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  for (const key of keys) {
                    await caches.delete(key);
                  }
                }
                window.location.href = window.location.origin + '/?t=' + Date.now();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>{isRTL ? 'تحديث التطبيق الفوري (Reload App)' : 'Reload App & Reset Cache'}</span>
            </button>

            {/* Clear Storage */}
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full py-3 px-4 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{t.clearCache}</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2.5 text-red-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p>{t.clearCacheConfirm}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isClearing ? '...' : (isRTL ? 'نعم، تفريغ المكتبة' : 'Yes, purge library')}
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="py-2 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* About Footer */}
          <div className="text-center pt-2 border-t border-white/[0.06]">
            <p className="text-[11px] font-bold text-zinc-400">{t.versionLabel}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{t.aboutSub}</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
