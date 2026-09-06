import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Moon, X, Clock, Check, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SleepTimerModal: React.FC = () => {
  const isSleepTimerOpen = usePlayerStore((state) => state.isSleepTimerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const sleepTimerSetting = usePlayerStore((state) => state.sleepTimerSetting);
  const setSleepTimer = usePlayerStore((state) => state.setSleepTimer);

  if (!isSleepTimerOpen) return null;

  const presets = [
    { label: '15 دقيقة', value: 15 },
    { label: '30 دقيقة', value: 30 },
    { label: '45 دقيقة', value: 45 },
    { label: '60 دقيقة (ساعة)', value: 60 },
  ];

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#101018]/95 border border-white/[0.12] rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FA243C]/15 border border-[#FA243C]/30 flex items-center justify-center text-[#FA243C]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">مؤقت النوم (Sleep Timer)</h3>
                <p className="text-xs text-zinc-400">إيقاف التشغيل التلقائي مع تلاشٍ صوتي ناعم</p>
              </div>
            </div>

            <button
              onClick={() => setSleepTimerOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Countdown Indicator */}
          {sleepTimerRemaining !== null && (
            <div className="p-4 rounded-2xl bg-[#FA243C]/10 border border-[#FA243C]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#FA243C] animate-pulse" />
                <div>
                  <span className="text-xs text-zinc-400 font-medium">الوقت المتبقي حتى الإيقاف:</span>
                  <p className="text-lg font-mono font-bold text-[#FF456E]">
                    {formatRemaining(sleepTimerRemaining)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSleepTimer(null)}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-colors"
              >
                إلغاء المؤقت
              </button>
            </div>
          )}

          {/* Preset Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              حدد مدة المؤقت:
            </span>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {presets.map((p) => {
                const isActive = sleepTimerSetting === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      setSleepTimer(p.value);
                      setSleepTimerOpen(false);
                    }}
                    className={`px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all border ${
                      isActive
                        ? 'bg-[#FA243C] border-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <span>{p.label}</span>
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>

            {/* End of Current Track Option */}
            <button
              onClick={() => {
                setSleepTimer('end_of_track');
                setSleepTimerOpen(false);
              }}
              className={`w-full px-4 py-3.5 mt-2 rounded-2xl text-xs font-bold flex items-center justify-between transition-all border ${
                sleepTimerSetting === 'end_of_track'
                  ? 'bg-[#FA243C] border-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-300'
              }`}
            >
              <span>عند نهاية الأغنية الحالية (End of Track)</span>
              {sleepTimerSetting === 'end_of_track' && <Check className="w-4 h-4" />}
            </button>
          </div>

          {/* Gentle Fade Out Explanation Note */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-2.5 text-[11px] text-zinc-400">
            <Volume2 className="w-4 h-4 text-[#FA243C] flex-shrink-0" />
            <span>يتم خفض الصوت تدريجياً خلال آخر 3 ثوانٍ لتوفير تجربة نوم هادئة دون مفاجأة.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
