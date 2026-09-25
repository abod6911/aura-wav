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
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
}

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
  label?: string;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({
  checked,
  onChange,
  activeColor = 'bg-[#FA243C]',
  label,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
        onChange(!checked);
      }}
      dir="ltr"
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none select-none active:scale-95 ${
        checked ? activeColor : 'bg-white/15'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`h-5 w-5 rounded-full bg-white shadow-md pointer-events-none ${
          checked ? 'ml-auto' : 'mr-auto'
        }`}
      />
    </button>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenImport }) => {
  const { t, language, setLanguage, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const storageStats = usePlayerStore((state) => state.storageStats);
  const refreshStorageStats = usePlayerStore((state) => state.refreshStorageStats);
  const clearLocalLibrary = usePlayerStore((state) => state.clearLocalLibrary);
  const rescanLibrary = usePlayerStore((state) => state.rescanLibrary);
  const addToast = usePlayerStore((state) => state.addToast);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);

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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        />

        {/* Modal Sheet: Responsive Mobile Bottom Sheet & Desktop Dialog */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg max-h-[88vh] sm:max-h-[90vh] bg-[#0d0d14]/98 border-t sm:border border-white/[0.12] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] sm:shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 flex flex-col gap-4 sm:gap-5 z-10"
          dir={dir}
        >
          {/* iOS Mobile Top Drag Grabber Pill */}
          <div
            onClick={onClose}
            className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/40 mx-auto -mt-1 mb-1 sm:hidden flex-shrink-0 cursor-pointer transition-colors"
          />

          {/* Ambient Lighting Accents */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#FA243C]/12 filter blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#1DB954]/12 filter blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-lg shadow-[#FA243C]/20 flex items-center justify-center flex-shrink-0">
                <div className="w-full h-full bg-[#0d0d14] rounded-[14px] flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-[#FA243C]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">
                  {t.settingsTitle}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  AURA.WAV Studio • {language === 'ar' ? 'الإعدادات والمظهر' : 'Preferences & DSP'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Language & Display Group */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#FA243C]" />
                <span>{t.languageAndDisplay}</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                {language === 'ar' ? 'العربية (RTL)' : 'English (US)'}
              </span>
            </div>

            {/* Segmented iOS Style Language Switcher */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold mb-2 block">
                {t.languageLabel}
              </label>
              <div className="p-1 rounded-xl bg-black/50 border border-white/[0.08] flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('ar')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
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
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
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
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
              <div className="min-w-0 pr-2">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{t.ambientGlowLabel}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{t.ambientGlowSub}</p>
              </div>
              <SettingsToggle
                checked={reactiveVisualsEnabled}
                onChange={setReactiveVisualsEnabled}
                activeColor="bg-[#FA243C]"
                label={t.ambientGlowLabel}
              />
            </div>
          </div>

          {/* 2. Pro Audio & DSP Suite */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1DB954]" />
                <span>{t.proAudioTitle}</span>
              </span>
              <span className="text-[10px] font-mono text-[#1ed760] bg-[#1DB954]/15 px-2 py-0.5 rounded-full border border-[#1DB954]/30 font-bold">
                DSP 32-bit Float
              </span>
            </div>

            {/* AutoMix Toggle */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="min-w-0 pr-2">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{t.autoMixTransition}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{t.autoMixSub}</p>
              </div>
              <SettingsToggle
                checked={automixEnabled}
                onChange={setAutoMix}
                activeColor="bg-[#1DB954]"
                label={t.autoMixTransition}
              />
            </div>

            {/* Vocal Isolation Toggle */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
              <div className="min-w-0 pr-2">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>{t.vocalIsolation}</span>
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {isRTL ? 'تخفيف أو إخفاء الفوكال الغنائي كاريوكي' : 'Attenuate vocals for instant karaoke'}
                </p>
              </div>
              <SettingsToggle
                checked={karaokeMode}
                onChange={setKaraokeMode}
                activeColor="bg-purple-600"
                label={t.vocalIsolation}
              />
            </div>

            {/* Equalizer Quick Access Button */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setEqualizerOpen(true);
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-bold text-zinc-200 flex items-center justify-between transition-all cursor-pointer active:scale-98"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1DB954]" />
                  <span>{isRTL ? 'فتح المعادل الصوتي و 3D Reverb' : 'Open 5-Band EQ & 3D Spaces'}</span>
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">5-Band EQ →</span>
              </button>
            </div>
          </div>

          {/* 3. Storage Metric & Library Group */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>{t.storageTitle}</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                {storageStats?.engine === 'opfs' ? 'OPFS High-Speed' : 'IndexedDB'}
              </span>
            </div>

            <div className="space-y-1.5">
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
                  className="h-full bg-gradient-to-r from-[#1DB954] to-[#34D399] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(29,185,84,0.5)]"
                  style={{ width: `${Math.max(5, storageStats?.usagePercentage || 12)}%` }}
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.offlineReady}</span>
              </span>
              <span className="truncate max-w-[160px] font-mono text-zinc-500">
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
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#FA243C]/25"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{t.importFolder}</span>
            </button>

            {/* Rescan / Refresh */}
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
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
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
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
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    {isClearing ? '...' : isRTL ? 'نعم، تفريغ المكتبة' : 'Yes, purge library'}
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* About Footer */}
          <div className="text-center pt-2 border-t border-white/[0.06] flex-shrink-0">
            <p className="text-[11px] font-bold text-zinc-400">{t.versionLabel} • Studio DSP</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{t.aboutSub}</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
