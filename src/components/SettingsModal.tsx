import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  X,
  HardDrive,
  FolderPlus,
  RefreshCw,
  Trash2,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileMusic,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const storageStats = usePlayerStore((state) => state.storageStats);
  const refreshStorageStats = usePlayerStore((state) => state.refreshStorageStats);
  const clearLocalLibrary = usePlayerStore((state) => state.clearLocalLibrary);
  const rescanLibrary = usePlayerStore((state) => state.rescanLibrary);

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
    } finally {
      setIsClearing(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    try {
      await rescanLibrary();
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0b0b12]/90 border border-white/[0.12] rounded-3xl p-6 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden flex flex-col gap-6"
          dir="rtl"
        >
          {/* Subtle Dynamic Ambient Backlight */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#FA243C]/20 filter blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-purple-600/15 filter blur-[90px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF5E7E] p-[1.5px] shadow-lg shadow-[#FA243C]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0b0b12] rounded-[14px] flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-[#FA243C]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  إدارة التخزين والمكتبة المحلية
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  نظام التخزين المستديم (OPFS & IndexedDB)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Storage Metric Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#FF456E]" />
                <span>المساحة المستهلكة محلياً</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                {storageStats?.engine === 'opfs' ? 'OPFS نشط ⚡' : 'IndexedDB نشط ⚡'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <h4 className="text-2xl font-black text-white tracking-tight font-sans">
                  {isLoadingStats ? (
                    <span className="text-sm text-zinc-400 font-normal">جاري الحساب...</span>
                  ) : (
                    <span>
                      {tracks.length} مساراً •{' '}
                      <span className="text-[#FF456E]">{storageStats?.formattedSize || '0 ميجابايت'}</span>
                    </span>
                  )}
                </h4>
                {storageStats?.usagePercentage !== undefined && storageStats.usagePercentage > 0 && (
                  <span className="text-xs text-zinc-400 font-mono">
                    {storageStats.usagePercentage}% من سعة المتصفح
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FA243C] to-[#FF5E7E] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(250,36,60,0.5)]"
                  style={{ width: `${Math.max(5, storageStats?.usagePercentage || 12)}%` }}
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>محفوظ دائم بدون طلب المجلد مجدداً</span>
              </span>
              <span className="truncate max-w-[150px] font-mono text-zinc-500">
                {savedFolderName || 'Liked_Songs'}
              </span>
            </div>
          </div>

          {/* Management Action Buttons */}
          <div className="space-y-2.5">
            {/* Add More Tracks */}
            <button
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#FA243C]/20 hover:bg-[#FA243C]/30 border border-[#FA243C]/40 hover:border-[#FA243C]/70 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#FA243C]/10"
            >
              <FolderPlus className="w-4 h-4 text-[#FF456E]" />
              <span>إضافة مسارات جديدة إلى المكتبة (Add More Tracks)</span>
            </button>

            {/* Rescan / Refresh */}
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-purple-400 ${isRescanning ? 'animate-spin' : ''}`} />
              <span>{isRescanning ? 'جاري فحص الملفات...' : 'إعادة فحص وتحديث المكتبة (Rescan / Refresh)'}</span>
            </button>

            {/* Clear Library Button / Confirmation */}
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full py-3 px-4 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>تفريغ الذاكرة المحلية (Clear Local Library)</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2.5 text-red-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p>
                    هل أنت متأكد من تفريغ كافة الملفات الصوتية والبيانات المخزنة محلياً في ذاكرة المتصفح؟
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isClearing ? 'جاري التفريغ...' : 'نعم، تفريغ المكتبة بالكامل'}
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="py-2 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
